import { Issuer } from 'openid-client';

import { logger } from '../../common/index.js';
import { UrlConstants } from './urls.js';


export async function waitForIssuer(url, timeout = 2000) {
  logger.info(`Waiting for issuer to become responsive (${url})`);

  let counter = 0;
  while (true) {
    try {
      await new Promise(res => setTimeout(res, timeout));

      counter++;
      const x = await fetch(url);
      if (x.ok) {
        logger.info(`Issuer instance detected after ${counter} attempts`);
        break;
      }
    } catch (e) {}
  }
}

let issuerClient= null;
export async function getIssuerClient() {
  if( issuerClient ) {
    return issuerClient;
  }

  // Wait for OpenID issuer and connect to it
  await waitForIssuer(UrlConstants.issuer);
  
  logger.info('Connecting to issuer');
  const issuer = await Issuer.discover(UrlConstants.issuer);
  
  logger.info(`Discovered issuer (${issuer.issuer})`);
  issuerClient = new issuer.Client({
    client_id: process.env.CLIENT_NAME,
    client_secret: process.env.CLIENT_SECRET,
    redirect_uris: [UrlConstants.loginCallback],
    post_logout_redirect_uris: [UrlConstants.logoutCallback],
    response_types: ['code']
  });

  return issuerClient;
}
