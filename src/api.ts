import axios from "axios";

export class AuthAPI {
    constructor(private url: string) {
     };

    async isValidToken(token: string): Promise<boolean> {
        
        const resp = await axios.get(`${this.url}/token/verify`, {
            params: {
                apiKey: token
            }
        });
        return resp.status === 200;
    }
}