#!/usr/bin/env node

import { Command } from 'commander';
import { run } from './index.js';
import type { CliOptions } from './types.js';

const program = new Command();

program
  .name('gh-star-gif')
  .description(
    'Generate an animated GIF that highlights the Star button on a GitHub repository page.',
  )
  .version('0.1.0')
  .argument('<repoUrl>', 'GitHub repository URL (e.g. https://github.com/owner/repo)')
  .option('--out <path>', 'Output GIF path (default: ./out/<owner>_<repo>.gif)')
  .option('--message <text>', 'Tooltip text', 'Star this repo \u2B50\uD83D\uDC46')
  .option('--width <number>', 'Viewport width', parseIntOption, 1280)
  .option('--height <number>', 'Viewport height', parseIntOption, 720)
  .option('--fps <number>', 'GIF frames per second', parseIntOption, 15)
  .option('--scale <number>', 'Output GIF width in pixels', parseIntOption, 960)
  .option('--duration <ms>', 'Total capture duration in ms', parseIntOption, 4200)
  .option('--headful', 'Run browser in headful mode', false)
  .option('--keep-video', 'Keep intermediate recorded video', false)
  .option('--debug', 'Extra logs and keep temp dir', false)
  .action(async (repoUrl: string, rawOpts: Record<string, unknown>) => {
    const opts: CliOptions = {
      repoUrl,
      out: (rawOpts.out as string) || '',
      message: rawOpts.message as string,
      width: rawOpts.width as number,
      height: rawOpts.height as number,
      fps: rawOpts.fps as number,
      scale: rawOpts.scale as number,
      duration: rawOpts.duration as number,
      headful: rawOpts.headful as boolean,
      keepVideo: rawOpts.keepVideo as boolean,
      debug: rawOpts.debug as boolean,
    };

    try {
      await run(opts);
    } catch (err) {
      console.error(`\nError: ${err instanceof Error ? err.message : String(err)}`);
      if (opts.debug && err instanceof Error && err.stack) {
        console.error(err.stack);
      }
      process.exit(1);
    }
  });

program.parse();

function parseIntOption(value: string): number {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed <= 0) {
    throw new Error(`Invalid number: "${value}". Must be a positive integer.`);
  }
  return parsed;
}
