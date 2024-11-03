FROM node:23.1-bookworm

# Install nodegit-helper
WORKDIR /nodegit-helper
COPY /src/nodegit-helper/package*.json .
RUN npm install

# Install common modules
WORKDIR /common
COPY /src/common/package*.json .
RUN npm install

WORKDIR /postgres-utils
COPY /src/postgres-utils/package*.json .
RUN npm install

# Install modules
WORKDIR /app
COPY /src/repo/package*.json .
RUN npm install

# Copy common code
WORKDIR /
COPY /src/nodegit-helper /nodegit-helper
COPY /src/common /common
COPY /src/postgres-utils /postgres-utils

# Copy source code
WORKDIR /app
COPY /src/repo .

EXPOSE 80

CMD ["node", "index.js"]

