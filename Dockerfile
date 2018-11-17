FROM node:carbon-alpine

RUN mkdir -p /app
WORKDIR /app

ENV NODE_ENV=production
ENV BABEL_CACHE_PATH=/tmp/.babel_cache
ENV NO_UPDATE_NOTIFIER=1

COPY .babelrc .
COPY package.json .
COPY package-lock.json .

RUN npm install

COPY poke.js .
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s CMD node /app/poke.js
COPY server.js .

# scrub busybox down to a bare minimum
RUN rm -f /usr/bin/env \
        && echo -e "#!/bin/sh\n\nexec /usr/local/bin/\$@" > /usr/bin/env \
        && chmod +x /usr/bin/env \
        && mv /bin/busybox /bin/sh

EXPOSE 8080
USER node

CMD [ "npm", "run", "docker" ]

