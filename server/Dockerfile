FROM node:dubnium-alpine as build

RUN mkdir -p /node && \
    apk update && apk upgrade && \
    apk add --no-cache git bash make python g++ openjdk8

ENV JAVA_HOME=/usr/lib/jvm/default-jvm

WORKDIR /node

COPY .babelrc .
COPY package.json .
COPY package-lock.json .
COPY patches ./patches/

RUN npm --unsafe-perm install

FROM node:dubnium-alpine

COPY --from=build /usr/lib/jvm /usr/lib/jvm
COPY --from=build /node /node

WORKDIR /node

ENV JAVA_HOME=/usr/lib/jvm/default-jvm
ENV NODE_ENV=production
ENV BABEL_CACHE_PATH=/tmp/.babel_cache
ENV NO_UPDATE_NOTIFIER=1
ENV DISABLE_JMX=1

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s CMD node /node/app/poke.js

COPY scripts scripts
COPY app app

EXPOSE 8080
EXPOSE 8443
USER node

RUN CI=true npm test

CMD [ "node", "node_modules/@babel/node/lib/_babel-node", "app/server.js" ]
