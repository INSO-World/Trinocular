
# Auth Service

## Description

The auth (authentication) service handles login and logout requests of users for the
frontend. It interacts with an OpenID provider as an OpenID client. When a user wants
to login they get redirected to the auth service which then starts the OpenID login
flow by redirecting to the provider and handling the success or failure callbacks.
When the user authenticated successfully the auth service initiates a new session
which is persisted in a memcached instance, accessible by all the other publicly
reachable services. Whenever a user tries to request a secured page the frontend (or
any other service) checks if the user has an active session by performing a memcached
lookup.

In our setup we use Keycloak as the OpenID provider that manages all user data such as
username, email, password, 2FA, roles and anything else related to user management.

## Dockerfile

The auth service is a regular NodeJS service with an AlpineLinux base image.

## Startup sequence

On startup the auth service has to connect to the OpenID provider once to load the 
configuration data. Thanks to this standardized format we do not have to configure
each OpenID parameter manually, and just need a client name, password and URL for the
provider. However, as Keycloak needs some time to startup, and itself has to wait for
the PostgreSQL database to be present first, we might need to wait some time.
Therefore we initially poll the provider with a few seconds of wait time until it 
becomes responsive and we can request the configuration data. The polling acts only
as a basic health check.

For actually loading the configuration data we rely on the `Issuer.discover()` function
provided by the OpenID client library. To manage and test sessions we use the passport
library with an extension for persistence via memcached.

## Authentication flow

We rely on the OpenID connect protocol to handle the authentication flow between 
Trinocular and the authentication provider. This protocol is standardized an we
will not go into any further detail on it, instead the following lays out how
other services (mostly the frontend) interact with the auth service when a user
tries to perform a login or logout.

__Login:__ When a user clicks the "Login" link on the webpage they get directed to
`http://auth/login` where then the passport library takes over to initiate the 
authentication flow. This results in the user being redirected to the OpenID provider's
page where they have to login (with just username and password, or including 2FA or 
email verification). When the login process is finished (success or failed) the
provider directs the user back to the auth service on the `http://auth/login/callback`
route, where again passport handles the OpenID data sent over by the provider.

Depending on whether the login was a success or a failure (eg. user entered their
password wrong for too many times) passport performs one final redirect either to
the success or error page on the frontend. At the same time successfully logged in
users receive a session cookie which coupled to a session entry in the memcached
in-memory key-value-store.

__Logout:__ When a user clicks the "Logout" link on the webpage they get directed to
`http://auth/logout` where they get redirected to the providers end-session page.
The provider then destroys the login session on its end and send the user back to
the auth service on `http://auth/logout/callback`. There the auth service destroys
the session by deleting the user's cookie and clearing the memcached entry. Then
the user is finally sent back to the frontend's publicly available homepage.

## Tutorials

### How to secure a service's endpoints

To secure APIs and webpages of the application we rely on two mechanisms. For webpages
which should only be accessible by users who are currently logged in we check whether
they have an active session created by the auth service. On the other hand for any
internal endpoints that need to be accessed by other services we make use of a different
scheme. Here we check whether the request includes a secret bearer token that is
unknown to any outsiders including users.

To secure such an API endpoint just add the `internalApi` middleware to the specific
route and make sure the `INTERNAL_API_SECRET` is loaded into the environment by
setting `INTERNAL_API_SECRET_FILE` in the env file. The required functions are provided
by the common library. Unauthenticated requests are failed with status 401.

```js
routes.get('/repository', internalApi, getRepositories);
```

For webpages that need to be reachable by users after logging in, the endpoint needs
to include the `protectedPage` middleware provided by the auth-utils library. Additionally
to prefixing individual routes all routes need to be sent through the `sessionAuthentication()`
middleware, which handles session checks and loads user data. In the env file the
`SESSION_SECRET_FILE` and `MEMCACHED_HOST` fields need to be set as well. Furthermore, 
passport's serialization handlers need to be provided. In case an unauthenticated request
is encountered on a protected route, it will be redirected to the URL set in the
`unauthenticated redirected` setting of the express app object.

When instead the endpoint should act like an API, use `protectedApi` which returns status
401 for authentication failures and does not redirect.

```js
const app = express();
const server= http.createServer(app);

// Set URL to redirect to in case of unauthenticated request
app.set('unauthenticated redirect', '/');

// Add the session authentication middleware
app.use( sessionAuthentication() );

// Default user data serialization/deserialization
passport.serializeUser( (user, done) => done(null, user) );
passport.deserializeUser( (user, done) => done(null, user) );

// Setup protected page handler
app.get('/repos', protectedPage, repos);
```

A service can make use of both API- and login-secured pages. However, a single endpoint
may only use `internalApi` or `protectedPage`, as else one of them would always fail
and disallow the request from passing through. In cases where this functionality is needed
make use of the `protectedOrInternal` middleware which allows for both kinds of
authentication. This can come in handy, when a service is publicly reachable, but only
features secured pages/endpoints. Then all routes can be piped through this middleware
on the express app object.


## Endpoints

The auth service has public and protected endpoints.

### (Public) `GET` /login

Starts the login flow for a user by redirecting them to the OpenID provider.

### (Public) `GET` /login/callback

Callback endpoint for the OpenID provider, where the user gets directed back
to after the login attempt. Needs query parameters, headers and body as
required by the OpenID connect protocol.

On success we setup the session on our end by creating session cookies and a
memcached entry. Then we redirect the user back to the frontend as set by
the `LOGIN_URL`. In case of an error we send the user to the `ERROR_URL` with
the `login_error` query parameter set.

### (Public) `GET` /logout

Redirects the user to the OpenID provider to have the session destroyed.

### (Public) `GET` /logout/callback

Callback endpoint for the OpenID provider when it is done with destroying the
user's session on its end. Here we also destroy the user's session on our
end by clearing cookies and the memcached entry.


On success we then redirect the user back to the frontend as set by the
`LOGOUT_URL`. In case of an error we send the user to the `ERROR_URL` with
the `logout_error` query parameter set.

### (Login) `GET` /protected

This is a login protected page for testing purposes.

### (Public) `GET` /unprotected

This is a public (unprotected) page for testing purposes.

### (Public) `GET` /test

This is a public (unprotected) page for testing purposes which returns
a message showing whether the request was authenticated or not.
