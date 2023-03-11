import { createAdapter } from "@socket.io/redis-adapter";
import { Redis, RedisOptions } from "ioredis";
import pino from "pino";
import { Server } from "socket.io";
import otel from "@opentelemetry/api";
import { App, us_listen_socket, us_listen_socket_close, us_socket_local_port } from "uWebSockets.js";
import { ServerContext, InterServerEvents } from "./types"
import { socketHandlers } from "./handlers/client";
import { interServerHandlers } from "./handlers/interserver";
import { presence } from "./presence";
import { AuthAPI } from "./api";

export type ServerConfig = {
    port?: number
    redis?: RedisOptions
    doormanURL: string
}

export class BagmanServer {

    port: number;
    api: AuthAPI;
    redisOptions: RedisOptions
    ctx: ServerContext;
    app: ReturnType<typeof App>;
    listenedSocket?: us_listen_socket;

    constructor({ port = 8080, redis = {}, doormanURL }: ServerConfig) {
        this.port = port;
        this.redisOptions = redis;

        this.api = new AuthAPI(doormanURL);
        this.app = App();
        this.ctx = {
            logger: pino(),
            io: new Server()
        }
        // use uWebSocket.js as underlying websocket implmentation
        this.ctx.io.attachApp(this.app);
    }

    connectToRedis() {
        this.ctx.logger.info(`connecting to redis ${this.redisOptions.host}:${this.redisOptions.port}`)

        // connect to redis
        const pub = new Redis(this.redisOptions);
        pub.on('connect', () => this.ctx.logger.info(`Pub client Connected to Redis ${this.redisOptions.host}:${this.redisOptions.port}`));
        pub.on('error', (err) => this.ctx.logger.error(err, `Pub client failed to connect to Redis ${this.redisOptions.host}:${this.redisOptions.port}`));

        const sub = pub.duplicate();
        sub.on('connect', () => this.ctx.logger.info(`Sub client Connected to Redis ${this.redisOptions.host}:${this.redisOptions.port}`));
        sub.on('error', (err) => this.ctx.logger.error(err, `Sub client failed to connect to Redis ${this.redisOptions.host}:${this.redisOptions.port}`));

        // use redis adapter for cross cluster communication
        this.ctx.io.adapter(createAdapter(pub, sub))
    }

    registerMetrics() {
        this.ctx.io.on('connection', (socket) => {
            const meter = otel.metrics.getMeter('bagman');
            const counter = meter.createUpDownCounter('active.connections.count');
            counter.add(1);
            socket.on('disconnect', () => counter.add(-1));
        })
    };

    registerHandlers() {
        // register interserver handlers
        const serverHandlers = interServerHandlers(this.ctx);
        for (const [serverEvent, serverHandler] of Object.entries(serverHandlers)) {
            this.ctx.io.on(serverEvent as keyof InterServerEvents, serverHandler);
        }
        
        // authenticate connection request with doorman
        this.ctx.io.use(async (socket, next) => {
            const isValid = await this.api.isValidToken(socket.handshake.auth.apiKey)
            next(isValid ? undefined : new Error("Invalid API Key / Token."))
        })
        // register socket event handlers
        this.ctx.io.on('connection', (socket) => {
            const connectionCtx = { ...this.ctx, socket };
            connectionCtx.socket.data = presence(connectionCtx); // populate presence data

            console.log(socket.data);

            const handlers = socketHandlers({ ...this.ctx, socket });
            for (const [ev, handler] of Object.entries(handlers)) {
                socket.on(ev, handler);
            }
        })
    };

    listen(cb?: (listenedPort: number) => void) {
        this.app.listen(this.port, (listened: us_listen_socket) => {
            if (listened) {
                this.listenedSocket = listened;
                this.ctx.logger.info(`Listening on PORT ${this.port}`)
                if (cb) cb(us_socket_local_port(listened));
            } else {
                this.ctx.logger.error(`Failed to listen on PORT ${this.port}`)
                throw new Error(`Failed to listen on PORT ${this.port}`);
            }
        })
    }

    close() {
        if (this.listenedSocket) us_listen_socket_close(this.listenedSocket);
        this.ctx.io.close();
    }
}