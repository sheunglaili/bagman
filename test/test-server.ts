import { MainSocket } from "../src/types";

import Client from "socket.io-client";
import type { Socket } from "socket.io-client";
import { BagmanServer, ServerConfig } from "../src/server";

export class TestServer {
    server: BagmanServer;
    sockets: MainSocket[];
    port: number;


    constructor({ port = 0, redis = {} }: ServerConfig = {}) {
        this.sockets = [];
        this.server = new BagmanServer({ port, redis });
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

    async clients(numberOfClient: number): Promise<Socket[]> {
        const clients: Socket[] = [];
        for (let i = 0; i < numberOfClient; i++) {
            await new Promise<void>((resolve) => {
                this.server.io.once('connect', (socket) => {
                    this.sockets.push(socket);
                    resolve()
                })
                // @ts-ignore - test server are gurantee to start as http server
                const client = Client(`http://localhost:${this.port}`);
                clients.push(client);
            })
        }
        return clients;
    }
}