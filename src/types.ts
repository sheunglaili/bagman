import type { Server, Socket } from "socket.io";

export type ServerToClientEvents = {
    [event: string]: (event: string, ...args: any[]) => void
}

export type ClientToServerEvents = {
    'client:subscribe': (subscriptionData: SubscriptionData, cb: SubscriptionAckCallback) => Promise<void> | void;
    'client:unsubscribe': (subscriptionData: UnsubscriptionData, cb: UnsubscriptionAckCallback) => Promise<void> | void;
    'client:emit': (emissionData: EmissionData, cb: EmissionAckCallback) => Promise<void> | void;
}

export type InterServerEvents = {
    'bagman:socket-counts': (data: SocketCountData, cb: SocketCountAckCallback) => Promise<void> | void;
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

export type SocketCountData = {
    channel: string
}
export type SocketCountAck = {
    count: number
}
export type SocketCountAckCallback = BaseAckCallback<SocketCountAck>;

export type MainServer = Server<ServerToClientEvents, ClientToServerEvents, InterServerEvents, any>;
export type MainSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, any>;