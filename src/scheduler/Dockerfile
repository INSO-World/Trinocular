FROM node:23.3.0-alpine3.20

# Install common modules
WORKDIR /common
COPY /src/common/package*.json .
RUN npm install

# Install modules
WORKDIR /app
COPY /src/scheduler/package*.json .
RUN npm install

# Copy common code
WORKDIR /
COPY /src/common /common

# Copy source code
WORKDIR /app
COPY /src/scheduler .

EXPOSE 80

CMD ["node", "index.js"]
