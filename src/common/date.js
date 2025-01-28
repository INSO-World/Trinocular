
function ensureDate( date ) {
  if( typeof date === 'string' ) {
    date= new Date(date);
  }

  if( !date || Number.isNaN(date.getTime()) ) {
    return null;
  }

  return date;
}

function digitPad( number, len= 2 ) {
  return `${number}`.padStart(len, '0');
}


export function formatDateTimeSimple( date ) {
  date= ensureDate( date );
  if( !date ) {
    return '<invalid date>';
  }
  
  const day= digitPad( date.getDate() );
  const month= digitPad( date.getMonth()+ 1 );
  const year= date.getFullYear();
  const hours= digitPad( date.getHours() );
  const minutes= digitPad( date.getMinutes() );
  const seconds= digitPad( Math.floor( date.getSeconds() ) );


  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}


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
  date= ensureDate( date );
  if( !date ) {
    return '<invalid date>';
  }

  const day= date.getDate();
  const dayPostfix= ordinalPostfix( day );
  const month= MONTHS[date.getMonth()];
  const year= date.getFullYear();

  let timeString= '';
  if( includeTime ) {
    const hours= digitPad(date.getHours());
    const minutes= digitPad(date.getMinutes());
    const seconds= digitPad( Math.floor( date.getSeconds() ) );

    timeString= ` ${hours}:${minutes}:${seconds}`;
  }

  return `${day}${dayPostfix} ${month} ${year}${timeString}`;
}

