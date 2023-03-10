import { Logger } from "pino";
import type { Server, Socket } from "socket.io";

type JoinChannelEvent = `channel:${string}:presence:joined`;
type LeaveChannelEvent = `channel:${string}:presence:left`;

export type ServerToClientEvents = {
    [event: JoinChannelEvent | LeaveChannelEvent]: (presence: Presence) => void
    [event: string]: (...args: any[]) => void
}

export type ClientToServerEvents = {
    'client:subscribe': (subscriptionData: SubscriptionData, cb: SubscriptionAckCallback) => Promise<void> | void;
    'client:unsubscribe': (subscriptionData: UnsubscriptionData, cb: UnsubscriptionAckCallback) => Promise<void> | void;
    'client:emit': (emissionData: EmissionData, cb: EmissionAckCallback) => Promise<void> | void;
    'presence:fetch': (presenceFetchData: FetchPresenceData, cb: FetchPresenceAckCallback) => Promise<void> | void;
}

export type InterServerEvents = {
    'bagman:record-sockets-count': (data: SocketCountData, ack: SocketCountAckCallback) => Promise<void> | void;
}

export type BaseAck = {
    status: "ok" | "error",
    message?: string
}
export type BaseAckCallback<Ack = any> = (e: Ack) => void

export type SubscriptionData = {
    channel: string
}
export type SubscriptionAck = BaseAck
export type SubscriptionAckCallback = BaseAckCallback<SubscriptionAck>;

export type UnsubscriptionData = SubscriptionData;
export type UnsubscriptionAck = BaseAck;
export type UnsubscriptionAckCallback = BaseAckCallback<SubscriptionAck>;

export type EmissionData<Data = any> = {
    channel: string
    event: string
    data: Data
};
export type EmissionAck = BaseAck;
export type EmissionAckCallback = BaseAckCallback<EmissionAck>;

export type Presence = {
    id: string;
    user: SocketData['user']
}

export type FetchPresenceData = { 
    channel: string
}
export type FetchPresenceAck = {
    presences: Presence[]
} | BaseAck

export type FetchPresenceAckCallback = BaseAckCallback<FetchPresenceAck>;

export type SocketCountData = {
    channel: string
}
export type SocketCountAck = BaseAck
export type SocketCountAckCallback = BaseAckCallback<SocketCountAck>;

export type SocketData = {
    user: any
    permissions: string[]
}
export type MainServer = Server<ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData>;
export type MainSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export type ServerContext = {
    io: MainServer, 
    logger: Logger
}
export type ConnectionContext = ServerContext & {
    socket: MainSocket
}