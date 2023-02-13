
import dotenv from "dotenv";
import { BagmanServer } from "./server";

// load config
dotenv.config();

const server = new BagmanServer({
    port: parseInt(process.env['PORT'] || "8080"),
    redis: {
        host: process.env['REDIS_HOST'] || "localhost",
        port: parseInt(process.env['REDIS_PORT'] || "6379"),
        // only set username & password is both of them are present
        ...((process.env['REDIS_USERNAME'] && process.env['REDIS_PASSWORD']) && {
            username: process.env['REDIS_USERNAME'],
            password: process.env['REDIS_PASSWORD']
        })
    }
});

server.registerMetrics();
server.registerHandlers();
server.connectToRedis();

server.listen();

