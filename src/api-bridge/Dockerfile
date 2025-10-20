FROM node:current-alpine

# Install common modules
WORKDIR /common
COPY /src/common/package*.json .
RUN npm install

WORKDIR /postgres-utils
COPY /src/postgres-utils/package*.json .
RUN npm install

# Install modules
WORKDIR /app
COPY /src/api-bridge/package*.json .
RUN npm install

# Copy common code
WORKDIR /
COPY /src/common /common
COPY /src/postgres-utils /postgres-utils

# Copy source code
WORKDIR /app
COPY /src/api-bridge .

EXPOSE 80

CMD ["node", "index.js"]
