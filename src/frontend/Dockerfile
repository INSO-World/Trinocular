FROM node:current-alpine

# Install gyp dependencies into virtual package
# so npm can build packages from source
RUN apk add --no-cache --virtual .gyp g++ make python3 

# Install common modules
WORKDIR /common
COPY /src/common/package*.json .
RUN npm install

WORKDIR /auth-utils
COPY /src/auth-utils/package*.json .
RUN npm install

# Install modules
WORKDIR /app
COPY /src/frontend/package*.json .
RUN npm install

# Remove gyp and dependencies
RUN apk del .gyp

# Copy common code
WORKDIR /
COPY /src/common /common
COPY /src/auth-utils /auth-utils

# Copy source code
WORKDIR /app
COPY /src/frontend .

EXPOSE 80

CMD ["node", "index.js"]
