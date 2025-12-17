import { exec, execSync, type ExecOptions ,type ExecSyncOptions} from "node:child_process";
import { promisify } from "node:util";
import { isWindows, isLinux } from "../platforms/env.js";
import { asyncHandler } from "./file.js";

const execPromise = promisify(exec);

/**
 * Interface for command execution options
 */
export interface CommandOptions extends ExecOptions {
  /** If true, suppresses standard error output */
  silent?: boolean;
}

/**
 * Result of a command execution
 */
export interface CommandResult {
  stdout: string;
  stderr: string;
}

/**
 * Executes a command asynchronously.
 * @param command The command to execute.
 * @param options Execution options.
 * @returns The stdout of the command.
 * @throws Error if the command fails.
 */
async function _runCommand(
  command: string,
  options: CommandOptions = {},
) {
  const { silent, ...execOps } = options;
  try {
    const { stdout } = await execPromise(command, {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024, // 10MB
      ...execOps,
    });
    if (typeof stdout === "string") {
      return stdout.trim();
    }
    return stdout;
  } catch (error: any) {
    if (!silent) {
       // Only log if specifically needed, but usually we just throw
    }
    throw new Error(`Command failed: ${command}\n${error.message || error}`);
  }
  
}

/**
 * Executes a command asynchronously and returns both stdout and stderr.
 * @param command The command to execute.
 * @param options Execution options.
 * @returns Object containing stdout and stderr.
 * @throws Error if the command fails.
 */
async function _runCommandFull(
  command: string,
  options: CommandOptions = {},
): Promise<CommandResult> {
  const { silent, ...execOps } = options;
  try {
    const { stdout, stderr } = await execPromise(command, {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024, // 10MB
      ...execOps,
    });
    return {
      stdout: (typeof stdout === "string" ? stdout : String(stdout)).trim(),
      stderr: (typeof stderr === "string" ? stderr : String(stderr)).trim(),
    };
  } catch (error: any) {
    if (!silent) {
       // Only log if specifically needed
    }
    // If we want to return the output even on failure, we'd need to change the return type signature or catch strategy.
    // For now, consistent with _runCommand, we throw.
    throw new Error(`Command failed: ${command}\n${error.message || error}`);
  }
}

/**
 * Executes a command synchronously.
 * @param command The command to execute.
 * @param options Execution options.
 * @returns The stdout of the command.
 */
export function runSync(command: string, options: CommandOptions = {}): string {
  try {
    const { silent, encoding, ...execOps } = options;

    const execOptions: ExecSyncOptions = {
      // FIX: Cast the generic string to BufferEncoding to satisfy TypeScript
      encoding: (encoding as BufferEncoding) || "utf8",
      stdio: silent ? ["ignore", "pipe", "ignore"] : ["ignore", "pipe", "pipe"],
      maxBuffer: 10 * 1024 * 1024, // 10MB
      ...execOps,
    };
    
    // We cast the result to string because we forced a text encoding above
    return (execSync(command, execOptions) as string).trim();
  } catch (error: any) {
    throw new Error(`Command failed: ${command}\n${error.message || error}`);
  }
}

/**
 * Checks if a command exists in the system PATH.
 * @param commandName The name of the command to check.
 * @returns True if the command exists, false otherwise.
 */
