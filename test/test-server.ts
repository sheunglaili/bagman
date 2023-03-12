import { MainSocket } from "../src/types";

import { MockAgent, MockPool, setGlobalDispatcher } from "undici";

import Client, { ManagerOptions, SocketOptions } from "socket.io-client";
import type { Socket } from "socket.io-client";
import { BagmanServer } from "../src/server";

export class TestServer {
    server: BagmanServer;
    sockets: MainSocket[];
    doormanMockPool: MockPool;
    port: number;


    constructor({ port = 0, redis = {} } = {}) {
        this.sockets = [];
        const agent = new MockAgent();
        setGlobalDispatcher(agent);

        this.doormanMockPool = agent.get("http://doorman:8080")

        this.server = new BagmanServer({ port, redis, doormanURL: "http://doorman:8080" });
    }

    mockValidTokenVerification() {
        this.doormanMockPool.intercept({
            path: /^\/token\/verify/
        }).reply(200)
          .persist();
    }

    listen(cb?: () => void) {
        this.server.listen((port: number) => {
            this.port = port;
            if (cb) cb();
        });
    }

    close() {
        this.server.close();
    }

    async clients(numberOfClient: number, opts?: Partial<ManagerOptions & SocketOptions>): Promise<Socket[]> {
        const clients: Socket[] = [];
        for (let i = 0; i < numberOfClient; i++) {
            await new Promise<void>((resolve) => {
                this.server.ctx.io.once('connect', (socket) => {
                    this.sockets.push(socket);
                    resolve()
                })
                // @ts-ignore - test server are gurantee to start as http server
                const client = Client(`http://localhost:${this.port}`, opts || {
                    auth: {
                        'apiKey': 'pk_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwZXJtaXNzaW9ucyI6WyJhZG1pbjpjaGFubmVsIiwicHVibGlzaDpjaGFubmVsIiwic3Vic2NyaWJlOmNoYW5uZWwiXSwiaWF0IjoxNjc3OTMxMDE1fQ.T7OsPJWUe3b_yG7B_7gnI0AviJ6mZIFCt92epYMNCGQ',
                    },
                });
                clients.push(client);
            })
        }
        return clients;
    }
}