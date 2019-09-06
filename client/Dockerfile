# Based on https://medium.com/@tiangolo/react-in-docker-with-nginx-built-with-multi-stage-docker-builds-including-testing-8cc49d6ec305

FROM tiangolo/node-frontend:10 as build-stage

WORKDIR /app

COPY .env .
COPY package.json .
COPY package-lock.json .

RUN npm install

COPY public public
COPY src src

RUN CI=true npm test
RUN npm run build

FROM nginx:1.15

COPY --from=build-stage /app/build/ /usr/share/nginx/html/HelloVoterHQ
COPY --from=build-stage /nginx.conf /etc/nginx/conf.d/default.conf
