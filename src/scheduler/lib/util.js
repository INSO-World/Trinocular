export function formatTimeSpan(seconds) {
  const isNegative = seconds < 0;
  seconds = Math.abs(Math.round(seconds));

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  let formattedTime = '';

  if (hours > 0) {
    formattedTime += String(hours).padStart(2, '0') + 'h ';
  }

  formattedTime += String(minutes).padStart(2, '0') + 'm';

  if( secs > 0 ) {
    formattedTime += ' '+ String(secs).padStart(2, '0')+ 's';
  }

  return (isNegative ? '-' : '') + formattedTime;
}
