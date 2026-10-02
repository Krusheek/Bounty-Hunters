/**
 * Environment detection for the T3 Code client runtime.
 * Extends the existing runtime identification with container, CI, and WSL detection.
 */

export interface KnownEnvironment {
  /** Running inside a Docker / OCI container */
  isContainer: boolean;
  /** Running inside GitHub Actions, CircleCI, GitLab CI, or similar */
  isCI: boolean;
  /** Running inside Windows Subsystem for Linux */
  isWSL: boolean;
  /** Running in an interactive terminal */
  isTTY: boolean;
}

function readFileSync(path: string): string | null {
  try {
    // Node.js environment
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("fs").readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function envVarTruthy(name: string): boolean {
  const v = process.env[name];
  return v !== undefined && v !== "" && v !== "0" && v.toLowerCase() !== "false";
}

function detectContainer(): boolean {
  // Docker sets /.dockerenv
  if (readFileSync("/.dockerenv") !== null) return true;
  // Check cgroup for container signatures
  const cgroup = readFileSync("/proc/1/cgroup");
  if (cgroup && /docker|containerd|kubepods|lxc/i.test(cgroup)) return true;
  // Kubernetes injects these env vars
  if (process.env["KUBERNETES_SERVICE_HOST"]) return true;
  return false;
}

function detectCI(): boolean {
  // Standard CI env var (set by most CI systems)
  if (envVarTruthy("CI")) return true;
  // Platform-specific
  const ciVars = [
    "GITHUB_ACTIONS",
    "GITLAB_CI",
    "CIRCLECI",
    "TRAVIS",
    "BUILDKITE",
    "JENKINS_URL",
    "TEAMCITY_VERSION",
    "TF_BUILD", // Azure DevOps
  ];
  return ciVars.some((v) => envVarTruthy(v));
}

function detectWSL(): boolean {
  // WSL sets WSLENV or WSL_DISTRO_NAME
  if (process.env["WSL_DISTRO_NAME"] || process.env["WSLENV"]) return true;
  // Kernel version string contains "microsoft" on WSL
  const osRelease = readFileSync("/proc/version");
  if (osRelease && /microsoft/i.test(osRelease)) return true;
  return false;
}

export function detectEnvironment(): KnownEnvironment {
  return {
    isContainer: detectContainer(),
    isCI: detectCI(),
    isWSL: detectWSL(),
    isTTY: Boolean(process.stdout?.isTTY),
  };
}

export const knownEnvironment: KnownEnvironment = detectEnvironment();
