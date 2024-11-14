
import { randomBytes } from 'node:crypto';

const UPDATE_INTERVAL= 60* 1000; // every minute
const TOKEN_TTL= 20* 60* 1000;   // invalidate tokens after 20min

class TokenManager {
  constructor() {
    this.tokens= new Set();
    this.buckets= [];
    this.bucketIndex= 0;
    this.timer= null;

    const numBuckets= Math.round(TOKEN_TTL / UPDATE_INTERVAL);
    for( let i= 0; i< numBuckets; i++ ) {
      this.buckets.push([]);
    }
  }

  /** @type {TokenManager?} */
  static _instance= null;

  static the() {
    if( !TokenManager._instance ) {
      TokenManager._instance= new TokenManager();
      TokenManager._instance.startTimer();
    }

    return TokenManager._instance;
  }

  stopTimer() {
    if( this.timer ) {
      clearInterval( this.timer );
      this.timer= null;
    }
  }

  startTimer() {
    this.stopTimer();
    this.timer= setInterval(() => this.clearNextBucket(), UPDATE_INTERVAL);
  }

  clearNextBucket() {
    // Move to the next bucket
    this.bucketIndex= (this.bucketIndex+ 1) % this.buckets.length;
    const bucket= this.buckets[this.bucketIndex];

    // Remove all tokens from the valid set
    for( const token of bucket ) {
      this.tokens.delete( token );
    }

    // Clear the bucket itself
    bucket.length= 0;

    // this._print();
  }

  insertToken( token ) {
    this.tokens.add( token );
    this.buckets[this.bucketIndex].push( token );
  }

  checkToken( token ) {
    return this.tokens.has( token );
  }

  _print() {
    let str= '';
    for( let i= 0; i < this.buckets.length; i++ ) {
      if( i === this.bucketIndex ) {
        str+= '>';
      }

      str+= '['+ this.buckets[i].join(', ') + ']';

      if( i === this.bucketIndex ) {
        str+= '<'
      }

      str+= ' ';
    }
    console.log( str );
  }
}


export function createToken( sessionID ) {
  const nonceString= randomBytes(24).toString('base64');
  const token= `${sessionID}-${nonceString}`;
  TokenManager.the().insertToken( token );

  return nonceString;
}

export function csrf(req, res, next) {
  if( !req.body || typeof req.body !== 'object' ) {
    return next();
  }

  if( req.method === 'HEAD' || req.method === 'OPTIONS' ) {
    return next();
  }

  if( !req.is('application/*') && !req.is('multipart/form-data') ) {
    return next();
  }

  // Reassemble the token from the session id and nonce string
  const sessionID= req.sessionID;
  const nonceString= req.body.csrfToken;
  const token= `${sessionID}-${nonceString}`;

  // Check the provided token
  if( TokenManager.the().checkToken(token) ) {
    req.csrfError= false;
    
  } else {
    // Rename the body so no one tries acting on it
    req.unsafeBody= req.body;
    req.body= {};
    req.csrfError= true;

    console.log(`Request to '${req.path}' with invalid CSRF token '${token}'`);
  }

  next();
}
