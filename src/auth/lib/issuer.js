import { logger } from '../../common/index.js';

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
