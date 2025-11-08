import { readFileSync } from 'fs';
import { logger } from '../../common/logger.js';

/** @type {Set<string>?} */
let acceptedEmails= null;

/** @type {string?} */
let adminUserRole= null;

export function initUserFilter() {
  if( process.env.ACCEPTED_USER_EMAILS_FILE && process.env.ACCEPTED_USER_EMAILS_FILE.trim() ) {
    const text= readFileSync(process.env.ACCEPTED_USER_EMAILS_FILE, 'utf8');
    const emails= text.split('\n').map( s => s.trim() ).filter( s => s.length );
    acceptedEmails= new Set( emails );
    
    if( acceptedEmails.size ) {
      logger.info(`User email filtering enabled (${acceptedEmails.size} emails found)`);
      
    } else {
      logger.warning('User email filter file is empty')
    }
  } else {
    logger.info('User email filtering disabled');
  }

  if( process.env.ADMIN_USER_ROLE && process.env.ADMIN_USER_ROLE.trim() ) {
    adminUserRole= process.env.ADMIN_USER_ROLE.trim();
    logger.info(`OICD admin user role is called '${adminUserRole}'`);
    
  } else {
    logger.warning('Service is running without admin-user role checks. All users will be admins');
  }
}

export function userFilteringEnabled() {
  return !!acceptedEmails;
}

export function filterUser( user ) {
  return user && userFilteringEnabled() && acceptedEmails.has( user.email );
}

export function userHasAdminRole( user ) {
  if( !adminUserRole ) {
    return true;
  }

  const roles= user?.realm_access?.roles || [];
  if( !Array.isArray(roles) ) {
    return false;
  }

  return roles.includes(adminUserRole);
}
