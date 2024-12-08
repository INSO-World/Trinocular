import { expect } from 'chai';
import sinon from 'sinon';
import esmock from 'esmock';

describe('setupShutdownSignals', () => {
  let processStub;
  let setTimeoutStub;
  let httpServerStub;
  let callbackStub;

  async function mockGlobalProcess() {
    return await esmock('../shutdown.js', {
      import: {
        process: processStub,
        setTimeout: setTimeoutStub
      }
    });
  }

  beforeEach(() => {
    setTimeoutStub= sinon.stub();
    processStub= {
      on: sinon.stub(),
      exit: sinon.stub()
    };
    httpServerStub= {
      close: sinon.stub()
    };
    callbackStub= sinon.stub().returns(Promise.resolve({}));
  });

  it('registers shutdown handler for http server', async () => {
    const { setupShutdownSignals }= await mockGlobalProcess();

    setupShutdownSignals( httpServerStub, callbackStub );

    expect(processStub.on.calledWith('SIGTERM')).to.be.true;
    expect(processStub.on.calledWith('SIGINT')).to.be.true;
    expect(httpServerStub.close.called).to.be.false;
    expect(callbackStub.called).to.be.false;

    const [eventName, callbackFunction]= processStub.on.getCall(0).args;

    // Pretend to shutdown the application
    callbackFunction();

    expect(httpServerStub.close.calledOnce).to.be.true;
    expect(setTimeoutStub.calledOnce).to.be.true;
    expect(callbackStub.called).to.be.false;
    
    // Pretend http server has shutdown within the max timeout
    await httpServerStub.close.getCall(0).args[0]();

    expect(callbackStub.calledOnce).to.be.true;
    expect(processStub.exit.calledOnceWith(0)).to.be.true;
  });

  it('shuts down if the http server takes too long', async () => {
    const { setupShutdownSignals }= await mockGlobalProcess();

    setupShutdownSignals( httpServerStub, callbackStub );
    const [eventName, callbackFunction]= processStub.on.getCall(0).args;

    // Pretend to shutdown the application
    callbackFunction();
    
    // Pretend http server has missed the max timeout
    await setTimeoutStub.getCall(0).args[0]();
    
    expect(callbackStub.calledOnce).to.be.true;
    expect(processStub.exit.calledOnceWith(1)).to.be.true;
  });

  it('ever calls the callback function once', async () => {
    const { setupShutdownSignals }= await mockGlobalProcess();

    setupShutdownSignals( httpServerStub, callbackStub );
    const [eventName, callbackFunction]= processStub.on.getCall(0).args;

    // Pretend to shutdown the application
    callbackFunction();
    
    // Pretend http server has missed the max timeout but
    // finishes while the setTimeout callback is still running
    let setTimeoutPromise;
    callbackStub.returns(new Promise( async res => {
      // Interject the callback function called by setTimeout to
      // close the http server -> the callback won't run a second time
      // but we get the chance to call process.exit with 0
      await httpServerStub.close.getCall(0).args[0]();
    
      // End the callback function
      res();

      // Now wait for the set setTimeout to finish after getting disturbed
      await setTimeoutPromise;

      expect(callbackStub.calledOnce).to.be.true;
      expect(processStub.exit.called).to.be.true;
      expect(processStub.exit.getCall(0).args[0]).to.equal(0);
    }))

    setTimeoutPromise= setTimeoutStub.getCall(0).args[0]();
  });
});
