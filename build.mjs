// Build: bundle src/ into dist/ (used for web release and Capacitor www)
import * as esbuild from 'esbuild';
import { mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync } from 'fs';

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist/css', { recursive: true });

await esbuild.build({
  entryPoints: ['src/main.js'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020'],
  outfile: 'dist/game.js',
  charset: 'utf8',
});

copyFileSync('css/style.css', 'dist/css/style.css');

let html = readFileSync('index.html', 'utf8');
html = html.replace('<script type="module" src="src/main.js"></script>', '<script src="game.js"></script>');
writeFileSync('dist/index.html', html);

// Fully self-contained single-file version (open directly, no server needed)
const css = readFileSync('css/style.css', 'utf8');
const js = readFileSync('dist/game.js', 'utf8');
let single = readFileSync('index.html', 'utf8')
  .replace('<link rel="stylesheet" href="css/style.css">', '<style>\n' + css + '\n</style>')
  .replace('<script type="module" src="src/main.js"></script>', '<script>\n' + js + '\n</script>');
writeFileSync('dist/anathema-standalone.html', single);

console.log('build done → dist/');
