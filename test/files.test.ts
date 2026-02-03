import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { ensureDir, ensureParentDir, createTempDir, cleanupDir } from '../src/files.js';

function testDir(): string {
  return join(tmpdir(), `gh-star-gif-test-${randomBytes(4).toString('hex')}`);
}

const dirs: string[] = [];

afterEach(() => {
  for (const d of dirs) {
    if (existsSync(d)) {
      rmSync(d, { recursive: true, force: true });
    }
  }
  dirs.length = 0;
});

describe('ensureDir', () => {
  it('creates a nested directory', () => {
    const d = join(testDir(), 'a', 'b', 'c');
    dirs.push(d);
    ensureDir(d);
    expect(existsSync(d)).toBe(true);
  });

  it('does not throw if directory already exists', () => {
    const d = testDir();
    dirs.push(d);
    mkdirSync(d, { recursive: true });
    expect(() => ensureDir(d)).not.toThrow();
  });
});

describe('ensureParentDir', () => {
  it('creates the parent directory of a file path', () => {
    const base = testDir();
    dirs.push(base);
    const filePath = join(base, 'sub', 'file.txt');
    ensureParentDir(filePath);
    expect(existsSync(join(base, 'sub'))).toBe(true);
  });
});

describe('createTempDir', () => {
  it('creates a temp directory with the given prefix', () => {
    const d = createTempDir('test-prefix');
    dirs.push(d);
    expect(existsSync(d)).toBe(true);
    expect(d).toContain('test-prefix');
  });
});

describe('cleanupDir', () => {
  it('removes an existing directory', () => {
    const d = testDir();
    mkdirSync(d, { recursive: true });
    cleanupDir(d);
    expect(existsSync(d)).toBe(false);
  });

  it('does not throw if directory does not exist', () => {
    expect(() => cleanupDir('/tmp/nonexistent-gh-star-gif-dir')).not.toThrow();
  });
});
