import { describe, afterAll, vi, expect, it, afterEach, beforeAll } from 'vitest';
import { TestServer } from "../test-server";
import { wait } from "../utils";

describe('handle client channel register', () => {
    let testServer: TestServer;

    beforeAll(() => new Promise(((done) => {
        testServer = new TestServer();
        testServer.mockValidTokenVerification();
        testServer.listen(async () => {
            done();
        });
    })));

    afterEach(() => {
        testServer.sockets.forEach((socket) => {
            socket.rooms.forEach((room) => {
                socket.leave(room);
            })
        })
        testServer.sockets = [];
    });

    afterAll(() => {
        testServer.close();
    });

    it('subscribes to the correct channel', async () => {
        testServer.server.registerHandlers();

        const channel = 'my-channel';

        const clients = await testServer.clients(1);

        await wait((done) => clients[0]!.emit('client:subscribe', { channel }, done));

        expect(testServer.sockets[0]!.rooms).toContain(channel);
    });

    it('unsubscribes from the correct channel', async () => {
        testServer.server.registerHandlers();

        const channel = 'my-channel';

        const clients = await testServer.clients(1);

        await wait((done) => clients[0]!.emit('client:subscribe', { channel }, done));
        await wait((done) => clients[0]!.emit('client:unsubscribe', { channel }, done));

        expect(testServer.sockets[0]!.rooms).not.toContain(channel);
    });

    it('emits events to the correct channel', async () => {
        testServer.server.registerHandlers();

        const channel = 'my-channel';
        const event = 'my-event';
        const data = { message: 'hello' };

        const clients = await testServer.clients(2);

        const didClientReceiveBroadcast = wait((done) => clients[1]!.on(`${channel}:${event}`, done))
        await wait((done) => clients[0]!.emit('client:subscribe', { channel }, done));
        await wait((done) => clients[1]!.emit('client:subscribe', { channel }, done));
        await wait((done) => clients[0]!.emit('client:emit', { channel, event, data }, done));

        
        await expect(didClientReceiveBroadcast).resolves.toBeTruthy();
    });

    it('throws an error when the client does not belong to the channel', async () => {
        testServer.server.registerHandlers();

        const channel = 'my-channel';
        const event = 'my-event';
        const data = { message: 'hello' };

        const clients = await testServer.clients(1);

        await expect(new Promise((done) => clients[0]!.emit('client:emit', { channel, event, data }, done))).resolves.toEqual({
            "status": "error",
            "message": "Client does not belongs in channel: my-channel.",
        });
    });
});