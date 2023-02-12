import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { GenericContainer, StartedTestContainer } from "testcontainers";
import { Redis } from "ioredis";
import { createAdapter } from "@socket.io/redis-adapter";

import { registerInterserverHandler } from "../../src/handlers/interserver";
import { registerChannelHandlers } from "../../src/handlers/client";
import type { Logger } from "pino";
import { TestServer } from "../test-server";
import { wait } from "../utils";
import type { Socket } from "socket.io-client";

describe("interserver event handling", () => {

    let container: StartedTestContainer;
    let ioRedis: Redis;
    let testServers: TestServer[] = [];
    let logger: Logger;


    beforeAll(async () => {
        logger = { info: vi.fn(), error: vi.fn() } as unknown as Logger;

        const PORT = 6379;

        container = await new GenericContainer("redis")
            .withExposedPorts(PORT)
            .start();

        ioRedis = new Redis({
            host: container.getHost(),
            port: container.getMappedPort(PORT)
        });

        for (let i = 0; i < 2; i++) {
            const testServer = new TestServer();
            // @ts-expect-error - temp disable types error from socket.io upgrade
            testServer.io.adapter(createAdapter(ioRedis, ioRedis.duplicate()));
            testServer.listen();
            testServers.push(testServer);
        }
    }, 10000);

    afterAll(async () => {
        await ioRedis.quit();
        await container.stop();
    });

    it("return correct sockets count for a channel", async () => {
        registerInterserverHandler(testServers[0].io);

        const clients: Socket[] = await testServers[0].clients(2);

        for (const socket of testServers[0].sockets) {
            registerChannelHandlers(testServers[0].io, socket, logger);
        }

        // subscribe to server 0
        await wait((done) => clients[0].emit("client:subscribe", { channel: "test-channel" }, done));
        await wait((done) => clients[1].emit("client:subscribe", { channel: "test-channel" }, done));

        registerInterserverHandler(testServers[1].io);
        const clientsForServerOne: Socket[] = await testServers[1].clients(1);
        registerChannelHandlers(testServers[1].io, testServers[1].sockets[0], logger);

        // subscribe to server 1
        await wait((done) => clientsForServerOne[0].emit("client:subscribe", { channel: "test-channel" }, done));

        // should only get 2 sockets count from server 0
        await expect(testServers[1].io.serverSideEmitWithAck("bagman:socket-counts", { channel: "test-channel" })).resolves.toEqual([
            { count: 2 }
        ]);
    });

})