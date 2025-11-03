import { userRequestIsAuthenticated } from '../../auth-utils/index.js';

// Protected route
export function getProtectedRoute(req, res) {
  res.end('This route is protected');
}

// Unprotected route
export function getUnprotectedRoute(req, res) {
  res.end('This route is unprotected');
}

export function getTestRoute(req, res) {
  res.end(
    `Session is authenticated: ${req.isAuthenticated() ? 'yes' : 'no'}\n`+
    `Session has accepted user: ${userRequestIsAuthenticated(req) ? 'yes' : 'no'}`
  );
}
