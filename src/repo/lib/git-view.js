
/** @typedef {import('./repository.js').Repository} Repository */


export class GitView {
  /**
   * @param {Repository} repo 
   */
  constructor( repo ) {
    this.repository= repo;
    this.git= null;
  }

  get repoPath() {
    return `/var/repo/${this.repository.uuid}`;
  }

  async openOrClone() {
    if( !this.repository.authToken ) {
      throw new Error('Repository did not load auth token yet. Cannot connect to git.');
    }

    // fs stat -> check if repoPath directory exists
    // yes -> git open
    // no -> git clone
  }

  async pull() {

  }

  async _walkCommitsOfBranch( branchName, commitFunction ) {

    // Lookup the branch reference
    const branchRef = await repo.getBranch(branchName);

    // Get the commit pointed to by the branch
    const firstCommit = await repo.getCommit(branchRef.target());

    // Walk through the history of the branch
    const history = firstCommit.history();

    return new Promise((res, rej) => {
      history.on("commit", commit => commitFunction(commit, history) );
      history.on('end', () => res() );
      history.on('error', rej );

      history.start();
    });
  }

  async loadAllCommitHashList( branchName ) {

    // Get full branch name for ref?

    // Collect commit hashes into a list
    await this._walkCommitsOfBranch( 'kek', commit => {} );

    // 

  }

  async end() {
    await this.git.cleanup();
    this.git= null;
  }
}
