import { expect } from 'chai';
import { getSubPath } from '../lib/util.js';

describe('Util Functions', () => {
  describe('getSubPath', () => {
    it('should return the correct subpath', () => {
      const result = getSubPath('/notify/subscriber1/broadcast', 'notify/subscriber1/broadcast');
      expect(result).to.equal('/');
    });

    // TODO: Define wanted behavior for this test
    // it('should return the original path if base path is not found', () => {
    //     const result = getSubPath('/notify/subscriber1/broadcast', 'notify/subscriber2/broadcast');
    //     expect(result).to.equal('/notify/subscriber1/broadcast');
    // });

    it('should handle empty paths correctly', () => {
      const result = getSubPath('', 'notify/subscriber1/broadcast');
      expect(result).to.equal('/');
    });

    it('should handle empty base paths correctly', () => {
      const result = getSubPath('/notify/subscriber1/broadcast', '');
      expect(result).to.equal('/notify/subscriber1/broadcast');
    });
  });
});
