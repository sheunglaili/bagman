import otel from "@opentelemetry/api";

import type { ClientToServerEvents, ConnectionContext, EmissionData, FetchPresenceAckCallback, FetchPresenceData, Presence, SocketData, SubscriptionData, UnsubscriptionData } from "../types";
import { OperationError } from '../error';

type Socket = {
    id: string;
    data: Partial<SocketData>
}

export function socketHandlers(ctx: ConnectionContext): ClientToServerEvents {

    const { io, socket, logger } = ctx;

    function presence(socket: Socket): Presence {
        return {
            id: socket.id,
            user: socket.data['user']
        }
    }

    function wrap(handler: (...args: any[]) => void | Promise<void>) {
        return async function (...args: any[]) {
            const callback = args.at(args.length - 1);
            const isFunction = callback instanceof Function;
            try {
                await handler(...args);
                if (isFunction) callback({ status: "ok" })
            } catch (error) {
                logger.error(error, "Failed handling message.");
                if (isFunction) {
                    callback({
                        status: "error",
                        ...(error instanceof OperationError && { message: error.message })
                    })
                }
            }
        }
    }

    async function onSubscribe({ channel }: SubscriptionData) {
        // logger.info(`subscribing to channel: ${channel}`)
        await socket.join(channel);

        socket.to(channel).emit(`channel:${channel}:presence:joined`, presence(socket));
    }

    async function onUnsubscribe({ channel }: UnsubscriptionData) {
        // logger.info(`unsubscribing from channel: ${channel}`)
        await socket.leave(channel);

        socket.to(channel).emit(`channel:${channel}:presence:left`, presence(socket));
    }

    async function onPresenceFetch({ channel }: FetchPresenceData, cb: FetchPresenceAckCallback) {
        if (!socket.rooms.has(channel)) {
            cb({
                status: "error",
                message: `Client does not belongs in channel: ${channel}.`
            })
        }

        const sockets = await io.in(channel).fetchSockets();
        cb({ presences: sockets.filter(peer => peer.id !== socket.id).map(presence) });
    }

    async function onEmit({ channel, event, data }: EmissionData) {
        if (!socket.rooms.has(channel)) {
            throw new OperationError(`Client does not belongs in channel: ${channel}.`);
        }

        // record metrics asynchorously
        (async function () {
            const meter = otel.metrics.getMeter('bagman');
            const messagesCounter = meter.createCounter('total.messages.count')

            // calls to cluster servers to record sockets count for corresponding channel.
            await io.serverSideEmitWithAck('bagman:record-sockets-count', { channel });
            const currentNodeCount = await socket.in(channel).local.fetchSockets().then(sockets => sockets.length);
            messagesCounter.add(currentNodeCount);
        })()
        // prefix event with channel to make sure global event are not leaked
        // into channel event
        socket.to(channel).emit(`channel:${channel}:${event}`, data);
    }

    return {
        'client:subscribe': wrap(onSubscribe),
        'client:unsubscribe': wrap(onUnsubscribe),
        'client:emit': wrap(onEmit),
        'presence:fetch': onPresenceFetch
    }
}