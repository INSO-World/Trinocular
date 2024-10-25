import { Registry } from '../lib/registry.js';
import { getSubPath } from '../lib/util.js';


export async function broadcast( req, res ) {
  const {name}= req.params;
  const path= getSubPath( req.path, `${name}/broadcast` );

  const service= Registry.the().service( name );
  if( !service ) {
    res.status(404).end(`Unknown service '${name}'\n`);
    return;
  }

  const success= await service.broadcast( req.method, path, req.body );
  res.sendStatus( success ? 200 : 502 );
}
