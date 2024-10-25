

export function repos(req, res) {
  const repos= [
    {color: '#aa2222', uuid: 'abcd1', name: 'Cooles repo', active: true, favorite: false},
    {color: '#734444', uuid: 'abcd2', name: 'Another repo', active: true, favorite: true},
    {color: '#1177cc', uuid: 'abcd3', name: 'Different repo', active: false, favorite: true},
    {color: '#44ff13', uuid: 'abcd4', name: 'Foo repo', active: false, favorite: false},
    {color: '#3366cc', uuid: 'abcd5', name: 'Bar repo', active: true, favorite: true},
    {color: '#999966', uuid: 'abcd6', name: 'Bazz repo', active: true, favorite: false},
  ];

  const favoriteRepos= repos.filter( repo => repo.active && repo.favorite );
  const activeRepos= repos.filter( repo => repo.active && !repo.favorite );
  const inactiveRepos= repos.filter( repo => !repo.active );

  res.render('repos', {favoriteRepos, activeRepos, inactiveRepos, user: req.user});
}

