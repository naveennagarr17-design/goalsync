// GitHub Pages only serves real files. Copying index.html to 404.html lets the
// app handle direct links such as /history or /reset-password after a refresh.
import { copyFileSync, existsSync } from 'node:fs';
if (existsSync('dist/index.html')) {
  copyFileSync('dist/index.html', 'dist/404.html');
  console.log('Created dist/404.html for single-page-app routing');
}
