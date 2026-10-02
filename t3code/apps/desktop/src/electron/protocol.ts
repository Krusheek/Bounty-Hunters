import { app, BrowserWindow } from "electron";
import { URL } from "url";

/**
 * T3Code deep-link protocol handler.
 * Registers the `t3code://` custom URI scheme and routes inbound links
 * to the correct view in the renderer via IPC.
 *
 * Supported patterns:
 *   t3code://open/project?path=/absolute/path/to/repo
 *   t3code://chat/thread?id=abc123
 *   t3code://settings
 */

const PROTOCOL = "t3code";

/** Validate a project path to prevent path-traversal attacks. */
function sanitizePath(raw: string): string | null {
  // Reject paths containing traversal sequences
  if (!raw || raw.includes("..") || raw.includes("\0")) return null;
  // Must be absolute
  if (!raw.startsWith("/") && !raw.match(/^[A-Za-z]:\\/)) return null;
  return raw;
}

/** Parse a deep-link URL and dispatch to the focused window via IPC. */
export function handleDeepLink(url: string, win: BrowserWindow | null): void {
  if (!win) return;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    console.warn(`[protocol] Invalid deep-link URL: ${url}`);
    return;
  }

  if (parsed.protocol !== `${PROTOCOL}:`) return;

  const host = parsed.hostname; // e.g. "open", "chat", "settings"
  const pathname = parsed.pathname.replace(/^\//, ""); // e.g. "project"

  switch (`${host}/${pathname}`.replace(/\/$/, "")) {
    case "open/project": {
      const rawPath = parsed.searchParams.get("path") ?? "";
      const safePath = sanitizePath(rawPath);
      if (!safePath) {
        console.warn(`[protocol] Rejected unsafe project path: ${rawPath}`);
        return;
      }
      win.webContents.send("deep-link:open-project", { path: safePath });
      break;
    }

    case "chat/thread": {
      const threadId = parsed.searchParams.get("id") ?? "";
      if (!threadId) return;
      win.webContents.send("deep-link:open-thread", { id: threadId });
      break;
    }

    case "settings/": // fall-through
    case "settings": {
      win.webContents.send("deep-link:open-settings");
      break;
    }

    default:
      console.warn(`[protocol] Unrecognised deep-link route: ${url}`);
  }
}

/**
 * Register the `t3code://` protocol and wire up OS-level open events.
 * Call this once during app startup, before the window is created.
 */
export function registerProtocol(getWindow: () => BrowserWindow | null): void {
  // macOS/Linux: set as default protocol client
  if (process.defaultApp) {
    // Running via `electron .` — register with the full exe path
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [process.argv[1]]);
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL);
  }

  // macOS: fired when a t3code:// link is opened while app is running
  app.on("open-url", (event, url) => {
    event.preventDefault();
    handleDeepLink(url, getWindow());
  });

  // Windows/Linux: deep-link arrives as a command-line argument on second instance
  app.on("second-instance", (_event, argv) => {
    const url = argv.find((arg) => arg.startsWith(`${PROTOCOL}://`));
    if (url) {
      const win = getWindow();
      if (win) {
        if (win.isMinimized()) win.restore();
        win.focus();
      }
      handleDeepLink(url ?? "", getWindow());
    }
  });

  // Ensure only one instance handles deep links on Windows/Linux
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.quit();
  }
}
