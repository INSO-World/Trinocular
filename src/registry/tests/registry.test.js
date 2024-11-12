// tests/registry.test.js
import { expect } from 'chai';
import { Registry, } from '../lib/registry.js';
import { apiAuthHeader } from '../../common/index.js';

describe('Registry', () => {
    beforeEach(() => {
        Registry._instance = null;
    });

    it('create initializes a new instance', () => {
        Registry.create();
        expect(Registry._instance).to.be.instanceOf(Registry);
    });

    it('the returns the singleton instance', () => {
        Registry.create();
        const instance = Registry.the();
        expect(instance).to.equal(Registry._instance);
    });

    it('service returns a service by name', () => {
        const registry = new Registry();
        registry.ensureService('service1');
        const service = registry.service('service1');
        expect(service).to.not.be.null;
    });

    it('service returns null on missing service', () => {
        const registry = new Registry();
        registry.ensureService('service1');
        const missing_service = registry.service('service2');
        expect(registry.services.size).to.equal(1);
        expect(missing_service).to.be.null;
    });

    it('ensureService creates a new service if not exists', () => {
        const registry = new Registry();
        const service = registry.ensureService('service1');
        expect(registry.services.size).to.equal(1);
    });

    it('ensureService creates NO new service if exists', () => {
        const registry = new Registry();
        const service = registry.ensureService('service1');
        const dup_service = registry.ensureService('service1');
        expect(registry.services.size).to.equal(1);
    });
});