FROM gitlab/gitlab-ce:17.3.6-ce.0

COPY ./gitlab_restore.sh /assets/gitlab_restore.sh
RUN dos2unix /assets/gitlab_restore.sh

COPY ./backups/gitlab-secrets.json /etc/gitlab/gitlab-secrets.json
COPY ./backups/gitlab.rb /etc/gitlab/gitlab.rb
