import { expect } from 'chai';
import sinon from 'sinon';
import esmock from "esmock";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { CleanOptions } from 'simple-git';

import { Repository } from "../lib/repository.js";
import { initLogger } from '../../common/logger.js';


chai.use(chaiAsPromised);

describe('GitView', () => {
  let repo;
  let gitView;
  let simpleGitConstructorStub;
  let simpleGitStubs;
  let isDirectoryNotEmptyStub;

  beforeEach(async () => {
    try { await initLogger(false); } catch(e) {}

    simpleGitStubs = {
      raw: sinon.stub(),
      show: sinon.stub(),
      clone: sinon.stub()
    };

    simpleGitConstructorStub = sinon.stub().returns(simpleGitStubs);
    isDirectoryNotEmptyStub = sinon.stub();
    
    // Mock the git functions
    const { GitView } = await esmock('../lib/git-view.js', {
      'simple-git': {
        default: simpleGitConstructorStub,
        CleanOptions
      },
      '../lib/util.js': {
        isDirectoryNotEmpty: isDirectoryNotEmptyStub
      }
    });



    repo = sinon.createStubInstance(Repository, {});
    Object.assign(repo, {
      name: 'SampleGitLabRepo',
      dbId: 1,
      uuid: 'd9428887-e9f9-4b4d-bf4f-d8d26f34a9c1',
      gitUrl: 'https://reset.inso.tuwien.ac.at/repo/2024ws-ase-pr-group/24ws-ase-pr-qse-07',
      type: 'gitlab',
      contributors: [],
      authToken: 'glpat-sDqXSTfZsuXer5Bbzmaz'
    });

    gitView = new GitView(repo);
  });

  afterEach(() => {
    sinon.restore();
    esmock.purge('simple-git');
    esmock.purge('../lib/util.js');
  });
    
  describe('authenticatedRemoteUrl()', () => {
    it('Should return authenticated remote URL', async () => {
      const url = gitView.authenticatedRemoteUrl;

      expect(url).to.equal('https://dummy:glpat-sDqXSTfZsuXer5Bbzmaz@reset.inso.tuwien.ac.at/repo/2024ws-ase-pr-group/24ws-ase-pr-qse-07');
    });
  });

  describe('openOrClone()', () => {
    it('Should newly clone a repository', async () => {
      isDirectoryNotEmptyStub.resolves(false);
      simpleGitStubs.clone.resolves();

      await gitView.openOrClone();
      expect(gitView.git).to.not.equal(null);
    });

    it('Should open an existing repository', async () => {
      isDirectoryNotEmptyStub.resolves(true);

      await gitView.openOrClone();
      expect(gitView.git).to.not.equal(null);
    });
  });

  describe('getCommitHashesOfBranch()', () => {
    it('Should return commit hashes as array', async () => {

      const inputHashes = [
        "3c25ac450c9d93c549faacbc678e618aff9962eb",
        "5a582a6dfb01f495dbc2036bfd6a7d61afe53e3c",
        "ffdad151c52d12e1fa634065ddd348ffe410c4ed",
        "5ea49b7eac5be6f0d7f86b907734feeb2b1d0402"
      ]

      simpleGitStubs.raw.resolves(inputHashes.join("\n"));
      isDirectoryNotEmptyStub.resolves(true);

      await gitView.openOrClone();

      const resultHashes = await gitView.getAllCommitHashes();

      expect(resultHashes.length).to.equal(inputHashes.length);
      expect(resultHashes.every((val, i) => val === inputHashes[i])).to.be.true;
    });
  });


  describe('getCommitInfoByHash()', () => {
    const commitHash = "5a582a6dfb01f495dbc2036bfd6a7d61afe53e3c";
    const authorEmail = "matthias.preymann@student.tuwien.ac.at";

    it('Should throw error about missing header information', async () => {
      const infoString = "2\t2\tsrc/frontend/public/styles.css";

      simpleGitStubs.show.resolves(infoString);
      isDirectoryNotEmptyStub.resolves(true);
      await gitView.openOrClone();

      await expect(gitView.getCommitInfoByHash(commitHash)).to.be.rejectedWith(
        Error, `Commit show of hash ${commitHash} is missing header info (author, date)`
      );
    });

    it('Should throw error about invalid format', async () => {
      const infoString = authorEmail + "\n" +
                        "\n" +
                        "2\t2\tsrc/frontend/public/styles.css";

      simpleGitStubs.show.resolves(infoString);
      isDirectoryNotEmptyStub.resolves(true);
      await gitView.openOrClone();

      await expect(gitView.getCommitInfoByHash(commitHash)).to.be.rejectedWith(
        Error, `Commit show of hash ${commitHash} has invalid diff format`
      );   
    });

    it('Should throw error about date format', async () => {
      const infoString = authorEmail + "\n" +
                        "1734738517\n" +
                        "40baaf42\n" +
                        "\n" +
                        "2\t2\tsrc/frontend/public/styles.css";

      simpleGitStubs.show.resolves(infoString);
      isDirectoryNotEmptyStub.resolves(true);
      await gitView.openOrClone();

      await expect(gitView.getCommitInfoByHash(commitHash)).to.be.rejectedWith(
        Error, `Commit show of hash ${commitHash} has invalid date format: '1734738517'`
      );
    });
    
    it('Should throw error about invalid diff format', async () => {
      const infoString = authorEmail + "\n" +
                        "2024-12-21T00:48:37+01:00\n" +
                        "40baaf42\n" +
                        "\n" +
                        "2\tsrc/frontend/public/style.css";

      simpleGitStubs.show.resolves(infoString);
      isDirectoryNotEmptyStub.resolves(true);
      await gitView.openOrClone();
      
      await expect(gitView.getCommitInfoByHash(commitHash)).to.be.rejectedWith(
        Error, `Commit show of hash ${commitHash} has invalid diff format: 2\tsrc/frontend/public/style.css`
      );      
    });


    it('Should handle binary file', async () => {
      const infoString = authorEmail + "\n" +
                        "2024-12-21T00:48:37+01:00\n" +
                        "40baaf42\n" +
                        "\n" +
                        "-\t-\tsrc/frontend/public/temp.bin";

      simpleGitStubs.show.resolves(infoString);
      isDirectoryNotEmptyStub.resolves(true);
      await gitView.openOrClone();

      const result = await gitView.getCommitInfoByHash(commitHash);

      expect(result.hash).to.equal(commitHash);
      expect(result.authorEmail).to.equal(authorEmail);
      expect(result.isoDate).to.equal("2024-12-21T00:48:37+01:00");
      expect(result.isMergeCommit).to.be.false;
      expect(result.fileChanges[0].additionCount).to.equal(0);
      expect(result.fileChanges[0].deletionCount).to.equal(0);
      expect(result.fileChanges[0].fileName).to.equal("src/frontend/public/temp.bin");
      expect(result.fileChanges[0].isBinaryFile).to.equal(true);
    });

    it('Should handle multiple files', async () => {
      const infoString = authorEmail + "\n" +
                        "2024-12-21T00:48:37+01:00\n" +
                        "40baaf42\n" +
                        "\n" +
                        "4\t6\tsrc/frontend/public/index.html\n" +
                        "2\t2\tsrc/frontend/public/styles.css";

      simpleGitStubs.show.resolves(infoString);
      isDirectoryNotEmptyStub.resolves(true);
      await gitView.openOrClone();

      const result = await gitView.getCommitInfoByHash(commitHash);

      expect(result.hash).to.equal(commitHash);
      expect(result.authorEmail).to.equal(authorEmail);
      expect(result.isoDate).to.equal("2024-12-21T00:48:37+01:00");
      expect(result.isMergeCommit).to.be.false;
      expect(result.fileChanges[0].additionCount).to.equal(4);
      expect(result.fileChanges[0].deletionCount).to.equal(6);
      expect(result.fileChanges[0].fileName).to.equal("src/frontend/public/index.html");
      expect(result.fileChanges[0].isBinaryFile).to.equal(false);
      expect(result.fileChanges[1].additionCount).to.equal(2);
      expect(result.fileChanges[1].deletionCount).to.equal(2);
      expect(result.fileChanges[1].fileName).to.equal("src/frontend/public/styles.css");
      expect(result.fileChanges[1].isBinaryFile).to.equal(false);
    });

    it('Should mark merge commits', async () => {
      const infoString = authorEmail + "\n" +
                        "2024-12-21T00:48:37+01:00\n" +
                        "40baaf42 40baaf41\n" +
                        "\n" +
                        "2\t2\tsrc/frontend/public/styles.css";

      simpleGitStubs.show.resolves(infoString);
      isDirectoryNotEmptyStub.resolves(true);
      await gitView.openOrClone();

      const result = await gitView.getCommitInfoByHash(commitHash);

      expect(result.hash).to.equal(commitHash);
      expect(result.authorEmail).to.equal(authorEmail);
      expect(result.isoDate).to.equal("2024-12-21T00:48:37+01:00");
      expect(result.isMergeCommit).to.be.true;
      expect(result.fileChanges[0].additionCount).to.equal(2);
      expect(result.fileChanges[0].deletionCount).to.equal(2);
      expect(result.fileChanges[0].fileName).to.equal("src/frontend/public/styles.css");
      expect(result.fileChanges[0].isBinaryFile).to.equal(false);
    });
  });

  describe('getAllContributors()', () => {
    it('Should return author emails as array', async () => {
      const authorString = "112  Christoph Neubauer <e12023172@student.tuwien.ac.at>\n" +
      "116  Matthias Preymann <matthias.preymann@student.tuwien.ac.at>\n" +
      "59  Michael Trauner <e12019868@student.tuwien.ac.at>\n" +
      "6  Michael Trauner <michael.trauner120@gmail.com>\n" + 
      "102  Oliver Mayer <e12023147@student.tuwien.ac.at>\n" +
      "69  Philipp Vanek <e12022484@student.tuwien.ac.at>";

      simpleGitStubs.raw.resolves(authorString);
      isDirectoryNotEmptyStub.resolves(true);

      await gitView.openOrClone();

      const authors = await gitView.getAllContributors();
      expect(authors.length).to.equal(6);
      expect(authors[0].authorName).to.equal("Christoph Neubauer");
      expect(authors[0].email).to.equal("e12023172@student.tuwien.ac.at");
      expect(authors[1].authorName).to.equal("Matthias Preymann");
      expect(authors[1].email).to.equal("matthias.preymann@student.tuwien.ac.at");
      expect(authors[2].email).to.equal("e12019868@student.tuwien.ac.at");
      expect(authors[3].email).to.equal("michael.trauner120@gmail.com");
      expect(authors[4].email).to.equal("e12023147@student.tuwien.ac.at");
      expect(authors[5].email).to.equal("e12022484@student.tuwien.ac.at");
    })
  });

});
