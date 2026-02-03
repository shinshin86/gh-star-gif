import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

interface ConvertOptions {
  inputVideo: string;
  outputGif: string;
  fps: number;
  scale: number;
  tempDir: string;
  debug: boolean;
}

/**
 * Convert a video file to an optimized GIF using ffmpeg's two-pass
 * palette generation approach.
 *
 * Throws with actionable error messages if ffmpeg is missing.
 */
export async function convertToGif(opts: ConvertOptions): Promise<void> {
  const log = opts.debug ? console.log.bind(console, '[ffmpeg]') : () => {};

  // Verify ffmpeg is available
  await verifyFfmpeg();

  const palettePath = join(opts.tempDir, 'palette.png');
  const filterComplex = `fps=${opts.fps},scale=${opts.scale}:-1:flags=lanczos`;

  // Pass 1: Generate palette
  log('Generating palette...');
  await runFfmpeg([
    '-y',
    '-i',
    opts.inputVideo,
    '-vf',
    `${filterComplex},palettegen=stats_mode=diff`,
    palettePath,
  ]);

  if (!existsSync(palettePath)) {
    throw new Error('ffmpeg palette generation did not produce a palette file.');
  }

  // Pass 2: Generate GIF using palette
  log('Generating GIF...');
  await runFfmpeg([
    '-y',
    '-i',
    opts.inputVideo,
    '-i',
    palettePath,
    '-lavfi',
    `${filterComplex} [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`,
    opts.outputGif,
  ]);

  if (!existsSync(opts.outputGif)) {
    throw new Error('ffmpeg did not produce the output GIF file.');
  }

  log(`GIF saved: ${opts.outputGif}`);
}

/**
 * Verify that ffmpeg is available on PATH.
 */
async function verifyFfmpeg(): Promise<void> {
  try {
    await runFfmpeg(['-version']);
  } catch (err) {
    if (isSpawnError(err)) {
      throw new Error(
        [
          'ffmpeg not found. Please install ffmpeg and ensure it is on your PATH.',
          '',
          'Install hints:',
          '  macOS:   brew install ffmpeg',
          '  Ubuntu:  sudo apt-get install ffmpeg',
          '  Windows: choco install ffmpeg  (or download from https://ffmpeg.org/download.html)',
        ].join('\n'),
      );
    }
    throw err;
  }
}

function runFfmpeg(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('ffmpeg', args, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        // Attach stderr for debugging
        const msg = stderr ? `${error.message}\n${stderr}` : error.message;
        const enriched = new Error(msg);
        if ('code' in error) {
          (enriched as NodeJS.ErrnoException).code = error.code as string;
        }
        reject(enriched);
        return;
      }
      resolve(stdout || stderr);
    });
  });
}

function isSpawnError(err: unknown): boolean {
  return err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT';
}
