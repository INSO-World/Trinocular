FROM node:22.9.0-alpine3.20

# Install common modules
WORKDIR /common
COPY /src/common/package*.json .
RUN npm install

WORKDIR /auth-utils
COPY /src/auth-utils/package*.json .
RUN npm install

WORKDIR /postgres-utils
COPY /src/postgres-utils/package*.json .
RUN npm install

# Install modules
WORKDIR /app
COPY /src/visualization-commits/package*.json .
RUN npm install

# Copy common code
WORKDIR /
COPY /src/common /common
COPY /src/auth-utils /auth-utils
COPY /src/postgres-utils /postgres-utils

# Copy source code
WORKDIR /app
COPY /src/visualization-commits .

EXPOSE 80

CMD ["node", "index.js"]
