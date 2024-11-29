// TODO: Fetch data from service local database here, and tailor them finally for the visualization (main work should lie on the database query)

import {getDatasourceForRepositoryFromApiBridge} from "../lib/requests.js";

export async function perIssue(req, res) {
    // TODO Validate req.query.repo
    const responseData = await getDatasourceForRepositoryFromApiBridge('issues', req.query.repo);
    res.json(responseData);
}
