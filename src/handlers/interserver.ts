import otel from "@opentelemetry/api";
import type { SocketCountData, InterServerEvents, ServerContext, SocketCountAck, SocketCountAckCallback } from "../types";

export function interServerHandlers(ctx: ServerContext): InterServerEvents {
    return {
        'bagman:record-sockets-count': async function ({ channel }: SocketCountData, cb: SocketCountAckCallback) {
            const socketCount = await ctx.io.in(channel).local.fetchSockets().then((sockets) => sockets.length);
            const meter = otel.metrics.getMeter('bagman');
            const messagesCounter = meter.createCounter('total.messages.count');
            messagesCounter.add(socketCount);
            cb({ status: "ok"});
        }
    }
}