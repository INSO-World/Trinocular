import { expect } from 'chai';
import sinon from 'sinon';
import esmock from "esmock";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { CleanOptions } from 'simple-git';

import { Contributor, Repository } from "../lib/repository.js";


chai.use(chaiAsPromised);

describe('Repository', () => {
  let repo;
  let contributor1, contributor2, contributor3, contributor4;

  beforeEach(async () => {
    
    repo = new Repository(
      'SampleGitLabRepo',
      1,
      'd9428887-e9f9-4b4d-bf4f-d8d26f34a8c1',
      'https://reset.inso.tuwien.ac.at/repo/2024ws-ase-pr-group/24ws-ase-pr-qse-07',
      'gitlab',
      [],
      'glpat-sDqXSTfZsuXer5Bbzmaz'
    );

    contributor1 = new Contributor(
      null, 'e12022484@student.tuwien.ac.at', null, null
    );
    contributor2 = new Contributor(
      null, 'e12023147@student.tuwien.ac.at', null, null
    );
    contributor3 = new Contributor(
      null, 'e12019868@student.tuwien.ac.at', null, null
    );
    contributor4 = new Contributor(
      null, 'e12023172@student.tuwien.ac.at', null, null
    );    
  });

  afterEach(() => {
    sinon.restore();
    //esmock.purge('../lib/api-bridge.js');
  });

  describe('addContributors()', () => {
    it('To Repo without contibutors Should add contributors', async () => {
      repo.addContributors([contributor1, contributor2]);

      expect(repo.contributors.length).to.equal(2);
      expect(repo.contributors[0].email).to.equal(contributor1.email);
      expect(repo.contributors[1].email).to.equal(contributor2.email);
    });

    it('To Repo without duplicate contributors Should add contributors', async () => {
      repo.contributors = [contributor1, contributor2]
      
      repo.addContributors([contributor3, contributor4]);

      expect(repo.contributors.length).to.equal(4);
      expect(repo.contributors[0].email).to.equal(contributor1.email);
      expect(repo.contributors[1].email).to.equal(contributor2.email);
      expect(repo.contributors[2].email).to.equal(contributor3.email);
      expect(repo.contributors[3].email).to.equal(contributor4.email);
    });

    it('To Repo with contibutors Should add new contributors', async () => {
      repo.contributors = [contributor1, contributor2]

      const contributor_dup = new Contributor(
        "Michael Müller", contributor2.email, null, null
      );
      repo.addContributors([contributor_dup, contributor3]);

      expect(repo.contributors.length).to.equal(3);
      expect(repo.contributors[0].email).to.equal(contributor1.email);
      expect(repo.contributors[1].email).to.equal(contributor2.email);
      expect(repo.contributors[1].authorName).to.equal(contributor2.authorName);
      expect(repo.contributors[2].email).to.equal(contributor3.email);
    });

    it('To Repo without contibutors Should add first unique contributors', async () => {
      const contributor_dup = new Contributor(
        "Michael Müller", contributor1.email, null, null
      );
      repo.addContributors([contributor1, contributor_dup]);

      expect(repo.contributors.length).to.equal(1);
      expect(repo.contributors[0].email).to.equal(contributor1.email);
      expect(repo.contributors[0].authorName).to.equal(contributor1.authorName);
    });
  });
});
