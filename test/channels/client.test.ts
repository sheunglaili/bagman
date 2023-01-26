import { createServer } from "http";
import type { Logger } from "pino";
import { Server } from "socket.io";
import Client, { Socket } from "socket.io-client";
import { describe, afterAll, vi, expect, it, afterEach, beforeAll } from 'vitest';
import { registerClientChannels } from '../../src/channels/client';
import type { MainServer, MainSocket } from "../../src/types";
import { wait } from "../utils";

describe('registerClientChannels', () => {
    let io: MainServer,
        serverSockets: MainSocket[] = [],
        clientSockets: Socket[] = [],
        logger: Logger;

    beforeAll(() => new Promise(((done) => {
        const httpServer = createServer();
        io = new Server(httpServer);
        logger = { info: vi.fn(), error: vi.fn() } as unknown as Logger;
        httpServer.listen(() => {
            // @ts-ignore - server are expected to create as http server
            const port = httpServer.address().port;
            clientSockets = [Client(`http://localhost:${port}`), Client(`http://localhost:${port}`)];
            io.on('connection', (socket) => {
                serverSockets.push(socket);
            })
            clientSockets[0]!.on("connect", done);
        });
    })));

    afterEach(() => {
        serverSockets.forEach((socket) => {
            socket.rooms.forEach((room) => {
                socket.leave(room);
            })
        })
    });

    afterAll(() => {
        io.close();
        clientSockets.forEach((socket) => socket.close());
    });

    it('subscribes to the correct channel', async () => {
        registerClientChannels(io, serverSockets[0]!, logger);

        const channel = 'my-channel';

        await wait((done) => clientSockets[0]!.emit('client:subscribe', { channel }, done));

        expect(serverSockets[0]!.rooms).toContain(channel);
    });

    it('unsubscribes from the correct channel', async () => {
        registerClientChannels(io, serverSockets[0]!, logger);

        const channel = 'my-channel';
        await wait((done) => clientSockets[0]!.emit('client:subscribe', { channel }, done));
        await wait((done) => clientSockets[0]!.emit('client:unsubscribe', { channel }, done));

        expect(serverSockets[0]!.rooms).not.toContain(channel);
    });

    it('emits events to the correct channel', async () => {
        registerClientChannels(io, serverSockets[0]!, logger);
        registerClientChannels(io, serverSockets[1]!, logger);

        const channel = 'my-channel';
        const event = 'my-event';
        const data = { message: 'hello' };
        const didClientReceiveBroadcast = wait((done) => clientSockets[1]!.on(event, done))
        await wait((done) => clientSockets[0]!.emit('client:subscribe', { channel }, done));
        await wait((done) => clientSockets[1]!.emit('client:subscribe', { channel }, done));
        await wait((done) => clientSockets[0]!.emit('client:emit', { channel, event, data }, done));

        
        await expect(didClientReceiveBroadcast).resolves.toBeTruthy();
    });

    it('throws an error when the client does not belong to the channel', async () => {
        registerClientChannels(io, serverSockets[0]!, logger);

        const channel = 'my-channel';
        const event = 'my-event';
        const data = { message: 'hello' };

        await expect(new Promise((done) => clientSockets[0]!.emit('client:emit', { channel, event, data }, done))).resolves.toEqual({
            "status": "error",
            "message": "Client does not belongs in channel: my-channel.",
        });
    });
});