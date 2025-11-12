
export class ResponseQueue {
  constructor( timeout ) {
    this.timeout= timeout;
    this.timeoutTimer= null;
    
    /** @type {{resolve: function():void, reject: function():void}?} */
    this.pendingPromise= null;

    /** @type {string[]} */
    this.expectedResponses= [];

    /** @type {{response: string, error: string?}[]} */
    this.responseQueue= [];

    /** @type {(function(string):void)?} */
    this.onResponse= null;
  }

  /**
   * @param {string|string[]} responses 
   */
  expectResponses( responses ) {
    if(!Array.isArray(responses)) {
      responses= [responses];
    }

    this.expectedResponses= [...responses];
  }

  /**
   * @param {string} response 
   * @param {string?} error 
   * @returns {boolean} Whether the response was expected
   */
  deliverResponse( response, error= null ) {
    const wasExpected= this.expectedResponses.includes(response);

    this.responseQueue.push({ response, error });
    this._consumeAvailableResponses();

    return wasExpected;
  }

  /**
   * @returns {Promise<void>}
   */
  async waitForExpectedResponses() {
    if( this.pendingPromise ) {
      throw new Error(`Queue can only be awaited by a single promise`);
    }

    this._clearTimeout();
    this.timeoutTimer = setTimeout(() => this._responseTimeout(), this.timeout);

    const promise= new Promise((resolve, reject) => {
      this.pendingPromise= {resolve, reject};
    });

    this._consumeAvailableResponses();

    return promise;
  }

  _consumeAvailableResponses() {
    if(!this.pendingPromise) {
      return;
    }

    // Go through all the queued responses
    for(const {response, error} of this.responseQueue ) {
      // Reject if the response was unexpected
      const index= this.expectedResponses.indexOf(response);
      if( index < 0 ) {
        const expected= this.expectedResponses.join(', ') || '<none>';
        return this._resetAndSettle().reject(
          new Error(`Response queue received unexpected response '${response}' (expected: ${expected})`)
        );
      }

      // Reject if the response came with an error
      if( error ) {
        return this._resetAndSettle().reject(
          new Error(`Response queue received error response '${response}': ${error}`)
        );
      }

      // Remove the response from the list of expected ones
      this.expectedResponses.splice(index, 1);

      // Update an optional listener that we processed a response
      if(this.onResponse) {
        this.onResponse( response );
      }
    }

    // Clear the queue now that we processed all responses
    this.responseQueue= [];

    if( this.expectedResponses.length ) {
      return;
    }

    // Stop timeout and resolve the promise
    this._resetAndSettle().resolve();
  }

  _resetAndSettle() {
    if( !this.pendingPromise ) {
      throw new Error('No pending promise');
    }

    this._clearTimeout();
    const promise= this.pendingPromise;
    this.pendingPromise= null;
    this.responseQueue= [];
    this.expectedResponses= [];

    return promise;
  }

  _clearTimeout() {
    clearTimeout(this.timeoutTimer);
    this.timeoutTimer= null;
  }

  _responseTimeout() {
    this._clearTimeout();

    if (!this.pendingPromise) {
      return;
    }

    const expected= this.expectedResponses.join(', ') || '<none>';
    this._resetAndSettle().reject(
      new Error(
        `Response queue timed out waiting for expected responses: ${expected}`
      )
    );
  }
}
