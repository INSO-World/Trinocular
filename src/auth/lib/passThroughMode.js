
import { flagIsSet, logger } from '../../common/index.js';

/** @type {boolean?} */
let passThroughModeValue= null;
export function isPassThroughMode() {
  if( passThroughModeValue === null ) {
    passThroughModeValue= flagIsSet('PASS_THROUGH_MODE');

    if( passThroughModeValue ) {
      logger.warning('Service is running in pass-through mode. User authentication is disabled');
    }
  }

  return passThroughModeValue;
}
