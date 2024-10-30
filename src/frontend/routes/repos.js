import { getUserRepoList, ensureUser } from '../lib/database.js';


export function repos(req, res) {
  const userUuid= req.user.sub;

  ensureUser( userUuid );
  const repos= getUserRepoList( userUuid );

  console.log('Repos', repos);

  const favoriteRepos= repos.filter( repo => repo.is_favorite );
  const activeRepos= repos.filter( repo => repo.is_active && !repo.is_favorite );
  const inactiveRepos= repos.filter( repo => !repo.is_active && !repo.is_favorite );

  res.render('repos', {favoriteRepos, activeRepos, inactiveRepos, user: req.user});
}

