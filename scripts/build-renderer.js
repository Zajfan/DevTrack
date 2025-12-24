const esbuild = require('esbuild');
const path = require('path');

esbuild.build({
  entryPoints: ['src/renderer/main.tsx'],
  bundle: true,
  outfile: 'dist/renderer/main.js',
  platform: 'browser',
  target: 'es2020',
  loader: {
    '.tsx': 'tsx',
    '.ts': 'ts',
    '.css': 'css',
  },
  jsx: 'automatic',
  external: ['electron'],
  sourcemap: process.env.NODE_ENV === 'development',
  minify: process.env.NODE_ENV !== 'development',
}).catch(() => process.exit(1));
