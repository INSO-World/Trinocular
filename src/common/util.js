
export async function waitFor( ms ) {
  return new Promise( res => {
    setTimeout( res, ms );
  });
}
