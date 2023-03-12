import { request } from "undici";

export class AuthAPI {
    constructor(private url: string) {
     };

    async isValidToken(token: string): Promise<boolean> {
        
        const resp = await request(`${this.url}/token/verify`, {
            query: {
                apiKey: token
            }
        });
        return resp.statusCode === 200;
    }
}