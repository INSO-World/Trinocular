import { readFileSync } from 'fs';
import { logger } from '../../common/logger.js';

/** @type {Set<string>?} */
let acceptedEmails= null;

export function initUserFilter() {
  if( !process.env.ACCEPTED_USER_EMAILS_FILE || !process.env.ACCEPTED_USER_EMAILS_FILE.trim() ) {
    logger.info('User email filtering disabled');
    return;
  }

  const text= readFileSync(process.env.ACCEPTED_USER_EMAILS_FILE, 'utf8');
  const emails= text.split('\n').map( s => s.trim() ).filter( s => s.length );
  acceptedEmails= new Set( emails );

  if( acceptedEmails.size ) {
    logger.info(`User email filtering enabled (${acceptedEmails.size} emails found)`);

  } else {
    logger.warning('User email filter file is empty')
  }
}

export function userFilteringEnabled() {
  return !!acceptedEmails;
}

export function filterUser( user ) {
  return user && userFilteringEnabled() && acceptedEmails.has( user.email );
}
