import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { GenericContainer, StartedTestContainer } from "testcontainers";
import { TestServer } from "../test-server";
import { wait } from "../utils";
import type { Socket } from "socket.io-client";

describe("interserver event handling", () => {

    let container: StartedTestContainer;
    let testServers: TestServer[] = [];


    beforeAll(async () => {
        const PORT = 6379;

        container = await new GenericContainer("redis")
            .withExposedPorts(PORT)
            .start();

        for (let i = 0; i < 2; i++) {
            const testServer = new TestServer({
                redis: {
                    host: container.getHost(),
                    port: container.getMappedPort(PORT)
                }
            });
            testServer.mockValidTokenVerification();
            testServer.server.connectToRedis();
            testServer.listen();
            testServers.push(testServer);
        }
    }, 10000);

    afterAll(async () => {
        testServers.forEach((testServer) => {
            testServer.close();
        });
        await container.stop();
    });

    it("return correct sockets count for a channel", async () => {
        testServers[0].server.registerHandlers();

        const clients: Socket[] = await testServers[0].clients(2);

        // subscribe to server 0
        await wait((done) => clients[0].emit("client:subscribe", { channel: "test-channel" }, done));
        await wait((done) => clients[1].emit("client:subscribe", { channel: "test-channel" }, done));

        testServers[1].server.registerHandlers();
        const clientsForServerOne: Socket[] = await testServers[1].clients(1);

        // subscribe to server 1
        await wait((done) => clientsForServerOne[0].emit("client:subscribe", { channel: "test-channel" }, done));

        // should only get 2 sockets count from server 0
        await expect(testServers[1].server.ctx.io.serverSideEmitWithAck("bagman:socket-counts", { channel: "test-channel" })).resolves.toEqual([
            { count: 2 }
        ]);
    });

})