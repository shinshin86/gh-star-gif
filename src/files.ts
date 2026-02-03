import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { dirname } from 'node:path';

/**
 * Ensure a directory exists, creating it recursively if needed.
 */
export function ensureDir(dirPath: string): void {
  mkdirSync(dirPath, { recursive: true });
}

/**
 * Ensure the parent directory of a file path exists.
 */
export function ensureParentDir(filePath: string): void {
  ensureDir(dirname(filePath));
}

/**
 * Create a temporary directory with a unique name.
 */
export function createTempDir(prefix: string = 'gh-star-gif'): string {
  const id = randomBytes(6).toString('hex');
  const dir = join(tmpdir(), `${prefix}-${id}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Remove a directory and its contents.
 * Silently ignores if the directory does not exist.
 */
export function cleanupDir(dirPath: string): void {
  if (existsSync(dirPath)) {
    rmSync(dirPath, { recursive: true, force: true });
  }
}
