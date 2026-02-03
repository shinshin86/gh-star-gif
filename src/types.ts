export interface CliOptions {
  /** GitHub repository URL */
  repoUrl: string;
  /** Output GIF file path */
  out: string;
  /** Tooltip message text */
  message: string;
  /** Viewport width */
  width: number;
  /** Viewport height */
  height: number;
  /** GIF frames per second */
  fps: number;
  /** Output GIF width in pixels (height auto) */
  scale: number;
  /** Total capture duration in milliseconds */
  duration: number;
  /** Run browser in headful mode */
  headful: boolean;
  /** Keep intermediate video file */
  keepVideo: boolean;
  /** Debug mode: extra logs and keep temp dir */
  debug: boolean;
}

export interface ParsedRepo {
  owner: string;
  repo: string;
  normalizedUrl: string;
}

export interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CaptureResult {
  videoPath: string;
  usedFallback: boolean;
}
