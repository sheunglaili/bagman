<img width="150" src="assets/bagman.png" alt="Bagman's Logo" align="right"/>

# Bagman 
![main branch workflow](https://github.com/sheunglaili/bagman/actions/workflows/main.yml/badge.svg)

Bagman is a powerful and flexible real-time infrastructure that helps you provision real-time communication with your client applications with ease. Built on top of [Socket.io](https://socket.io) and [Redis](https://redis.io), Bagman offers a hassle-free solution for real-time communication, allowing you to focus on your core business logic instead of worrying about scaling issues and maintaining your own instances of socket.io server.

## Table of Contents
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Getting started

[Checkout the documentation!](https://sheunglaili.github.io/bagman/doc/usage/getting-started)! 

## Usage

The simplest way is to start with the [TS client](https://github.com/sheunglaili/bagman-js)!

```typescript
import { Bagman } from "bagman";

// initialise client
const bagman = new Bagman({ url: "<bagman-server-url>"});

// subscribe to a channel
const channel = await bagman.subscribe("<channel>");
// listen to a event in a channel
// await to make sure listen is sucessful
await channel.listen("explosion", (data) => {
    // do something with the data
});

// emit some data to the channel
// await to make sure emit is successful
await channel.emit("greetings", {
    "hello": "world"
});
```

## Contributing
```
Working in Progress
```

## License

MIT



