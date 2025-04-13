import winston, { format } from 'winston';
import fluentLogger from 'fluent-logger';
import { waitFor } from './util.js';

/**
 * Polls fluent-bit's API health endpoint to wait until it is ready
 * to take connections
 * @param {string} hostname
 */
async function waitForFluentbit(hostname) {
  while (true) {
    try {
      const resp = await fetch(`http://${hostname}/api/v1/health`);
      if (resp.ok) {
        return;
      }
    } catch (e) {}

    await waitFor(1000);
  }
}

/** @type {winston.Logger?} */
export let logger = null;

// A way to get the logger instance via a closure function
// This is mostly useful for testing with esmock
export function getLoggerInstance() {
  return logger;
}

async function createFluentbitTransport() {
  // Make sure env variables exist
  const { SERVICE_NAME: name, FLUENTBIT_HOSTNAME: host, FLUENTBIT_PORT: port } = process.env;
  if (!name || !host) {
    throw new Error(`Missing configuration: SERVICE_NAME & FLUENTBIT_HOSTNAME are required`);
  }

  // The fluent transporter expects fluent-bit to be ready, so we might need
  // to wait for this to be the case
  await waitForFluentbit(host);

  // Configuration for the transport of log messages to fluent-bit
  const FluentTransporter = fluentLogger.support.winstonTransport();
  const fluentTransport = new FluentTransporter(name, {
    host,
    port: port ? parseInt(port) : 24224,
    timeout: 3,
    reconnectInterval: 30 * 1000,
    format: format.combine(format.errors({ stack: true }), format.splat())
  });

  return fluentTransport;
}

/**
 * Sets up the logger instance to print to the console and send the log messages
 * to a fluent-bit instance for persistence.
 * @param {boolean} remoteLogging Enables logging to a remote fluentbit instance
 */
export async function initLogger(remoteLogging = true) {
  // Only allow setting up once
  if (logger) {
    throw new Error('Logger already initialized');
  }

  // Configuration for the transport of log messages to the console
  const consoleTransport = new winston.transports.Console({
    format: format.combine(
      format.colorize(),
      format.padLevels(),
      format.errors({ stack: true }),
      format.splat(),
      format.printf(info => `[${info.level}] ${info.message}`)
    )
  });

  const transports = [consoleTransport];

  if (remoteLogging) {
    transports.push(await createFluentbitTransport());
  }

  logger = winston.createLogger({
    levels: winston.config.syslog.levels,
    transports
  });
}

class SubstituteLogger {
  log(...args) {
    console.info(...args);
  }
  debug(...args) {
    console.debug(...args);
  }
  info(...args) {
    console.info(...args);
  }
  warning(...args) {
    console.warn(...args);
  }
  error(...args) {
    console.error(...args);
  }
}

/**
 * @returns {winston.Logger | SubstituteLogger} Either returns the logger object if 'initLogger'
 * has already been called, else just the regular console. This allows other facilities
 * in the common library to print messages without requiring the user to instantiate the
 * logger.
 */
export function loggerOrConsole() {
  return logger ? logger : new SubstituteLogger();
}
