
export function formatTimeSpan( seconds ) {
  const isNegative= seconds < 0;
  seconds= Math.abs( Math.round(seconds) );

  const hours= Math.floor(seconds / 3600);
  const minutes= Math.floor((seconds % 3600) / 60);
  const secs= seconds % 60;

  let formattedTime = '';

  // Add hours only if they are greater than 0
  if( hours > 0 ) {
      formattedTime += String(hours).padStart(2, '0') + ':';
  }

  formattedTime += String(minutes).padStart(2, '0') + ':';
  formattedTime += String(secs).padStart(2, '0');

  return (isNegative ? '-' : '') + formattedTime;
}
