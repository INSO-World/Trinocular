FROM node:18-alpine

WORKDIR /usr

COPY package*.json ./

RUN npm install

COPY ./src ./src
COPY ./test ./test

CMD [ "npm", "start" ]
