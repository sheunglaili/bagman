import type { Logger } from "pino";
import otel from "@opentelemetry/api";

import type { EmissionData, MainServer, MainSocket, SubscriptionData, UnsubscriptionData } from "../types";
import { OperationError } from '../error';

export function registerChannelHandlers(io: MainServer, socket: MainSocket, logger: Logger) {

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
    }

    async function onUnsubscribe({ channel }: UnsubscriptionData) {
        // logger.info(`unsubscribing from channel: ${channel}`)
        await socket.leave(channel);
    }

    async function onEmit({ channel, event, data }: EmissionData) {
        if (!socket.rooms.has(channel)) {
            throw new OperationError(`Client does not belongs in channel: ${channel}.`);
        }

        // record metrics asynchorously
        (async function() {
            const meter = otel.metrics.getMeter('bagman');
            const messagesCounter = meter.createCounter('total.messages.count')

            // calls to cluster servers to get sockets count for corresponding channel.
            const totalClientsEmitted = await new Promise<number>((resolve) => {
                io.serverSideEmit('bagman:socket-counts', { channel }, async (err, responses) => {
                    if (err) {
                        logger.error(`some server didn't respond with socket-counts: ${err}`)
                    }
                    const countsFromOtherNode = responses.reduce((prev, curr) => prev + curr.count, 0);
                    const currentNodeCount = await socket.in(channel).local.fetchSockets().then(sockets => sockets.length);
                    resolve(currentNodeCount + countsFromOtherNode);
                });
            })
            messagesCounter.add(totalClientsEmitted);
        })()
        // prefix event with channel to make sure global event are not leaked
        // into channel event
        socket.to(channel).emit(`${channel}:${event}`, data);
    }

    socket.on('client:subscribe', wrap(onSubscribe));
    socket.on('client:unsubscribe', wrap(onUnsubscribe));
    socket.on('client:emit', wrap(onEmit));

    socket.on('error', (reason) => console.log(reason))
    socket.on('disconnecting', (reason) => console.log(reason));
    socket.on('disconnect', (reason) => console.log(reason));
}