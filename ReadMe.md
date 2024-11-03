
# Trinocular

## Setup
Follow the steps below to setup the project on your machine for development.
You only need to do this once.

1. Pull the repo from GitLab
2. Take a look at the `secrets` section of the `docker-compose.yml`. You need to create each text file
   and fill it with a secret string. Make sure not to include any whitespace (including newlines) when
   saving the file if your editor has autoformatting configured. For more details check out the ReadMe
   in the secrets directory.
3. In the base directory of the repo run `docker-compose build`. This will take quite some time, do
   not be alarmed when the build hangs at `[repo] RUN npm install` for 10+ minutes. This only happens
   during the first install.
4. In the base directory of the repo run `docker-compose up`. Now the project should start up for the 
   first time. For now it should not matter if some errors get printed. Check that the nginx, postgres
   and keycloak services started up and are healthy.
5. Setup keycloak by creating a new realm with a user and client.
   1. Navigate to the admin login page under `localhost:8080/keycloak`.
   2. Login as `admin` using the `keycloak_admin_secret`.
   3. Create new realm (Button inside the drop down left top) and name it "trinocular"
   4. Select the "trinocular" realm in the drop down
   5. Create new user in the "trinocular" realm with username, email, firstname, lastname. Also set
      "email verified" to true.
   6. Select the credentials tab of the new user
   7.  Set Password a new password. Deselect the "temporary" option!
   8.  Create new client in the "trinocular" realm and name it "trinocular_client". Then go to "next".
   9.  In the capability config of the client check the "Standard flow" checkbox. Then go to "next".
   10. In the login settings of the client set the valid redirect URI to "http://localhost:8080/auth/*". Safe the client.
   11. Logout.
   12. Keycloak should show the OIDC information as JSON under `http://localhost:8080/realms/trinocular/.well-known/openid-configuration`
6.  Hit `Ctrl-C` and wait for everything to shutdown. This should only take a few seconds.
7.  Start the system again with `docker compose up`. Now, no errors should be visible in the log.
8.  Navigate to `http://localhost:8080` and click `login`. You should now be able to login via keycloak.
9.  To gain better editor support for eg. types and autocomplete, install the node dependencies for the
   services. Run `npm i` (or better `pnpm i`) in each service directory that has a `package.json`.

## Commit namespace
Each commit summary must be prefixed with a namespace, to make it easy
to see what part of the system was changed. Below are a few examples.

```
Doc: Added section about commits in the ReadMe

Postgres: Added a health check

Docker: Moved secret files to '/secrets'

Fronted: Prevent the navbar from overflowing on mobile

Test: Added GitLab test container
```

The following namespaces exist for general parts of the project:
- Doc: Anything related to documentation and non source files used for description of the project.
- Docker: Anything related to containerization, that is not specific to a certain container or container internals.
- Test: Anything related to testing and the CI pipeline

Each service has its own commit namespace:
- Nginx
- Keycloak
- Memcached
- Postgres
- Auth
- Frontend
- Registry
- API-Bridge
- Repo

Visualization services have their name as the commit namespace.
- Demo: The demo visualization service.

## Services

- __nginx:__ Proxy server that routes incoming web requests to the respective service based on the
  request path.

- __keycloak:__ O-Auth provider that handles user authentication and initiates user sessions. It allows
  users to login and handles everything related to security. It also allows for user management, 
  verification and roles.

- __memcached:__ Simple in-memory key-value-store database. It stores all active user sessions and 
  makes it possible for other servives to check whether a request is authenticated.

- __postgres:__ Relational SQL database.

- __auth:__ Authentication service that handles the communication with the O-Auth provider and creates
  user sessions.

- __frontend:__ Delivers the frontend website to the browser. Communicates and proxies requests to the
  visualization services that hook into the system.

- __registry:__ Acts as a simple notification service based on HTTP pub/sub. Services can register 
  themselves and advertise their abilities with additional data fields. Visualizations use the registry
  to add themselves to the system on startup, while the frontend listens for notifications.

- __api-bridge:__ Creates snapshots of the data imported via the GitLab API and provides it to the
  visualization services.

- __repo:__ Creates snapshots of the Git repository by importing commit data from all branches into
  the PostgreSQL database. Has some quirks due to `nodegit` which are described below.

## JS service libs

Common code that is shared across multiple services is factored out into libraries/node modules that
get installed into to the service images as part of the docker build process. The modules are next to
the services in the `/src` directory and are referred to via relative paths when importing.

- __common:__ Contains code common to most services.
- __auth-utils:__ Contains the user sessions authentication middleware and useful functions related
  to authentication.
