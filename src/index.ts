
import dotenv from "dotenv";
import { BagmanServer } from "./server";

// load config
dotenv.config();

const doormanURL = process.env['DOORMAN_URL'];
if (!doormanURL) {
    console.log(`Missing Doorman URL, defaults to http://localhost:8081`)
}

const server = new BagmanServer({
    port: parseInt(process.env['PORT'] || "8080"),
    doormanURL: doormanURL || "http://localhost:8081",
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

