
import { apiAuthHeader } from './api.js';

export async function registerService( serviceName, hostname= null, data= {} ) {
  hostname= hostname || serviceName;

  const resp= await fetch(`http://${process.env.REGISTRY_NAME}/service/${serviceName}`, apiAuthHeader({
    method: 'POST',
    body: JSON.stringify({
      hostname,
      healthCheck: '/',
      data
    }),
    headers: {'Content-Type': 'application/json'}
  }));

  if( !resp.ok ) {
    const text= await resp.text();
    throw Error(`Could not register service (status ${resp.status}):`, text);
  }

  const json= await resp.json();
  return json.id;
}

export async function registerNotification( serviceName, subscriberName, path ) {
  const resp= await fetch(`http://${process.env.REGISTRY_NAME}/service/${serviceName}/notify/${subscriberName}/broadcast/${path}`, apiAuthHeader({
    method: 'POST'
  }));

  if( !resp.ok ) {
    const text= await resp.text();
    throw Error(`Could not register notification '${serviceName}' -> '${subscriberName}/${path}' (status ${resp.status}):`, text);
  }
}
