import type { TargetRect } from './types.js';

/**
 * Build the JavaScript code string that, when evaluated in a browser page,
 * injects the overlay elements (spotlight, fake cursor, tooltip) and starts
 * deterministic CSS animations.
 *
 * All coordinates are viewport-fixed so they align with the recorded video.
 */
export function buildOverlayScript(target: TargetRect, message: string): string {
  const cx = Math.round(target.x + target.width / 2);
  const cy = Math.round(target.y + target.height / 2);

  // Escape the message for safe HTML injection
  const safeMessage = escapeHtml(message);

  // Padding around the target for the spotlight cutout
  const pad = 10;
  const spotX = target.x - pad;
  const spotY = target.y - pad;
  const spotW = target.width + pad * 2;
  const spotH = target.height + pad * 2;

  return `
(() => {
  // Remove any previous overlay
  const prev = document.getElementById('__gh_star_overlay');
  if (prev) prev.remove();

  const root = document.createElement('div');
  root.id = '__gh_star_overlay';
  root.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none;';

  // --- Styles ---
  const style = document.createElement('style');
  style.textContent = \`
    @keyframes __gs_pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.6); }
      50% { box-shadow: 0 0 0 8px rgba(255, 215, 0, 0); }
    }
    @keyframes __gs_cursorMove {
      0% { transform: translate(200px, 160px) scale(1); opacity: 0; }
      15% { opacity: 1; }
      100% { transform: translate(0px, 0px) scale(1); opacity: 1; }
    }
    @keyframes __gs_tooltipIn {
      0% { opacity: 0; transform: translateY(8px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    @keyframes __gs_fadeIn {
      0% { opacity: 0; }
      100% { opacity: 1; }
    }
  \`;
  root.appendChild(style);

  // --- Dimmed backdrop with cutout ---
  const backdrop = document.createElement('div');
  backdrop.style.cssText = \`
    position: fixed;
    left: ${spotX}px;
    top: ${spotY}px;
    width: ${spotW}px;
    height: ${spotH}px;
    border-radius: 8px;
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.35);
    animation: __gs_fadeIn 0.4s ease-out 0.8s both;
  \`;
  root.appendChild(backdrop);

  // --- Pulsing ring around target ---
  const ring = document.createElement('div');
  ring.style.cssText = \`
    position: fixed;
    left: ${spotX}px;
    top: ${spotY}px;
    width: ${spotW}px;
    height: ${spotH}px;
    border-radius: 8px;
    border: 3px solid rgba(255, 215, 0, 0.8);
    animation: __gs_pulse 1s ease-in-out 1.0s infinite, __gs_fadeIn 0.3s ease-out 1.0s both;
    box-sizing: border-box;
  \`;
  root.appendChild(ring);

  // --- Fake cursor ---
  const cursor = document.createElement('div');
  cursor.innerHTML = \`
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 3L19 12L12 13L9 20L5 3Z" fill="white" stroke="black" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>
  \`;
  cursor.style.cssText = \`
    position: fixed;
    left: ${cx}px;
    top: ${cy}px;
    width: 28px;
    height: 28px;
    animation: __gs_cursorMove 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0s both;
    filter: drop-shadow(1px 2px 2px rgba(0,0,0,0.3));
  \`;
  root.appendChild(cursor);

  // --- Tooltip bubble ---
  const tooltip = document.createElement('div');
  tooltip.innerHTML = '${safeMessage}';
  tooltip.style.cssText = \`
    position: fixed;
    left: ${cx - 80}px;
    top: ${Math.max(spotY - 56, 8)}px;
    padding: 10px 18px;
    background: linear-gradient(135deg, #ffd700 0%, #ffb347 100%);
    color: #1a1a1a;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    font-size: 16px;
    font-weight: 700;
    border-radius: 12px;
    white-space: nowrap;
    box-shadow: 0 4px 16px rgba(0,0,0,0.18);
    animation: __gs_tooltipIn 0.5s ease-out 1.3s both;
  \`;
  root.appendChild(tooltip);

  document.body.appendChild(root);
})();
`;
}

/**
 * Escape a string for safe use inside an HTML attribute or text node
 * that is itself inside a JS template literal.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;')
    .replace(/\\/g, '\\\\');
}
