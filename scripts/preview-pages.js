const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const basePath = '/habit-tracker';
const distPath = path.join(__dirname, '..', 'dist');
const port = Number(process.env.PORT ?? 8081);

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
};

function toFilePath(urlPath) {
  let pathname = decodeURIComponent(urlPath);

  if (pathname === '/') {
    return null;
  }

  if (!pathname.startsWith(basePath)) {
    return null;
  }

  pathname = pathname.slice(basePath.length) || '/';

  if (pathname.endsWith('/')) {
    pathname += 'index.html';
  }

  const filePath = path.normalize(path.join(distPath, pathname));
  return filePath.startsWith(distPath) ? filePath : null;
}

function sendFile(response, filePath, statusCode = 200) {
  const extension = path.extname(filePath);
  response.writeHead(statusCode, {
    'Content-Type': mimeTypes[extension] ?? 'application/octet-stream',
  });
  fs.createReadStream(filePath).pipe(response);
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host}`);
  const filePath = toFilePath(requestUrl.pathname);

  if (requestUrl.pathname === '/') {
    response.writeHead(302, { Location: `${basePath}/` });
    response.end();
    return;
  }

  if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    sendFile(response, filePath);
    return;
  }

  sendFile(response, path.join(distPath, '404.html'), 404);
});

server.listen(port, () => {
  console.log(`GitHub Pages preview running at http://localhost:${port}${basePath}/`);
});
