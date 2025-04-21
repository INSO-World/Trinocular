import fs from 'node:fs';
import { loggerOrConsole } from './logger.js';

export function readSecretEnv() {
  const logger = loggerOrConsole();

  for (const varName in process.env) {
    const varValue = process.env[varName];
    if (varName.toLowerCase().endsWith('secret_file')) {
      // Only actually load files with docker compose secrets
      const secretName = varName.substring(0, varName.length - 5); // Takeoff the '_FILE' postfix from the name
      if (!varValue.startsWith('/run/secrets')) {
        logger.warn(`Ignoring secret variable '${secretName}' with unexpected path`);
        continue;
      }

      const fileContents = fs.readFileSync(varValue, 'utf-8').trim();
      process.env[secretName] = fileContents;

      logger.info(`Loaded secret '${secretName}' into environment`);
    }
  }
}

/**
 * Converts a string flag value to a boolean
 * @param {any} flag
 * @param {string?} flagName Optional of the flag used for error messages
 */
export function parseBoolFlag( flag, flagName= null ) {
  flagName ||= '';

  if( flag === null || typeof flag === 'undefined' ) {
    return false;
  }

  if( typeof flag === 'boolean' ) {
    return flag;
  }

  if( typeof flag !== 'string' ) {
    loggerOrConsole.error(`Environment variable flag ${flagName} has invalid JS type (type '${typeof flag}')`);
    return false;
  }

  flag= flag.trim().toLowerCase();
  if( flag === 'true' ) {
    return true;
  }
  if( flag === 'false' ) {
    return false;
  }

  loggerOrConsole.error(`Environment variable flag ${flagName} has invalid string value (value '${flag}')`);
  return false;
}

/**
 * Checks whether an environment flag is set
 * @param {string} flagName 
 */
export function flagIsSet( flagName ) {
  return parseBoolFlag( process.env[flagName], flagName );
}
