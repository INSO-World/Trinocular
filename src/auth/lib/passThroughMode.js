
import { flagIsSet, logger } from '../../common/index.js';


let passThroughModeValue= null;
export function isPassThroughMode() {
  if( passThroughModeValue === null ) {
    passThroughModeValue= flagIsSet('PASS_THROUGH_MODE');

    if( passThroughModeValue ) {
      logger.warning('Service is running in pass-through mode. User authentication are disabled')
    }
  }

  return passThroughModeValue;
}
