FROM node:23.3.0-alpine3.20

# Install common modules
WORKDIR /common
COPY /src/common/package*.json .
RUN npm install

WORKDIR /auth-utils
COPY /src/auth-utils/package*.json .
RUN npm install

WORKDIR /postgres-utils
COPY /src/auth-utils/package*.json .
RUN npm install

# Copy common code
WORKDIR /
COPY /src/common /common
COPY /src/auth-utils /auth-utils
COPY /src/postgres-utils /postgres-utils

CMD ["sh", "-c", "set -e && \
    STATUS=0 && \
    echo 'Running tests in /common...' && cd /common && npm test || STATUS=1 && \
    echo 'Running tests in /auth-utils...' && cd /auth-utils && npm test || STATUS=1 && \
    echo 'Running tests in /postgres-utils...' && cd /postgres-utils && npm test || STATUS=1 && \
    if [ $STATUS -ne 0 ]; then echo 'One or more tests failed.'; exit 1; fi \
"]
