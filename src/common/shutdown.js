
function closeServerAndShutdown(server, callback) {
  console.log('Closing HTTP server...');
  
  server.close(() => {
    if( callback ) {
      callback();
    }
    process.exit(0);
  });
  
  setTimeout(() => {
    console.error('Forcing shutdown');
    if( callback ) {
      callback();
    }
    process.exit(1);
  }, 5000);
}

export function setupShutdownSignals( server, callback= null ) {
  // Listen for termination signals
  process.on('SIGTERM', () => closeServerAndShutdown(server, callback) );
  process.on('SIGINT', () => closeServerAndShutdown(server, callback) );
}
