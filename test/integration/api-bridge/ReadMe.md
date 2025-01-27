# Integration Test for Datasource Members

**Disclaimer:** This test only run locally with the described test setup. It is not integrated into the pipeline.

## Description

The test focuses on the api-bridge service and its members database to test its functionality.

### Container Setup

The api-bridge service and any services it depends on need to be started, with their respective .env_test if available.

**Postgres Service**

A separate test database is created and started to not interfere with the production database. This is done by using the
.env_test and changing the referred volume in the docker-compose.

**Logging Services**

The logging services need to be started:

- Fluentbit DB
- Fluentbit
- Logs
