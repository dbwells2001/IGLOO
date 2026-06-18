// Inlines the dist-single/ build (single IIFE bundle + one CSS file, fonts
// already base64) into one self-contained igloo-standalone.html that runs from
// file://. Run after `vite build --config vite.singlefile.config.js`.
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const dir = 'dist-single';
let html = readFileSync(join(dir, 'index.html'), 'utf8');

html = html.replace(/<script[^>]*src="([^"]+)"[^>]*><\/script>/g, (_m, src) => {
  const code = readFileSync(join(dir, src.replace(/^\.?\//, '')), 'utf8');
  return `<script>\n${code}\n</script>`;
});

html = html.replace(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (_m, href) => {
  const css = readFileSync(join(dir, href.replace(/^\.?\//, '')), 'utf8');
  return `<style>\n${css}\n</style>`;
});

writeFileSync('igloo-standalone.html', html);
console.log('wrote igloo-standalone.html', (html.length / 1024 / 1024).toFixed(2), 'MB');
