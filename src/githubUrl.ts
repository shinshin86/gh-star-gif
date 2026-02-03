import type { ParsedRepo } from './types.js';

/**
 * Parse and normalize a GitHub repository URL.
 *
 * Accepts forms like:
 *   https://github.com/owner/repo
 *   https://github.com/owner/repo/
 *   https://github.com/owner/repo?foo=bar
 *   https://github.com/owner/repo/tree/main/src
 *   github.com/owner/repo
 *
 * Returns the owner, repo name, and normalized URL.
 * Throws on invalid input.
 */
export function parseGitHubUrl(input: string): ParsedRepo {
  let urlStr = input.trim();

  // Allow bare "github.com/owner/repo" without scheme
  if (/^github\.com\//i.test(urlStr)) {
    urlStr = `https://${urlStr}`;
  }

  let url: URL;
  try {
    url = new URL(urlStr);
  } catch {
    throw new Error(
      `Invalid URL: "${input}". Expected a GitHub repository URL like https://github.com/owner/repo`,
    );
  }

  if (url.hostname.toLowerCase() !== 'github.com') {
    throw new Error(
      `URL host must be github.com, got "${url.hostname}". ` +
        `Example: https://github.com/owner/repo`,
    );
  }

  // Split path, filter empties
  const segments = url.pathname.split('/').filter(Boolean);

  if (segments.length < 2) {
    throw new Error(
      `URL must include owner and repo: https://github.com/<owner>/<repo>. ` +
        `Got path "${url.pathname}"`,
    );
  }

  const owner = segments[0];
  const repo = segments[1];

  // Basic validation for owner/repo names
  if (!isValidSegment(owner) || !isValidSegment(repo)) {
    throw new Error(
      `Invalid owner or repo name in URL. ` +
        `Owner: "${owner}", Repo: "${repo}". ` +
        `Names must contain only alphanumerics, hyphens, underscores, or dots.`,
    );
  }

  const normalizedUrl = `https://github.com/${owner}/${repo}`;

  return { owner, repo, normalizedUrl };
}

/** Check that a path segment is a plausible GitHub owner/repo name. */
function isValidSegment(s: string): boolean {
  return /^[a-zA-Z0-9._-]+$/.test(s);
}

/**
 * Sanitize a string for use as a filename.
 * Replaces non-alphanumeric characters (except hyphens, underscores, dots)
 * with underscores, and collapses consecutive underscores.
 */
export function sanitizeFilename(input: string): string {
  return input
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Build the default output filename from owner and repo.
 */
export function defaultOutputFilename(owner: string, repo: string): string {
  const safeOwner = sanitizeFilename(owner);
  const safeRepo = sanitizeFilename(repo);
  return `${safeOwner}_${safeRepo}.gif`;
}
