import { visualizationHostnames } from './visualizations.js';

// Create a middleware that proxies any requests with a path of the form
// /vis/<name>/... where the request is transformed to use the <name> as
// hostname. Only known hostnames of registered visualizations are accepted.
export function visualizationProxy(proxyServer) {
  return function (req, res, next) {
    // Only proxy URLs of the form http://frontend/vis/<name>/.../path
    const basePath = '/vis/';
    if (!req.path.startsWith(basePath)) {
      next();
      return;
    }

    // Extract the name of the targeted visualization
    const start = req.url.indexOf(basePath) + basePath.length;
    const end = req.url.indexOf('/', start);
    const hostname = req.url.substring(start, end > start ? end : req.url.length);

    // Bail with 404 status if the hostname does not exist
    if (!visualizationHostnames.has(hostname)) {
      res.sendStatus(404);
      return;
    }

    // Re-target the URL before proxying to the visualization hostname
    const target = 'http://' + hostname;
    req.url = end > start ? req.url.substring(end) : '/';

    console.log('Proxying to vis:', target + req.url);

    proxyServer.web(req, res, { target }, error => console.error('Proxy error:', error));
  };
}
