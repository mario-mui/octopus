// Minimal static file server with CORS + SPA fallback, used to serve the
// host and remote dist bundles for the Module Federation e2e check.
const http = require('http');
const fs = require('fs');
const path = require('path');

const dir = path.resolve(process.argv[2]);
const port = Number(process.argv[3]);

const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.map': 'application/json',
};

http
  .createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    let filePath = path.join(dir, urlPath);
    if (urlPath === '/' || !path.extname(filePath)) {
      const candidate = path.join(dir, urlPath);
      filePath = fs.existsSync(candidate) && fs.statSync(candidate).isFile()
        ? candidate
        : path.join(dir, 'index.html');
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }
      res.setHeader('Content-Type', types[path.extname(filePath)] || 'application/octet-stream');
      res.end(data);
    });
  })
  .listen(port, () => console.log(`serving ${dir} on http://localhost:${port}`));
