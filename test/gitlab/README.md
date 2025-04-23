# GitLab Test Instance

## General Information
The GitLab test instance is a standalone container with gitlab running in it.
At the startup of the docker container the bash script `gitlab_restore.sh` is called that loads a GitLab backup file to fill the GitLab instance with test data.

The backup file must be placed into a specific directory on the container before loading it. The location is `var/opt/gitlab/backups`
The backup file name must end with `_gitlab_backup.tar`.

The backup file and location can be specified in the `docker-compose.yml` file
If no backup file is specified, the loading script exits without doing anything.



## Setup

Steps for starting the test instance:
1. `docker compose build`
2. `docker compose up`

To start the test instance it is not necessary to delete the container and volumes every time.

We have to build a custom docker image, as we need to load the `gitlab_restore.sh` into the location `/assets/` of the container



## Create a Backup

Steps for creating a backup of a GitLab instance:
1. Setup and start an empty GitLab instance on your machine
   1. Delete the already existing test instance container and its related volumes
   2. Comment out the `IMPORT_BACKUP_FILE` variable in the `/gitlab/.env` file (so that no backup is loaded on startup)
   3. Run the `docker-compose.yml` file in the `test` directory
2. Wait until the GitLab instance is available under `http://localhost:9080/`
3. Login with the default credentials
   1. Username: `root`
   2. Password: `gutes_passwort`
4. Setup the test instace however you want (create Issues, add commits, ...)
5. Execute `gitlab-backup create` in a terminal of the docker container (e.g. in the Docker Desktop Exec UI)
6. Download the backup file onto your machine and rename it. The file is located in the container under `/var/opt/gitlab/backups`. You can dowload the file easily via the Docker Desktop File UI.



# Script Structure of gitlab_restore.sh
The `gitlab_restore.sh` script is used to fill a GitLab test instance with testdata by loading a pre-specified GitLab backup file.

The script is started by defining a custom entrypoint for the service in the `docker-compose.yml` file. The entrypoint start the `gitlab_restore.sh` script in the background before continuing with the standard GitLab startup file.

The script itself first copies the backup-file from its mount location in the docker container to a specific directory (`/var/opt/gitlab/backups`) where the GitLab instance expects it. Then the script waits until the `Login Page` of the GitLab instance is responsive, which basically means that the instance is up and running. Afterwards the main command to load the GitLab backup is executed.  
