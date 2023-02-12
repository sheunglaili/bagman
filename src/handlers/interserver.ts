import type { MainServer, SocketCountData } from "../types";

export function registerInterserverHandler(io: MainServer) {

    async function onSocketCount({ channel }: SocketCountData, cb: (count: { count: number }) => void) {
        const localSockets = await io.in(channel).local.fetchSockets();
        // respond with current server count 
        cb({
            count: localSockets.length
        })
    }

    io.on('bagman:socket-counts', onSocketCount);
}