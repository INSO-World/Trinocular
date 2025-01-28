FROM public.ecr.aws/docker/library/node:23-alpine3.20

WORKDIR /app

COPY /src/ci-test/package*.json .

RUN npm install

COPY /src/ci-test/src src/
COPY /src/ci-test/test test/

CMD [ "npm", "start" ]
