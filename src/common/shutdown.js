import { loggerOrConsole } from './logger.js';

function closeServerAndShutdown(server, callback) {
  const logger= loggerOrConsole();

  logger.info('Closing HTTP server...');
  
  let didCallCallback= false;
  async function doCallbackOnce() {
    if( callback && !didCallCallback ) {
      didCallCallback= true;
      await callback();
    }
  }

  server.close(async () => {
    doCallbackOnce();
    process.exit(0);
  });
  
  setTimeout(async () => {
    logger.error('Forcing shutdown');
    
    doCallbackOnce();
    process.exit(1);
  }, 5000);
}

export function setupShutdownSignals( server, callback= null ) {
  // Listen for termination signals
  process.on('SIGTERM', () => closeServerAndShutdown(server, callback) );
  process.on('SIGINT', () => closeServerAndShutdown(server, callback) );
}
