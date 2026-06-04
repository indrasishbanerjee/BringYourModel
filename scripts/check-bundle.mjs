import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const MAX_GZIP_BYTES = 18 * 1024;
const bundleRelativePath = join('packages', 'sdk', 'dist', 'byom.iife.min.js');

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const bundlePath = join(repoRoot, bundleRelativePath);

if (!existsSync(bundlePath)) {
  console.error(`Missing bundle: ${bundleRelativePath}`);
  console.error('Run `pnpm --filter @byomsdk/sdk build` first.');
  process.exit(1);
}

const source = readFileSync(bundlePath);
const rawBytes = source.byteLength;
const gzipBytes = gzipSync(source).byteLength;

console.log(`Bundle: ${bundleRelativePath}`);
console.log(`Raw: ${rawBytes} bytes`);
console.log(`Gzip: ${gzipBytes} bytes (limit ${MAX_GZIP_BYTES} bytes / 18KB)`);

if (gzipBytes > MAX_GZIP_BYTES) {
  console.error(`Gzip size ${gzipBytes} exceeds 18KB limit (${MAX_GZIP_BYTES} bytes).`);
  process.exit(1);
}

console.log('Bundle size check passed.');
