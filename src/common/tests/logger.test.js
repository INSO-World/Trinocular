import sinon from 'sinon';
import esmock from 'esmock';
import winston from 'winston';
import ArrayTransport from 'winston-array-transport';

import chaiAsPromised from 'chai-as-promised';
import * as chai from 'chai';
chai.use(chaiAsPromised);

const expect = chai.expect;

describe('logger', () => {
  let fluentLoggerStub;
  let fetchStub;
  let setTimeoutStub;
  let responseStub;
  let fluentbitLogsArray;
  let arrayTransportInstance;

  async function mockFluentLogger() {
    return await esmock('../logger.js', {
      'fluent-logger': fluentLoggerStub,
      import: {
        fetch: fetchStub,
        setTimeout: setTimeoutStub,
        process: {
          env: {
            SERVICE_NAME: 'fakeServiceName',
            FLUENTBIT_HOSTNAME: 'fakeHostName'
          }
        }
      }
    });
  }

  beforeEach(() => {
    fluentbitLogsArray = [];

    arrayTransportInstance = null;

    // This is a customized version of the array transport class, with a constructor
    // that matches the one of the `FluentTransporter` class.
    class CustomArrayTransport extends ArrayTransport {
      constructor(name, options) {
        super({
          name,
          array: fluentbitLogsArray
        });

        this.fluentbitOptions = options;

        // Make the last instance of the array transport available for later testing
        arrayTransportInstance = this;
      }
    }

    fluentLoggerStub = {
      support: {
        winstonTransport() {
          return CustomArrayTransport;
        }
      }
    };

    responseStub = {
      ok: true,
      status: 200
    };

    fetchStub = sinon.stub().resolves(responseStub);
    setTimeoutStub = sinon.stub().callsArg(0);
  });

  it('loggerOrConsole returns console if no logger is setup', async () => {
    const { loggerOrConsole } = await mockFluentLogger();

    const con = loggerOrConsole();

    expect(con).to.equal(global.console);
  });

  it('initLogger waits for fluentbit to be healthy', async () => {
    const { initLogger, getLoggerInstance } = await mockFluentLogger();

    fetchStub.onCall(0).throws(Error('Fake fetch error'));
    fetchStub.onCall(1).resolves({ ok: false, status: 500 });
    fetchStub.onCall(2).resolves({ ok: true, status: 200 });

    expect(getLoggerInstance()).to.be.null;

    await initLogger();

    expect(arrayTransportInstance.name).to.equal('fakeServiceName');
    expect(arrayTransportInstance.fluentbitOptions.host).to.equal('fakeHostName');

    expect(getLoggerInstance()).to.not.be.null;
    expect(fetchStub.callCount).to.equal(3);
    expect(setTimeoutStub.callCount).to.equal(2);
  });

  it('loggerOrConsole returns logger after initialization', async () => {
    const { initLogger, loggerOrConsole } = await mockFluentLogger();

    await initLogger();

    const logger = loggerOrConsole();

    expect(logger).to.be.instanceOf(winston.Logger);
  });

  it('cannot be initialized more than once', async () => {
    const { initLogger, getLoggerInstance } = await mockFluentLogger();

    expect(getLoggerInstance()).to.be.null;

    await initLogger();

    expect(getLoggerInstance()).to.not.be.null;

    expect(initLogger()).to.be.rejectedWith('Logger already initialized');
  });

  it('sends logs to the fluentbit transport', async () => {
    const { initLogger, getLoggerInstance } = await mockFluentLogger();

    await initLogger();

    const logger = getLoggerInstance();
    expect(logger).to.not.be.null;

    logger.info('A log message');
    logger.info('B log message');

    expect(fluentbitLogsArray).to.deep.equal([
      '{"level":"info","message":"A log message"}',
      '{"level":"info","message":"B log message"}'
    ]);
  });
});
