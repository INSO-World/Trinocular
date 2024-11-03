import { ApiBridge } from '../lib/api-bridge.js';

export async function postSnapshot( req, res ) {
  const { uuid }= req.params;

  const success= await ApiBridge.the().createSnapshot( uuid );
  if( !success ) {
    return res.status( 404 ).end(`Unknown repository UUID '${uuid}'`);
  }

  res.sendStatus( 200 );
}
