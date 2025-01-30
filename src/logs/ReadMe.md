# Api Bridge

## Description

The `logs` service is part of the logging framework of Trinocular. It provides an interface to query the stored log messages in the database, and automatically manages the deletion of old entries. The service can either run in regular "retention" mode where log entries are kept for a certain number of days before being automatically deleted, or "archive" mode where old entries are exported as a gzipped JSON file in regular intervals. For more details see below. The service also hosts a micro-frontend for viewing log entries that is embedded into the system status page. As the logs service queries the database in various ways it also adds additional modifiers to the logs table created by fluentbit such as additional indices.

## Dockerfile

The api bridge service is a regular NodeJS service with an AlpineLinux base image and necessary utils to access the
fluent-db service.

## Logging framework

Services that use Trinocular's logging framework, log messages to the console and also send them to the fluentbit service which aggregates all logs into a single stream of messages. Fluentbit also has some special configuration to handle the logs produced by Keykloak. Fluentbit is configured to output the message stream directly into a table in the fluentbit-db which is a regular postgres instance. (For performance reasons the logs-service adds modifiers to the table.) The logs-service manages the contents of the database by automatically deleting old entries and offering a simple way to query the log messages.

## Logs rolling

The logs-service is configured via environment variables that are set in the `.env` file. It can either be set to retention mode or archive mode.

### Retention mode

Retention mode is set by providing a number of days to the `LOG_RETENTION_DAYS` that is greater than 0. Values less or equal zero disable log rolling and all log entries will stay in the database. In retention mode every few minutes all log entries older than the specified number of days will be deleted from the database.

### Archive mode

Archive mode is enabled by setting the the `ARCHIVE_LOGS` variable to `true`, and providing an export path for archive storage via the `ARCHIVE_PATH` variable. In archive mode the logs service collects log entries with an age of up to _twice_ the `LOG_RETENTION_DAYS`. When messages this old exist, all entries that are older than `LOG_RETENTION_DAYS` are exported as JSON and gzipped before they get deleted. This way there is always messages in the database with an age up to (twice) retention days for querying in the frontend.

## Tutorials

### How to add logging support to a service

Adding logging support to a NodeJS service is done via utility functions provided in the `common` module. Before logging can be used the logger interface needs to be initialized via the `initLogger()` function. The `logger` instance that can be imported from the `common` module is null before calling this function. The init function automatically sets the service name and for this requires setting some environment variables in the service's `.env` file.

```ini
SERVICE_NAME= logs
FLUENTBIT_HOSTNAME= fluentbit
```

The service name is the hostname of the service which also used as the name in the log messsage. In the main entry point script of the service do:

```JS
import { initLogger, logger, readSecretEnv } from '../common/index.js';

await initLogger();
readSecretEnv();

logger.info('Hello world from main script');
```

After initializing the logger (which should be done before anything else), the `logger` instance can be imported from `common` and be used. In other files than the main entry point script just import the `logger` instance and use it.

```JS
import { logger } from '../common/index.js';

logger.info('Hello world from some other script');
```

### Using the logger

The logger is a [`winston.Logger`][https://github.com/winstonjs/winston] instance that is configured to print messages to the terminal like the `console` would, and also send them to the fluentbit logging framework. It has multiple methods for different log levels:

- `debug`
- `info`
- `warning`
- `error`

For formatting complex messages you can either use JS template strings or 'splatting', where you mark places to add values into your messages with `%s`. This is important for printing errors, where you want to show the stack trace, as this is not supported by template strings. Furthermore, while winston automatically appends any additional objects provided to the logging method to the message it does not do so the same as the `console` would. For example error do not show a stack trace this way, hence splatting is the preferred option.

JS Template string example:
```JS
const value= 10;
logger.info(`This is a message with a value ${value} in it`);
```

Splatting example:
```JS
const value= 10;
logger.info(`This is a message with a value %s in it`, value);

// Show the error with a stack trace
const error= new Error('My error');
  logger.error(`There was an error: %s`, error);
```

With this in mind, when porting a service from `console` logging to the logging framework, put additional care into your error logging. Make sure to splat the error object so stack traces get printed!

### Logging conventions

When logging we prefer to use messages that are written as English sentences. When values are outputted they should be incorporated into the message body.

DO:
```
The task has processed 500 data points within 10.42s.
```

DON'T:
```
Processed data points by task: 500. Time was: 10.42s.
```

Of course if your message needs to provide a lot of context or wants to show additional data there is a limit to how long a message sentence can be before it become incomprehensible. In such a case do not split the message into multiple sentences or try to incorporate all the data values into a single one. Instead try to write a single short sentence that communicates the main point/gist of the message and provide the additional data values as a tuple for more context.

DO:
```
The task has processed 500 data points within 10.42s. (task-id: 2af679d9b6ec, checksum: 76af5eb78cd, size: 231MiB)
```
DON'T:
```
The task with id '2af679d9b6ec' has processed 500 data points with checksum '76af5eb78cd' and a size of 231MiB within 10.42s.
```

Finally when formatting values into the message string put numbers directly, and put quotes around strings.

DO:
```
Added new user 'Andy'.
```

DON'T
```
Added new user Andy.
```

## Endpoints

The logs service only hosts protected routes, as they are not publicly available.

### (Protected) `GET` /viewer

Hosts a web page with a micro frontend for viewing the log entries. Users can query the log entries in the database by multiple filters. The returned entries are sorted by timestamp in descending order.

Query parameters:

- `tag` - Filter by the service name/tag (`all` disables filtering)
- `search` - Search text for sub-string search in the log messages
- `page` - Page number to show (zero based)
- `pageSize` - Number of entries per page
- `levels` - Filter by the log levels (`all`, `error-warning`, `error`)
- `startDate` - ISO timestamp
- `endDate` - ISO timestamp

## Classes

_none_

