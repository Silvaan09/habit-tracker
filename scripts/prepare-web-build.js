const fs = require('node:fs');
const path = require('node:path');

const distPath = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distPath, 'index.html');
const notFoundPath = path.join(distPath, '404.html');
const noJekyllPath = path.join(distPath, '.nojekyll');

if (!fs.existsSync(indexPath)) {
  throw new Error('Expected dist/index.html to exist after exporting the web app.');
}

fs.copyFileSync(indexPath, notFoundPath);
fs.closeSync(fs.openSync(noJekyllPath, 'a'));

console.log('Prepared GitHub Pages fallback files in dist.');
