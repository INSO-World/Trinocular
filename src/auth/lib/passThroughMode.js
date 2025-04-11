
import { logger } from '../../common/index.js';


let passThroughModeValue= null;
function parsePassThroughFlag() {
  const flag = process.env.PASS_THROUGH_MODE;
  passThroughModeValue= flag && flag.trim().toLowerCase() === 'true';

  if( passThroughModeValue ) {
    logger.warning('Service is running in pass-through mode. User authentication are disabled')
  }
}

export function isPassThroughMode() {
  if( passThroughModeValue === null ) {
    parsePassThroughFlag();
  }

  return passThroughModeValue;
}
