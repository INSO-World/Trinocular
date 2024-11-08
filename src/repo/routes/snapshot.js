import {getRepositoryByUuid} from '../lib/database.js';
import Joi from 'joi';
import {repositories} from "../lib/repository.js";

const uuidValidator = Joi.string().uuid();

export async function postSnapshot(req, res ) {

    const uuid = req.params.uuid;
    const {value, error}= uuidValidator.validate( uuid );
    if( error ) {
        console.log('Post Snapshot: Validation error', error);
        return res.status( 422 ).send( error.details || 'Validation error' );
    }

    let repository = repositories.get(value); // check if the repo is currently cached
    try {
        if(!repository){
            repository = await getRepositoryByUuid(value);
        }
    } catch ( error ) {
        return res.status( 404 ).end( error.details );
    }

    // TODO use real auth token
    await repository.loadAuthToken();
    try {
        const gitView = await repository.loadGitView(); // clones or opens the repo
        await gitView.git.fetch(['--all']);
        const branches = await gitView.git.branch(['-a'])   // get list of all branch names

        for(let branch of branches.all){
            console.log(`checkout & pull ${branch}`);
            // sanitize branch names so that they can be pulled by simple-git
            if(branch.startsWith('origin/')){
                branch = branch.replace('origin/','');
            } else if (branch.startsWith('remotes/origin/')){
                branch.replace('remotes/origin/', '');
            }
            await gitView.git.checkout(branch);

            // TODO fetch  commits of branches here
            await gitView.git.pull();
        }
        console.log('Pulled all branches successfully');
    } catch ( error ) {
        console.log('Repository could not be pulled')
        //TODO status code?
        return res.status( 500 ).end( error.details );
    }

    return res.sendStatus(201);
  
  // git pullAllBranches

  // for each branch
  //    get commit hashes from db (with index) for this branch
  //    Check which commits are new
  //    get new commits from git (contributor, diff, ...)
  //    insert commit data if not exists (file, contributor, ...) into db
  //    insert commit changes into db
  //    insert commits into db
  //    update the commit list for the branch (relink old commits and add the new ones)
  //    
  

  // Do blame stuff?

  // Done?
}
