FROM node:dubnium

RUN mkdir -p /app
WORKDIR /app

ENV NODE_ENV=production
ENV BABEL_CACHE_PATH=/tmp/.babel_cache
ENV NO_UPDATE_NOTIFIER=1

RUN apt-get update && apt-get install -y openjdk-8-jdk

COPY .babelrc .
COPY package.json .
COPY package-lock.json .

RUN npm install

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s CMD node /app/poke.js
COPY lib lib
COPY *.js ./

EXPOSE 8080
EXPOSE 8443
USER node

CMD [ "node", "node_modules/@babel/node/lib/_babel-node", "server.js" ]

