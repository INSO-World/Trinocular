
import winston, {format} from 'winston';
import fluentLogger from 'fluent-logger';

/**
 * Polls fluent-bit's API health endpoint to wait until it is ready
 * to take connections
 * @param {string} hostname 
 */
async function waitForFluentbit( hostname ) {
  while( true ) {
    try {
      const resp= await fetch(`http://${hostname}/api/v1/health`);
      if( resp.ok ) {
        return;
      }
  
    } catch( e ) {}

    await new Promise( res => setTimeout(res, 1000) );
  }
}

/** @type {winston.Logger?} */
export let logger= null;

// A way to get the logger instance via a closure function
// This is mostly useful for testing with esmock
export function getLoggerInstance() {
  return logger;
}

/**
 * Sets up the logger instance to print to the console and send the log messages
 * to a fluent-bit instance for persistence.
 */
export async function initLogger() {
  // Only allow setting up once
  if( logger ) {
    throw new Error('Logger already initialized');
  }

  // Make sure env variables exist
  const {SERVICE_NAME: name, FLUENTBIT_HOSTNAME: host, FLUENTBIT_PORT: port}= process.env;
  if( !name || !host ) {
    throw new Error(`Missing configuration: SERVICE_NAME & FLUENTBIT_HOSTNAME are required`);
  }

  // The fluent transporter expects fluent-bit to be ready, so we might need
  // to wait for this to be the case
  await waitForFluentbit( host );

  // Configuration for the transport of log messages to fluent-bit
  const FluentTransporter= fluentLogger.support.winstonTransport();
  const fluentTransport= new FluentTransporter( name, {
    host,
    port: port ? parseInt(port) : 24224,
    timeout: 3,
    reconnectInterval: 30*1000,
    format: format.combine(
      format.errors({stack: true}),
      format.splat()
    )
  });

  // Configuration for the transport of log messages to the console
  const consoleTransport= new winston.transports.Console({
    format: format.combine(
      format.colorize(),
      format.padLevels(),
      format.errors({stack: true}),
      format.splat(),
      format.printf( info => `[${info.level}] ${info.message}` )
    )
  });

  logger= winston.createLogger({ 
    levels: winston.config.syslog.levels,
    transports: [fluentTransport, consoleTransport]
  });
}

class SubstituteLogger {
  log(...args) { console.info(...args); }
  debug(...args) { console.debug(...args); }
  info(...args) { console.info(...args); }
  warning(...args) { console.warn(...args); }
  error(...args) { console.error(...args); }
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
