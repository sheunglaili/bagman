import { createAdapter } from "@socket.io/redis-adapter";
import { Redis, RedisOptions } from "ioredis";
import pino, { Logger } from "pino";
import { Server } from "socket.io";
import otel from "@opentelemetry/api";
import { App, us_listen_socket, us_listen_socket_close, us_socket_local_port } from "uWebSockets.js";
import { ClientToServerEvents, InterServerEvents, MainServer, ServerToClientEvents } from "./types"
import { registerChannelHandlers } from "./handlers/client";
import { registerInterserverHandler } from "./handlers/interserver";

export type ServerConfig = {
    port?: number
    redis?: RedisOptions
}

export class BagmanServer {

    port: number;
    redisOptions: RedisOptions
    io: MainServer;
    app: ReturnType<typeof App>;
    listenedSocket?: us_listen_socket;
    logger: Logger

    constructor({ port = 8080, redis = {} }: ServerConfig = {}) {
        this.port = port;
        this.logger = pino();
        this.redisOptions = redis;

        this.app = App();
        this.io = new Server<
            ServerToClientEvents,
            ClientToServerEvents,
            InterServerEvents,
            any
        >();
        // use uWebSocket.js as underlying websocket implmentation
        this.io.attachApp(this.app);
    }

    connectToRedis() {
        this.logger.info(`connecting to redis ${this.redisOptions.host}:${this.redisOptions.port}`)

        // connect to redis
        const pub = new Redis(this.redisOptions);
        pub.on('connect', () => this.logger.info(`Pub client Connected to Redis ${this.redisOptions.host}:${this.redisOptions.port}`));
        pub.on('error', (err) => this.logger.error(err, `Pub client failed to connect to Redis ${this.redisOptions.host}:${this.redisOptions.port}`));

        const sub = pub.duplicate();
        sub.on('connect', () => this.logger.info(`Sub client Connected to Redis ${this.redisOptions.host}:${this.redisOptions.port}`));
        sub.on('error', (err) => this.logger.error(err, `Sub client failed to connect to Redis ${this.redisOptions.host}:${this.redisOptions.port}`));

        // use redis adapter for cross cluster communication
        // @ts-expect-error - resolve types error temporarily
        this.io.adapter(createAdapter(pub, sub))
    }

    registerMetrics() {
        const meter = otel.metrics.getMeter('bagman');
        const counter = meter.createUpDownCounter('active.connections.count');
        this.io.on('connection', (socket) => {
            counter.add(1);
            socket.on('disconnect', () => counter.add(-1));
        })
    };

    registerHandlers() {
        registerInterserverHandler(this.io);
        this.io.on('connection', (socket) => {
            registerChannelHandlers(this.io, socket, this.logger)
        })
    };

    listen(cb?: (listenedPort: number) => void) {
        this.app.listen(this.port, (listened: us_listen_socket) => {
            if (listened) {
                this.listenedSocket = listened;
                this.logger.info(`Listening on PORT ${this.port}`)
                if (cb) cb(us_socket_local_port(listened));
            } else {
                this.logger.error(`Failed to listen on PORT ${this.port}`)
                throw new Error(`Failed to listen on PORT ${this.port}`);
            }

        })
    }

    close() {
        if (this.listenedSocket) us_listen_socket_close(this.listenedSocket);
        this.io.close();
    }
}