import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const outDir = path.join(root, 'dist', 'web');
const EXCLUDE = new Set(['.git', 'dist', 'node_modules']);

async function copyRootEntries() {
  await mkdir(outDir, { recursive: true });
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    if (EXCLUDE.has(entry.name)) continue;
    const src = path.join(root, entry.name);
    const dst = path.join(outDir, entry.name);
    await cp(src, dst, { recursive: entry.isDirectory(), dereference: true });
  }
}

async function buildWithEsbuild() {
  const esbuild = await import('esbuild');
  const files = ['script.js', 'script-extra.js', 'script-3d.js'];
  await Promise.all(files.map((file) => esbuild.build({
    entryPoints: [path.join(root, file)],
    bundle: false,
    minify: false,
    sourcemap: false,
    format: 'iife',
    target: ['es2020'],
    outfile: path.join(outDir, file)
  })));
}

async function main() {
  await rm(path.join(root, 'dist'), { recursive: true, force: true });
  await copyRootEntries();

  try {
    await buildWithEsbuild();
    console.log('Build completado con esbuild → dist/web');
  } catch {
    console.log('esbuild no disponible; se mantiene copia estática en dist/web.');
  }

  await stat(path.join(outDir, 'index.html'));
  console.log('Salida generada en dist/web');
}

main().catch((error) => {
  console.error('Error de build:', error);
  process.exitCode = 1;
});
