import jwt, { JwtPayload } from "jsonwebtoken";

import type { ConnectionContext, SocketData } from "./types";


export function presence(ctx: ConnectionContext): SocketData {
    // assume validation passed
    // and apiKey must exists and valid in auth object
    const apiKey = ctx.socket.handshake.auth['apiKey'] as string;
    const { user = {}, permissions } = jwt.decode(apiKey.substring(3)) as JwtPayload;
    // populate socket data
    return {
        user,
        permissions
    }
}