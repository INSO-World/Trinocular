import { userRequestIsAuthenticated } from '../../auth-utils/index.js';

export function home(req, res) {
  res.render('home', {
    isAuthenticated: userRequestIsAuthenticated(req),
    user: req.user
  });
}
