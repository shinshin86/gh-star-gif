import { resolve, join, parse } from 'node:path';
import { existsSync } from 'node:fs';
import type { CliOptions } from './types.js';
import { parseGitHubUrl, defaultOutputFilename } from './githubUrl.js';
import { ensureDir, ensureParentDir, createTempDir, cleanupDir } from './files.js';
import { captureStarGif } from './playwrightCapture.js';
import { convertToGif } from './ffmpeg.js';

/**
 * Main orchestrator: parse URL, capture page, convert to GIF.
 */
export async function run(opts: CliOptions): Promise<void> {
  const log = opts.debug ? console.log.bind(console, '[main]') : () => {};

  // 1. Parse and normalize URL
  const parsed = parseGitHubUrl(opts.repoUrl);
  console.log(`Repository: ${parsed.normalizedUrl}`);

  // 2. Resolve output path
  let outputPath = opts.out;
  if (!outputPath) {
    const outDir = resolve('out');
    ensureDir(outDir);
    outputPath = join(outDir, defaultOutputFilename(parsed.owner, parsed.repo));
  } else {
    outputPath = resolve(outputPath);
    ensureParentDir(outputPath);
  }

  // 3. Create temp directory
  const tempDir = createTempDir();
  log(`Temp dir: ${tempDir}`);

  try {
    // 4. Capture with Playwright
    const { videoPath, usedFallback } = await captureStarGif(parsed.normalizedUrl, opts, tempDir);

    if (usedFallback) {
      console.log('Note: Star button not found on page. A fallback highlight region was used.');
    }

    // 5. Convert video to GIF
    await convertToGif({
      inputVideo: videoPath,
      outputGif: outputPath,
      fps: opts.fps,
      scale: opts.scale,
      tempDir,
      debug: opts.debug,
    });

    // 6. Optionally keep video
    if (opts.keepVideo && existsSync(videoPath)) {
      const { dir, name } = parse(outputPath);
      const keptPath = join(dir, `${name}.webm`);
      ensureParentDir(keptPath);
      const { copyFileSync } = await import('node:fs');
      copyFileSync(videoPath, keptPath);
      console.log(`Video kept: ${keptPath}`);
    }

    console.log(`GIF saved: ${outputPath}`);
  } finally {
    // 7. Cleanup
    if (!opts.debug) {
      cleanupDir(tempDir);
    } else {
      log(`Temp dir preserved (debug): ${tempDir}`);
    }
  }
}
