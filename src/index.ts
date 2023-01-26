import { createServer } from "http";

import dotenv from "dotenv";
import pino from "pino";
import { Server } from "socket.io";
import { instrument } from "@socket.io/admin-ui";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";

import { registerClientChannels } from "./channels/client";
import type { ClientToServerEvents, InterServerEvents, MainServer, ServerToClientEvents } from "./types";

// load config
dotenv.config();
const logger = pino();

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

    // use redis adapter for cross cluster communication
    ioServer.adapter(createAdapter(pub, sub));
    // logging incoming connections, might replace with open-telemetry
    ioServer.use((socket, next) => {
        logger.info({ ipAddress: socket.handshake.address }, "New incoming connections. ");
        next();
    });

    ioServer.on('connection', (socket) => {
        registerClientChannels(io, socket, logger);
    });

    // might replace in favour of open-telemetry
    instrument(io, {
        auth: false,
        mode: "development"
    });
}

const httpServer = createServer();

const io = new Server<
    ServerToClientEvents,
    ClientToServerEvents,
    InterServerEvents,
    any
>(httpServer);

initialiseIO(io);

const port = parseInt(process.env['PORT'] || "8080");

httpServer.listen(port)
    .on('listening', () => logger.info(`Listening on PORT ${port}`));