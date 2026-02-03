import { describe, it, expect } from 'vitest';
import { parseGitHubUrl, sanitizeFilename, defaultOutputFilename } from '../src/githubUrl.js';

describe('parseGitHubUrl', () => {
  it('parses a standard GitHub URL', () => {
    const result = parseGitHubUrl('https://github.com/microsoft/TypeScript');
    expect(result).toEqual({
      owner: 'microsoft',
      repo: 'TypeScript',
      normalizedUrl: 'https://github.com/microsoft/TypeScript',
    });
  });

  it('strips trailing slash', () => {
    const result = parseGitHubUrl('https://github.com/facebook/react/');
    expect(result.normalizedUrl).toBe('https://github.com/facebook/react');
  });

  it('strips query parameters', () => {
    const result = parseGitHubUrl('https://github.com/owner/repo?tab=repositories');
    expect(result.normalizedUrl).toBe('https://github.com/owner/repo');
  });

  it('strips extra path segments like /tree/main', () => {
    const result = parseGitHubUrl('https://github.com/vuejs/vue/tree/main/src');
    expect(result).toEqual({
      owner: 'vuejs',
      repo: 'vue',
      normalizedUrl: 'https://github.com/vuejs/vue',
    });
  });

  it('accepts bare github.com/owner/repo without scheme', () => {
    const result = parseGitHubUrl('github.com/owner/repo');
    expect(result.normalizedUrl).toBe('https://github.com/owner/repo');
  });

  it('handles repo names with dots and hyphens', () => {
    const result = parseGitHubUrl('https://github.com/some-org/my.repo-name');
    expect(result).toEqual({
      owner: 'some-org',
      repo: 'my.repo-name',
      normalizedUrl: 'https://github.com/some-org/my.repo-name',
    });
  });

  it('trims whitespace from input', () => {
    const result = parseGitHubUrl('  https://github.com/a/b  ');
    expect(result.normalizedUrl).toBe('https://github.com/a/b');
  });

  it('throws on non-GitHub URL', () => {
    expect(() => parseGitHubUrl('https://gitlab.com/foo/bar')).toThrow('github.com');
  });

  it('throws on URL without owner/repo path', () => {
    expect(() => parseGitHubUrl('https://github.com/')).toThrow('owner and repo');
  });

  it('throws on single-segment path', () => {
    expect(() => parseGitHubUrl('https://github.com/owner')).toThrow('owner and repo');
  });

  it('throws on completely invalid URL', () => {
    expect(() => parseGitHubUrl('not a url at all')).toThrow('Invalid URL');
  });

  it('throws on empty string', () => {
    expect(() => parseGitHubUrl('')).toThrow('Invalid URL');
  });
});

describe('sanitizeFilename', () => {
  it('passes through clean names', () => {
    expect(sanitizeFilename('my-file')).toBe('my-file');
  });

  it('replaces spaces with underscores', () => {
    expect(sanitizeFilename('my file name')).toBe('my_file_name');
  });

  it('replaces special characters', () => {
    expect(sanitizeFilename('file@#$%name')).toBe('file_name');
  });

  it('collapses consecutive underscores', () => {
    expect(sanitizeFilename('a!!!b')).toBe('a_b');
  });

  it('strips leading and trailing underscores', () => {
    expect(sanitizeFilename('!!!test!!!')).toBe('test');
  });

  it('preserves dots and hyphens', () => {
    expect(sanitizeFilename('file.name-v2')).toBe('file.name-v2');
  });
});

describe('defaultOutputFilename', () => {
  it('produces owner_repo.gif format', () => {
    expect(defaultOutputFilename('microsoft', 'TypeScript')).toBe('microsoft_TypeScript.gif');
  });

  it('sanitizes unsafe owner/repo names', () => {
    expect(defaultOutputFilename('some org', 'my repo!')).toBe('some_org_my_repo.gif');
  });
});
