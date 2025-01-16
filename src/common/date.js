
const MONTHS= [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

function ordinalPostfix( number ) {
  switch( number ) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

/**
 * @param {Date|string} date 
 */
export function formatDateTime( date, includeTime= true ) {
  if( typeof date === 'string' ) {
    date= new Date(date);
  }

  if( !date || Number.isNaN(date.getTime()) ) {
    return '<invalid date>';
  }

  const day= date.getDate();
  const dayPostfix= ordinalPostfix( day );
  const month= MONTHS[date.getMonth()];
  const year= date.getFullYear();

  let timeString= '';
  if( includeTime ) {
    const hours= date.getHours();
    const minutes= date.getMinutes();
    const seconds= Math.floor( date.getSeconds() );

    timeString= ` ${hours}:${minutes}:${seconds}`;
  }

  return `${day}${dayPostfix} ${month} ${year}${timeString}`;
}