- __postgres-utils:__ Contains the basic common code to connect to a PostgreSQL database. Offers 
  functionality for creating databases and initializing them with a SQL script file.
- __nodegit-helper:__ Just a wrapper for the `nodegit` module which is a pain to install. By being its
  own module we can build and install it separately in the `Dockerfile` and can ensure no one touches
  the npm config files.

## Environment Files

Configuration constants are provided to the services via environment variables that get injected into
the container on startup. Do not rely on the `.env` files being copied into the container image.
Instead specify a service's environment in the `docker-compose.yml` and let docker inject the variables.

## Secrets

While most constants needed for configuration are provided via environment variables that are defined in
`.env` files, secrets such as passwords or encryption keys are stored elsewhere. Each secret is stored
in its own text file (with `.txt` file extension!) in the `/secrets` directory. In the `docker-compose.yml`
the secrets are listed and named, so that each service container can specify which secrets it needs.
The secrets get mounted as files into the `/run/secrets` directory of each service on startup, where
they can read them.

In case of a NodeJS service, use the `readSecretEnv()` function provided by the `common` module, to
automatically load secrets into Node's copy of the environment variables (`process.env`). It works
by looking through all keys of `process.env` and loading the file contents for all vars that end
with `SECRET_FILE` and point to a file inside `/run/secrets`.

```Shell
# This loads the contents of '/run/secrets/session_secret' into 
# a variable called 'SESSION_SECRET'
SESSION_SECRET_FILE= /run/secrets/session_secret

# Ignored: Does not end with 'SECRET_FILE'
MY_RANDOM_VAR= "hello world"

# Ignored: Does not point to a file in '/run/secrets'
MY_SECRET_FILE= /some/random/path
```


## Setting `NODE_ENV`

Some NodeJS libraries check the `NODE_ENV` environment to behave differently whether
they run in development or production mode. This is [bad and should be avoided][node_env].
In the `docker-compose.yml` file NodeJS services have their environment always set to
"production". If you need to do some extensive debugging with additional error messages from
eg. handlebars, you can temporarily change it back to "development". But do not commit
this change.


## Architecture

![Service Architecture](assets/architecture.svg)


## Database Inspection

To inspect the data stored in the databases of the system, different methods exist depending
on the database in question.

### Frontend Service

The frontend service hosts its own local SQLite instance and a special webpage that dumps the
contents of the database. You first need to enable the db viewer page via an environment variable
in the `.env` file as shown below. Then navigate to `localhost:8080/db-viewer` after logging in.
Up to 100 rows for each table get displayed as separate tables.

```Shell
ENABLE_DB_VIEWER= true
```

### API-Bridge Service & Repository Service

To connect to the PostgreSQL instance used by the repository service, you need to use a DB viewer 
application such as [DBeaver][dbeaver]. The default port is mapped in the `docker-compose.yml`. Use
the following connection parameters on your local machine.

- Host: `localhost:5432`
- User: `trinocular_db_user`
- Passsword: The value you set in the `/secrets/postgres.txt` file
- Make sure to enable 'Show all databases'


## Quirks of the Repository Service
The repository service is a little special compared to the other NodeJS base services in this project. It
requires the `nodegit` library to interact with git repositories. The library is a wrapper for libgit2
and provides JS bindings to the git backend without the need to interface through the CLI.

`nodegit` contains C code to bind with libgit2 and thus makes use of NodeJS native bindings interface.
Therefore when installing it via npm it automatically gets built via the node gyp toolchain. However, this
requires a bunch of additional software to be present in the container such as Python, a C++ toolchain, and
some other stuff. As we could not get it working on the node:alpine image even with installing the missing
dependencies, we decided to switch to the full-blown node:bookworm image based on Debian. Unfortunately,
this image is considerable larger.

Furthermore when building the repository service container image for the first time, installing `nodegit`
via `npm` triggers the build process which is very slow compared to all other steps. It often takes more
than 10 minutes. For this reason, we move `nodegit` into its own wrapper module to that gets processed in
the `Dockerfile` as a separate layer, similarly to the `common` module. There it is the very first layer,
so that the number of needed rebuilds is mostly eliminated.

Another source of strangeness we observed is that `npm` does not behave correctly when installing modules
via a `package.json` alone. Without a lock file present (`package-lock.json`) it just hangs indefinitely 
without producing an error. Hence, when adding/removing any libraries from the repo service, or any module
used by the repo service make sure to keep the lock file up to date, especially if you are using an alternative
package manager such as yarn or pnpm.


[node_env]: https://nodejs.org/en/learn/getting-started/nodejs-the-difference-between-development-and-production
[dbeaver]: https://dbeaver.io/



