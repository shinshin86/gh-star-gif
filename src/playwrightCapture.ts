import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { buildOverlayScript } from './overlay.js';
import type { CliOptions, TargetRect, CaptureResult } from './types.js';

/**
 * Launch Playwright, navigate to the repo page, locate the Star button,
 * inject the overlay, record for the specified duration, and return the
 * path to the recorded video file.
 */
export async function captureStarGif(
  normalizedUrl: string,
  opts: CliOptions,
  tempDir: string,
): Promise<CaptureResult> {
  const log = opts.debug ? console.log.bind(console, '[capture]') : () => {};

  let browser: Browser | undefined;
  let context: BrowserContext | undefined;
  let videoPath: string | undefined;
  let usedFallback = false;

  try {
    log('Launching browser...');
    browser = await chromium.launch({
      headless: !opts.headful,
    });

    context = await browser.newContext({
      locale: 'en-US',
      colorScheme: 'light',
      viewport: { width: opts.width, height: opts.height },
      deviceScaleFactor: 1,
      reducedMotion: 'no-preference',
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
      },
      recordVideo: {
        dir: tempDir,
        size: { width: opts.width, height: opts.height },
      },
    });

    const page = await context.newPage();

    // Store video handle early so we can retrieve path after close
    const video = page.video();

    log(`Navigating to ${normalizedUrl} ...`);
    await page.goto(normalizedUrl, {
      waitUntil: 'networkidle',
      timeout: 60_000,
    });

    // Extra wait for layout stability
    await page.waitForTimeout(300);

    // Scroll to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(100);

    // Try to dismiss cookie/consent banners
    await dismissDialogs(page, log);

    // Locate Star button
    const target = await findStarButton(page, opts, log);
    if (!target.found) {
      usedFallback = true;
    }

    log(`Target rect: ${JSON.stringify(target.rect)} (fallback: ${usedFallback})`);

    // Inject overlay
    const overlayScript = buildOverlayScript(target.rect, opts.message);
    await page.evaluate(overlayScript);
    log('Overlay injected');

    // Optional debug screenshot (taken after animations have started)
    if (opts.debug) {
      const { join } = await import('node:path');
      // Wait for overlay animations to play before capturing screenshot
      await page.waitForTimeout(2000);
      const ssPath = join(tempDir, 'debug-overlay.png');
      await page.screenshot({ path: ssPath });
      log(`Debug screenshot saved: ${ssPath}`);
    }

    // Wait for the animation/capture duration
    log(`Recording for ${opts.duration}ms...`);
    await page.waitForTimeout(opts.duration);

    // Retrieve video path before closing
    videoPath = await video?.path();

    // Close context to finalize video
    await context.close();
    context = undefined;

    await browser.close();
    browser = undefined;

    if (!videoPath) {
      throw new Error('Failed to retrieve video path from Playwright recording.');
    }

    log(`Video saved: ${videoPath}`);
    return { videoPath, usedFallback };
  } catch (err) {
    // Ensure cleanup on error
    if (context) {
      try {
        await context.close();
      } catch {
        /* ignore */
      }
    }
    if (browser) {
      try {
        await browser.close();
      } catch {
        /* ignore */
      }
    }
    throw err;
  }
}

interface StarButtonResult {
  rect: TargetRect;
  found: boolean;
}

/**
 * Try multiple strategies to find the Star button.
 * Returns a bounding box and whether it was actually found.
 *
 * GitHub renders the Star element differently depending on auth state:
 * - Logged in: a <button> inside a <form action="…/star">
 * - Logged out: an <a> tag with aria-label containing "star" and class "btn"
 *
 * We try both button and anchor strategies.
 */
async function findStarButton(
  page: Page,
  opts: CliOptions,
  log: (...args: unknown[]) => void,
): Promise<StarButtonResult> {
  const strategies: Array<{ label: string; locator: () => ReturnType<Page['locator']> }> = [
    // Logged-in: actual <button> with Star text
    {
      label: 'role=button "Star"',
      locator: () => page.getByRole('button', { name: /^Star\b/i }).first(),
    },
    {
      label: 'role=button "Starred"',
      locator: () => page.getByRole('button', { name: /^Starred\b/i }).first(),
    },
    {
      label: 'form[action*="/star"] button',
      locator: () => page.locator('form[action*="/star"] button').first(),
    },
    // Logged-out: <a> tag styled as button
    {
      label: 'a[aria-label*="star"]',
      locator: () => page.locator('a[aria-label*="star" i].btn, a[aria-label*="Star"].btn').first(),
    },
    {
      label: 'role=link "Star"',
      locator: () => page.getByRole('link', { name: /^\s*Star\b/i }).first(),
    },
    // Broader: any element with Star aria-label
    {
      label: '[aria-label*="Star"]',
      locator: () => page.locator('[aria-label*="star" i][class*="btn"]').first(),
    },
    // Counter-based: find the star counter and go to parent BtnGroup
    {
      label: '#repo-stars-counter-star parent',
      locator: () => page.locator('#repo-stars-counter-star').locator('..').first(),
    },
    // Text-based: BtnGroup containing "Star"
    {
      label: '.BtnGroup:has-text("Star")',
      locator: () => page.locator('.BtnGroup:has-text("Star")').first(),
    },
  ];

  for (const { label, locator: getLocator } of strategies) {
    try {
      const locator = getLocator();
      const count = await locator.count();
      if (count === 0) continue;

      const visible = await locator.isVisible().catch(() => false);
      if (!visible) continue;

      await locator.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
      const box = await locator.boundingBox();
      if (box && box.width > 0 && box.height > 0) {
        log(`Star button found via: ${label}`);
        return {
          rect: { x: box.x, y: box.y, width: box.width, height: box.height },
          found: true,
        };
      }
    } catch {
      // Strategy failed, try next
    }
  }

  // Fallback: top-right area where the Star button typically appears
  log('Star button not found, using fallback region');
  return {
    rect: {
      x: opts.width - 160,
      y: 86,
      width: 130,
      height: 30,
    },
    found: false,
  };
}

/**
 * Attempt to dismiss common dialogs/banners on GitHub pages.
 * Best-effort; failures are silently ignored.
 */
async function dismissDialogs(page: Page, log: (...args: unknown[]) => void): Promise<void> {
  try {
    // GitHub cookie consent button
    const cookieBtn = page.locator(
      'button:has-text("Accept"), button:has-text("Got it"), button:has-text("Dismiss")',
    );
    const count = await cookieBtn.count();
    if (count > 0) {
      await cookieBtn.first().click({ timeout: 2000 });
      log('Dismissed a dialog/banner');
      await page.waitForTimeout(200);
    }
  } catch {
    // Ignore — not all pages have banners
  }
}
