FROM node:16 as builder

WORKDIR /usr/bagman

COPY src ./src
COPY package.json .
COPY package-lock.json .
COPY tsconfig.json .

RUN npm install
RUN npm run build

FROM node:16 

WORKDIR /usr/bagman
COPY package.json ./
COPY package-lock.json ./
RUN npm install --omit=dev
COPY --from=builder /usr/bagman/dist .

EXPOSE 8080 

CMD ["npm", "run", "start"]