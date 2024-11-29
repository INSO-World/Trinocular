// TODO: Fetch data from service local database here, and tailor them finally for the visualization (main work should lie on the database query)

import {getDatasourceForRepositoryFromApiBridge} from "../lib/requests.js";

export async function perIssue(req, res) {
    // TODO Get data from local storage instead of direct call to API service with hardcoded repository
    console.log(req);
    const responseData = await getDatasourceForRepositoryFromApiBridge('issues', '4b75a39f-1764-40bc-ada5-1e95b27d861d');
    res.json(responseData);
}
