
export function getSettingsPage(req, res) {
  const repoUuid= req.params.repoUuid;

  const repo= {
    uuid: repoUuid,
    isFavorite: false,
    color: 'gree',
    name: `repo-${repoUuid}`,
    isActive: true,
    url: 'https://www.gitlab.com',
    authToken: 'abcdefg',
    type: 'gitlab',

    get isGitLab() { return this.type === 'gitlab' }
  };

  res.render('settings', {
    user: req.user,
    repo,
  });
}

export function postSettings(req, res) {
  res.sendStatus(200);
}