async function _isCommandAvailable(commandName: string): Promise<boolean> {
  const checkCmd = isWindows() ? "where" : "which";
  try {
    await _runCommand(`${checkCmd} ${commandName}`, { silent: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Synchronous version of checking if a command exists.
 * @param commandName The name of the command to check.
 * @returns True if the command exists, false otherwise.
 */
export function isCommandAvailable(commandName: string): boolean {
  const checkCmd = isWindows() ? "where" : "which";
  try {
    runSync(`${checkCmd} ${commandName}`, { silent: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Supported package managers
 */
export type PackageManager = "apt" | "dnf" | "yum" | "pacman" | "brew" | "winget" | "choco" | "pkg";

const PACKAGE_MANAGERS: PackageManager[] = [
  "apt", "dnf", "yum", "pacman", // Linux
  "brew", // macOS
  "winget", "choco", // Windows
  "pkg" // Android/Termux
];

/**
 * Detects the available package manager on the system.
 * @returns The name of the package manager or null if none found.
 */
async function _getPackageManager(): Promise<PackageManager | null> {
  // Check in parallel for faster detection? 
  // Sequential is safer to avoid spawning too many processes if checking many.
  for (const pm of PACKAGE_MANAGERS) {
    if (await _isCommandAvailable(pm)) {
      return pm;
    }
  }
  return null;
}

/**
 * Synchronously detects the available package manager.
 * @returns The name of the package manager or null if none found.
 */
export function getPackageManager(): PackageManager | null {
  for (const pm of PACKAGE_MANAGERS) {
    if (isCommandAvailable(pm)) {
      return pm;
    }
  }
  return null;
}

/**
 * Checks if a specific package is installed using the system's package manager.
 * @param packageName The name of the package to check.
 * @param pm Optional specific package manager to use.
 * @returns True if installed, false otherwise.
 */
async function _isPackageInstalled(packageName: string, pm?: PackageManager): Promise<boolean> {
  const manager = pm || (await _getPackageManager());
  if (!manager) return false;

  const check: Record<PackageManager, string> = {
    apt: `dpkg -s ${packageName}`,
    dnf: `rpm -q ${packageName}`,
    yum: `rpm -q ${packageName}`,
    pacman: `pacman -Q ${packageName}`,
    brew: `brew list --versions ${packageName}`,
    winget: `winget list --name "${packageName}"`,
    choco: `choco list --local-only --exact ${packageName}`,
    pkg: `pkg list-installed ${packageName}`,
  };

  const command = check[manager];
  if (!command) {
    console.warn(`Package check not implemented for: ${manager}`);
    return false;
  }

  try {
    const output = await _runCommand(command, { silent: true });
    if (manager === "winget" || manager === "pkg") {
      return output.includes(packageName);
    }
    if (manager === "choco") {
      return output.includes("1 packages installed.");
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Synchronously checks if a specific package is installed.
 * @param packageName The name of the package to check.
 * @param pm Optional specific package manager to use.
 * @returns True if installed, false otherwise.
 */
export function isPackageInstalled(packageName: string, pm?: PackageManager): boolean {
  const manager = pm || getPackageManager();
  if (!manager) return false;

  const check: Record<PackageManager, string> = {
    apt: `dpkg -s ${packageName}`,
    dnf: `rpm -q ${packageName}`,
    yum: `rpm -q ${packageName}`,
    pacman: `pacman -Q ${packageName}`,
    brew: `brew list --versions ${packageName}`,
    winget: `winget list --name "${packageName}"`,
    choco: `choco list --local-only --exact ${packageName}`,
    pkg: `pkg list-installed ${packageName}`,
  };

  const command = check[manager];
  if (!command) return false;

  try {
    const output = runSync(command, { silent: true });
    if (manager === "winget" || manager === "pkg") {
      return output.includes(packageName);
    }
    if (manager === "choco") {
      return output.includes("1 packages installed.");
    }
    return true;
  } catch {
    return false;
  }
}

export interface LinuxDistroInfo {
  id: string;
  versionId: string;
}

/**
 * Retrieves Linux distribution information from /etc/os-release.
 * @returns Distro info or null if not found/not Linux.
 */
export function getLinuxDistroInfo(): LinuxDistroInfo | null {
  if (!isLinux()) return null;
  try {
    const output = runSync("cat /etc/os-release", { silent: true });
    const lines = typeof output === "string" ? output.split("\n") : [];
    const info: Partial<LinuxDistroInfo> = {};
    
    for (const line of lines) {
      if (line.startsWith("ID=")) {
        info.id = line.substring(3).replace(/"/g, "").trim();
      } else if (line.startsWith("VERSION_ID=")) {
        info.versionId = line.substring(11).replace(/"/g, "").trim();
      }
    }
    
    if (info.id && info.versionId) {
      return info as LinuxDistroInfo;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Utilities for executing system commands.
 */
export const CommandUtils = {
  run: asyncHandler(_runCommand),
  isCommandAvailable: asyncHandler(_isCommandAvailable),
  getPackageManager: asyncHandler(_getPackageManager),
  isPackageInstalled: asyncHandler(_isPackageInstalled),
  /**
   * runs a command and returns both stdout and stderr
   */
  execute: asyncHandler(_runCommandFull),
};
