import type { Logger } from "pino";
import { Socket } from "socket.io-client";
import { describe, afterAll, vi, expect, it, afterEach, beforeAll } from 'vitest';
import { registerChannelHandlers } from '../../src/handlers/client';
import { TestServer } from "../test-server";
import { wait } from "../utils";

describe('registerClientChannels', () => {
    let testServer: TestServer,
        clients: Socket[],
        logger: Logger;

    beforeAll(() => new Promise(((done) => {
        logger = { info: vi.fn(), error: vi.fn() } as unknown as Logger;

        testServer = new TestServer();
        testServer.listen(async () => {
            clients = await testServer.clients(2);
            done();
        });
    })));

    afterEach(() => {
        testServer.sockets.forEach((socket) => {
            socket.rooms.forEach((room) => {
                socket.leave(room);
            })
        })
    });

    afterAll(() => {
        testServer.close();
        clients.forEach((socket) => socket.close());
    });

    it('subscribes to the correct channel', async () => {
        registerChannelHandlers(testServer.io, testServer.sockets[0], logger);

        const channel = 'my-channel';

        await wait((done) => clients[0]!.emit('client:subscribe', { channel }, done));

        expect(testServer.sockets[0]!.rooms).toContain(channel);
    });

    it('unsubscribes from the correct channel', async () => {
        registerChannelHandlers(testServer.io, testServer.sockets[0]!, logger);

        const channel = 'my-channel';
        await wait((done) => clients[0]!.emit('client:subscribe', { channel }, done));
        await wait((done) => clients[0]!.emit('client:unsubscribe', { channel }, done));

        expect(testServer.sockets[0]!.rooms).not.toContain(channel);
    });

    it('emits events to the correct channel', async () => {
        registerChannelHandlers(testServer.io, testServer.sockets[0]!, logger);
        registerChannelHandlers(testServer.io, testServer.sockets[1]!, logger);

        const channel = 'my-channel';
        const event = 'my-event';
        const data = { message: 'hello' };
        const didClientReceiveBroadcast = wait((done) => clients[1]!.on(`${channel}:${event}`, done))
        await wait((done) => clients[0]!.emit('client:subscribe', { channel }, done));
        await wait((done) => clients[1]!.emit('client:subscribe', { channel }, done));
        await wait((done) => clients[0]!.emit('client:emit', { channel, event, data }, done));

        
        await expect(didClientReceiveBroadcast).resolves.toBeTruthy();
    });

    it('throws an error when the client does not belong to the channel', async () => {
        registerChannelHandlers(testServer.io, testServer.sockets[0]!, logger);

        const channel = 'my-channel';
        const event = 'my-event';
        const data = { message: 'hello' };

        await expect(new Promise((done) => clients[0]!.emit('client:emit', { channel, event, data }, done))).resolves.toEqual({
            "status": "error",
            "message": "Client does not belongs in channel: my-channel.",
        });
    });
});