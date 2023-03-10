import { Bagman } from "bagman";

const URL = process.env.URL || "http://localhost:8080";
const MAX_CLIENTS = 500;
const CLIENT_CREATION_INTERVAL_IN_MS = 10;
const EMIT_INTERVAL_IN_MS = 1000;

let clientCount = 0;
let lastReport = new Date().getTime();
let messagesSinceLastReport = 0;

const createClient = async () => {

    try {
        const client = new Bagman({ 
            url: URL,
            apiKey: "pk_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwZXJtaXNzaW9ucyI6WyJwdWJsaXNoOmNoYW5uZWwiLCJzdWJzY3JpYmU6Y2hhbm5lbCJdLCJpYXQiOjE2NzgyMjExMTh9.GKy45kKD055K9pwY8DJjfRvjmCYc7gH4PQVVO9cxzjo"
        });

        const channel = await client.subscribe("testing channel");

        const emitInterval = setInterval(async () => {
            await channel.publish("hello", "world");
        }, EMIT_INTERVAL_IN_MS);

        client.listen("connect_error", (reason) => {
            console.log('failed to connect to server ', reason);
        })
        client.listen("disconnect", (...args) => {
            clearInterval(emitInterval);
            client.close();
            console.log('client disconnected with reason: ', args);
            clientCount--;
        });

        channel.listen("hello", (_event, payload) => {
            messagesSinceLastReport++;
        });

        if (++clientCount < MAX_CLIENTS) {
            setTimeout(createClient, CLIENT_CREATION_INTERVAL_IN_MS);
        }
    } catch (error) {
        console.error('failing to create client due to ', error)
    }

};

const printReport = () => {
    const now = new Date().getTime();
    const durationSinceLastReport = (now - lastReport) / 1000;
    const messagesPerSeconds = (
        messagesSinceLastReport / durationSinceLastReport
    ).toFixed(2);

    console.log(
        `client count: ${clientCount} ; average messages received per second: ${messagesPerSeconds}`
    );

    messagesSinceLastReport = 0;
    lastReport = now;
};

setInterval(printReport, 5000);

createClient()