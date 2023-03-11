import type { SocketCountData, InterServerEvents, ServerContext } from "../types";

export function interServerHandlers(ctx: ServerContext): InterServerEvents {
    return {
        'bagman:socket-counts': async function ({ channel }: SocketCountData, cb: (count: { count: number }) => void) {
            const localSockets = await ctx.io.in(channel).local.fetchSockets();
            // respond with current server count 
            cb({ count: localSockets.length })
        }
    }
}