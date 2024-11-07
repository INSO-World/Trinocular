FROM node:18-alpine

WORKDIR /usr

COPY /src/ci-test/package*.json .

RUN npm install

COPY /src/ci-test/src src/
COPY /src/ci-test/test test/

CMD [ "npm", "start" ]
