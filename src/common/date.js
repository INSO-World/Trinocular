
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
