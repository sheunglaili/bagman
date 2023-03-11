import { describe, afterAll, expect, it, afterEach, beforeAll } from 'vitest';
import { TestServer } from "../test-server";

describe('handle presence', () => {
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

    it('should populate presence data', async () => {
        testServer.server.registerHandlers();

        await testServer.clients(1, { auth: { 
            'apiKey': 'pk_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwZXJtaXNzaW9ucyI6WyJwdWJsaXNoOmNoYW5uZWwiLCJzdWJzY3JpYmU6Y2hhbm5lbCJdLCJ1c2VyIjp7InVzZXJuYW1lIjoidGVzdGluZyJ9LCJpYXQiOjE2Nzg1NjQxMjAsImV4cCI6MTY3ODU2NzcyMH0.MTLKK7ZcBjVgdg6vbqB6T2a9tHVvAUyThsnCFrfcvvk'
        }});

        expect(testServer.sockets[0]!.data).toEqual({
            user: {
                username: "testing"
            },
            permissions: [
                "publish:channel",
                "subscribe:channel",
            ]
        });
    });

});