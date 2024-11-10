import Joi from 'joi';
import {repositories} from "../lib/repository.js";
import { getAllCommitHashes } from '../lib/database.js';

const uuidValidator = Joi.string().uuid();

export async function postSnapshot(req, res) {

    // TODO: Check for scheduler transaction Id (for callback)

    const uuid = req.params.uuid;
    const {value, error}= uuidValidator.validate( uuid );
    if( error ) {
        console.log('Post Snapshot: Validation error', error);
        return res.status( 422 ).send( error.details || 'Validation error' );
    }

    const repository = repositories.get(value); // check if the repo is currently cached
    if(!repository) {
        return res.status( 404 ).send( 'No such repository with uuid: ' + value );
    }

    // End Handler before doing time-expensive tasks
    res.sendStatus(200);

    // Clone or Open the repository
    const gitView = await repository.loadGitView(); 
    
    await gitView.pullAllBranches();

    await updateCommits(gitView, repository);

  // Do blame stuff?

  // Done?

  // TODO: Callback to scheduler
}


async function updateCommits(gitView, repository) {
    // Retrieve all commits hashes from all branches
    const currentHashes = await gitView.getAllCommitHashes();
    
    // Get old commit hashes from DB
    const oldHashes = await getAllCommitHashes(repository);

    // Items in currentHashes that are not in oldHashes
    const newHashes = currentHashes.filter(hash => !oldHashes.has(hash));

    // Fetch additional Info of newHashes
    const commitInfos = await Promise.all( newHashes.map( hash => gitView.getCommitInfoByHash(hash)) )
    
    // TODO: Save new commits + info to DB
}
