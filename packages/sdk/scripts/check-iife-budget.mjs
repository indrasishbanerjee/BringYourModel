import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const TARGET_GZIP_BYTES = 12 * 1024;
const defaultMaxGzipBytes = 20 * 1024;
const maxGzipBytes = Number(
  process.env.BYOM_IIFE_MAX_GZIP_BYTES ?? defaultMaxGzipBytes,
);

const distDir = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const candidates = [
  "byom.iife.min.global.js",
  "byom.iife.min.js",
];

const bundlePath = candidates
  .map((name) => join(distDir, name))
  .find((path) => {
    try {
      readFileSync(path);
      return true;
    } catch {
      return false;
    }
  });

if (!bundlePath) {
  console.error(
    `Missing IIFE bundle in ${distDir}. Expected one of: ${candidates.join(", ")}`,
  );
  process.exit(1);
}

const rawBytes = readFileSync(bundlePath).byteLength;
const gzipBytes = gzipSync(readFileSync(bundlePath)).byteLength;

console.log(`Bundle: ${bundlePath}`);
console.log(`Raw: ${rawBytes} bytes, gzip: ${gzipBytes} bytes`);

if (gzipBytes > maxGzipBytes) {
  console.error(
    `Gzip size ${gzipBytes} exceeds CI limit ${maxGzipBytes} bytes (set BYOM_IIFE_MAX_GZIP_BYTES to override).`,
  );
  process.exit(1);
}

if (gzipBytes > TARGET_GZIP_BYTES) {
  console.warn(
    `Warning: gzip size ${gzipBytes} exceeds ${TARGET_GZIP_BYTES}-byte target (r4-bundle-budget).`,
  );
}
