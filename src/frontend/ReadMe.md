
# Frontend

## Description

This service delivers the frontend of the Trinocular application. It is the main point for user 
interaction, where the different repositories are listed, new ones can be added and the visualization
dashboard is shown. This service also functions as a proxy for the different visualization services 
that hook into our system.

## Dockerfile

The frontend service is a standard Node.js application built on an Alpine Linux base image. No additional
volumes or such are needed.

## DB Structure

The frontend service saves only minimal needed data in the tables:
* user
* repository
* repository_settings

For more details, check the [schema](./scripts/schema.sql).
Other data, e.g. the authentication token of a repository are requested from the corresponding
service where needed.

## HTML Generation

The frontend service  utilizes server-side rendering with Handlebars (.hbs) templates. 
It dynamically renders HTML on the server, ensuring faster initial load times and a responsive experience.
These handlebars can be the full page, or only partials, like error boxes. The pages are rendered via
`res.render()` where the corresponding template is given. 
Consider the dashboard view with `dashboard.hbs`; the needed data to fill out the template is given as object.
```js
res.render('dashboard', {
    visualizations: visArray,
    defaultVisualization,
    repoUuid,
    repoName,
    scriptSource: '/static/dashboard.js'
  });
```

## Endpoints

Apart from the landing and authentication error page, all pages that a user may access
are login protected. They are marked with `(Login)`. The endpoints only open to our internal API are
marked with `(API).

### (Public) `GET` /

The landing page of Trinocular. If no user is logged in, there is only a link to the login page,
if logged in, the user can navigate to the repository list or log out.

### (Public) `GET` /auth-error

If anything goes wrong during authentication, the user is redirect to this page. This is only 
informational.

### (Public) `GET` /login
### (Public) `GET` /logout

The login/logout page is simply redirected to `/auth/login` and `/auth/logout` respectively.
For further information on Login/Logout check the Readme of the Authentication service.

### (Login) `GET` /repos

This page displays all the currently saved repositories in Trinocular. They are grouped into
* favorite
  * on a per-user basis
* active
  * system-wide, the repository is still worked on
* inactive
  * system-wide, the repository is mostly historical

### (Login) `GET` /repos/new

This page displays the form to create a new repository on the system.

### (Login) `POST` /repos/new

Create a new repository on the system based on the given JSON body. As type, only *GitLab* can be chosen,
other types like GitHub are not supported. After creating the repository in this service, requests 
are sent to the API & Repo service to create it there and a first snapshot is scheduled immediately.

JSON Body:
```json
{
  "name": "nameSpecifiedByUser",
  "url": "urlToTheRepository",
  "authToken": "projectAuthenticationToken",
  "type": "gitlab"
}
```

### (Login) `GET` /dashboard/:repoUuid

The visualization dashboard of the selected (`repoUuid`) repository is shown. On the left side, 
a control panel, where e.g. one of the different registered visualizations can be selected. Right of 
that, the visualization is displayed.

Path parameters:
*`repoUuid` UUID of the repository

### (Login) `GET` /dashboard/:repoUuid/settings

This page displays the current settings of the repository, where they can then get adapted. 
Adjustable settings are:
* Name of the repository
* Active/Inactive
* Color (how the repository is shown in the repository list)
* Repository URL
* Authentication Token
* Type (=`gitlab`)

Path parameters:
* `repoUuid` UUID of the repository

### (Login) `POST` /dashboard/:repoUuid/settings

Here the settings of the specified repository can be adjusted with values given as JSON Body:
```json
{
  "isFavorite": "on",
  "isActive": "on",
  "repoColor": "424242",
  "repoName": "ASE Project",
  "repoURL": "http://inso.tuwien.ac.at/repo/QSE07",
  "repoAuthToken": "real-authentication-token",
  "repoType": "gitlab"
}
```
The fields `isFavorite` and `isActive` are either specified as`'on'` or `''`, since they are checkboxes
in the settings form. 

Path parameters:
* `repoUuid` UUID of the repository

### (Login) `GET` /wait/:repoUuid
This waiting page is called when a new repository is added. It shows the progress of the data extraction; 
How many steps are there, what is still missing and so on, so that the user has a live feedback on
the data mining progression. After all updates are done, the user is automatically redirected to the 
dashboard of the specified repository.

Path parameters:
* `repoUuid` UUID of the repository

### (Login) `GET` /wait/:repoUuid/update

This endpoint is periodically (~2s) called by the browser to keep the waiting page above up-to-date.
The running tasks are checked which ones are still running and the html is updated accordingly.

Path parameters:
* `repoUuid` UUID of the repository

### (Login) `GET` /db-viewer

This page exists for testing and debugging reasons, and it shows a dump of all tables of this service.
This page can only be accessed if the corresponding [environment variable](./.env) `ENABLE_DB_VIEWER` 
is set. 

### (API) `POST` /api/notify/vis

After startup, the frontend service fetches the currently available visualizations from the registry.

### (API) `POST` /api/notify/import

This endpoint is used as a callback for the scheduler service. When a scheduled import/update task is 
finished, the scheduler informs the frontend service.

## Classes

### `Visualization`
```js
/**
 * Constructor
* @param {string} id
* @param {string} name
* @param {string} hostname      // ostname of the visualization service
* @param {string} displayName   // the visualization name that is shown to the user
* @param {string} framePath     // path where the iframe on the dashboard navigates to
  */
```
