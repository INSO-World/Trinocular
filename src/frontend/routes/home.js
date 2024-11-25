export function home(req, res) {
  res.render('home', {
    isAuthenticated: req.isAuthenticated(),
    user: req.user
  });
}
