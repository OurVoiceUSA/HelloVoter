FROM node:carbon

RUN mkdir -p /app
WORKDIR /app

COPY .babelrc .
COPY package.json .
COPY package-lock.json .
RUN npm install
RUN mkdir /app/node_modules/.cache && chown node:node /app/node_modules/.cache

COPY poke.js .
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s CMD node /app/poke.js
COPY server.js .

EXPOSE 8080
USER node

CMD [ "npm", "run", "docker" ]

