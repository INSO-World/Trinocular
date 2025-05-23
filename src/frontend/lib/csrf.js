import { randomBytes } from 'node:crypto';
import { logger } from '../../common/index.js';

const UPDATE_INTERVAL = 60 * 1000; // every minute
const TOKEN_TTL = 20 * 60 * 1000; // invalidate tokens after 20min

class TokenManager {
  constructor() {
    this.tokens = new Set();
    this.buckets = [];
    this.bucketIndex = 0;
    this.timer = null;

    const numBuckets = Math.round(TOKEN_TTL / UPDATE_INTERVAL);
    for (let i = 0; i < numBuckets; i++) {
      this.buckets.push([]);
    }
  }

  /** @type {TokenManager?} */
  static _instance = null;

  static the() {
    if (!TokenManager._instance) {
      TokenManager._instance = new TokenManager();
      TokenManager._instance.startTimer();
    }

    return TokenManager._instance;
  }

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  startTimer() {
    this.stopTimer();
    this.timer = setInterval(() => this.clearNextBucket(), UPDATE_INTERVAL);
  }

  clearNextBucket() {
    // Move to the next bucket
    this.bucketIndex = (this.bucketIndex + 1) % this.buckets.length;
    const bucket = this.buckets[this.bucketIndex];

    // Remove all tokens from the valid set
    for (const token of bucket) {
      this.tokens.delete(token);
    }

    // Clear the bucket itself
    bucket.length = 0;

    // this._print();
  }

  insertToken(token) {
    this.tokens.add(token);
    this.buckets[this.bucketIndex].push(token);
  }

  checkToken(token) {
    return this.tokens.has(token);
  }

  _print() {
    let str = '';
    for (let i = 0; i < this.buckets.length; i++) {
      if (i === this.bucketIndex) {
        str += '>';
      }

      str += '[' + this.buckets[i].join(', ') + ']';

      if (i === this.bucketIndex) {
        str += '<';
      }

      str += ' ';
    }
    logger.info(str);
  }
}

export function createToken(sessionID) {
  const nonceString = randomBytes(24).toString('base64');
  const token = `${sessionID}-${nonceString}`;
  TokenManager.the().insertToken(token);

  return nonceString;
}

export function csrf(req, res, next) {
  const requestBody = req.body;
  const headerToken = req.header('X-CSRF-TOKEN');

  // Assume we have a CSRF error if there was no token provided
  // Rename the body so no one tries acting on it
  req.csrfError = true;
  req.unsafeBody = requestBody || {};
  req.body = undefined;

  if (!requestBody && !headerToken) {
    return next();
  }

  if (req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  if (!req.is('application/*') && !req.is('multipart/form-data') && !headerToken) {
    return next();
  }

  // Reassemble the token from the session id and nonce string
  const sessionID = req.sessionID;
  const nonceString = requestBody?.csrfToken || headerToken;
  const token = `${sessionID}-${nonceString}`;

  // Check the provided token
  if (!TokenManager.the().checkToken(token)) {
    // CSRF Error detected -> Leave the request marked as bad
    logger.error(`Request to '${req.path}' with invalid CSRF token '${token}'`);

    return next();
  }

  // CSRF token is ok -> Mark the request as ok and put the body back
  req.csrfError = false;
  req.body = requestBody;
  req.unsafeBody = undefined;
  return next();
}
