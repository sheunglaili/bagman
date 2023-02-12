
import dotenv from "dotenv";
import pino from "pino";
import { App } from "uWebSockets.js";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import otel from "@opentelemetry/api";

import { registerChannelHandlers } from "./handlers/client";
import type { ClientToServerEvents, InterServerEvents, MainServer, MainSocket, ServerToClientEvents } from "./types";
import { registerInterserverHandler } from "./handlers/interserver";

// load config
dotenv.config();
const logger = pino();

function registerMetrics(socket: MainSocket) {
    const meter = otel.metrics.getMeter('bagman');
    const connectionCounter = meter.createUpDownCounter('active.connetions.count');
    connectionCounter.add(1);

    // register disconnect event
    socket.on('disconnect', () => connectionCounter.add(-1));
}

function initialiseRedis(): { pub: Redis, sub: Redis } {
    logger.info(`connecting to redis ${process.env['REDIS_HOST']}:${process.env['REDIS_PORT']}`)

    const redisConfig = {
        host: process.env['REDIS_HOST'] || "localhost",
        port: parseInt(process.env['REDIS_PORT'] || "6379"),
        // only set username & password is both of them are present
        ...((process.env['REDIS_USERNAME'] && process.env['REDIS_PASSWORD']) && {
            username: process.env['REDIS_USERNAME'],
            password: process.env['REDIS_PASSWORD']
        })
    }

    // connect to redis
    const pub = new Redis(redisConfig);
    pub.on('connect', () => logger.info(`Pub client Connected to Redis ${redisConfig.host}:${redisConfig.port}`));
    pub.on('error', (err) => logger.error(err, `Pub client failed to connect to Redis ${redisConfig.host}:${redisConfig.port}`));

    const sub = pub.duplicate();
    sub.on('connect', () => logger.info(`Sub client Connected to Redis ${redisConfig.host}:${redisConfig.port}`));
    sub.on('error', (err) => logger.error(err, `Sub client failed to connect to Redis ${redisConfig.host}:${redisConfig.port}`));

    return { pub, sub };
}

function initialiseIO(ioServer: MainServer) {
    const { pub, sub } = initialiseRedis();
    const app = App();

    // use uWebSockets.js as underlying websocket implementation
    ioServer.attachApp(app);
    // use redis adapter for cross cluster communication
    // @ts-expect-error - resolve types error temporarily
    ioServer.adapter(createAdapter(pub, sub));
    // logging incoming connections, might replace with open-telemetry
    // ioServer.use((socket, next) => {
    //     logger.info({ ipAddress: socket.handshake.address }, "New incoming connections. ");
    //     next();
    // });
    registerInterserverHandler(ioServer);
    ioServer.on('connection', (socket) => {
        registerChannelHandlers(io, socket, logger);
        registerMetrics(socket);
    });

    const port = parseInt(process.env['PORT'] || "8080");

    app.listen(port, (listened) => {
        if (listened) {
            logger.info(`Listening on PORT ${port}`)
        } else {
            logger.error(`Failed to listen on PORT ${port}`)
        }
    });
}

const io = new Server<
    ServerToClientEvents,
    ClientToServerEvents,
    InterServerEvents,
    any
>();

initialiseIO(io);

