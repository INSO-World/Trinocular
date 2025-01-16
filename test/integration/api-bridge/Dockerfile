FROM node:23.3.0-alpine3.20

# Install common modules
WORKDIR /postgres-utils
COPY /src/auth-utils/package*.json .
RUN npm install

# Install modules
WORKDIR /app
COPY /test/integration/api-bridge/package*.json .
RUN npm install

# Copy common code
WORKDIR /
COPY /src/common /common
COPY /src/postgres-utils /postgres-utils

# Copy source code
WORKDIR /
COPY /test/integration/api-bridge/members-test.js /api-bridge

# Run tests
CMD ["sh", "-c", "set -e && \
    STATUS=0 && \
    echo 'Running tests in /api-bridge...' && cd /api-bridge && npm test || STATUS=1 && \
    if [ $STATUS -ne 0 ]; then echo 'One or more tests failed.'; exit 1; fi \
"]
