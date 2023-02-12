import { MainServer, MainSocket } from "../src/types";

import { createServer } from "http";
import { Server } from "socket.io";
import Client from "socket.io-client";
import type { Socket } from "socket.io-client";

export class TestServer { 
    io: MainServer;
    httpServer: ReturnType<typeof createServer>;
    sockets: MainSocket[];
   

    constructor() {
        this.sockets = [];
        this.httpServer = createServer();
        this.io = new Server(this.httpServer);
        
    }

    listen(cb?: () => void) {
        this.httpServer.listen(cb);    
    }

    close() {
        this.io.close();
    }

    async clients(numberOfClient: number): Promise<Socket[]> {
        const clients: Socket[] = [];
        for (let i = 0; i < numberOfClient; i++) {
            await new Promise<void>((resolve) => {
                this.io.once('connect', (socket) => {
                    this.sockets.push(socket);
                    resolve()
                })
                // @ts-ignore - test server are gurantee to start as http server
                const client = Client(`http://localhost:${this.httpServer.address()!.port}`);
                clients.push(client);
            })
        }
        return clients;
    }
}