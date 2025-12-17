import { exec, execSync, type ExecOptions ,type ExecSyncOptions} from "node:child_process";
import { promisify } from "node:util";
import * as path from "node:path";
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
 * Detects Java installation paths by executing system commands.
 * Tries multiple methods to find Java installations.
 * @returns Array of detected Java paths or empty array if none found.
 */
async function _detectJavaPaths(): Promise<string[]> {
  const javaPaths: string[] = [];
  
  try {
    // Method 1: Try 'which java' or 'where java'
    const checkCmd = isWindows() ? "where" : "which";
    const whichResult = await _runCommand(`${checkCmd} java`, { silent: true });
    
    if (whichResult && typeof whichResult === 'string') {
      // Resolve symlinks and get the actual path
      const realPath = await _runCommand(`realpath "${whichResult}"`, { silent: true }).catch(() => whichResult);
      if (typeof realPath === 'string') {
        javaPaths.push(realPath);
      }
    }
  } catch {
    // 'which java' failed, try other methods
  }

  try {
    // Method 2: Try 'java -version' and parse JAVA_HOME
    const versionResult = await _runCommandFull("java -version", { silent: true });
    
    // If java command works, try to get JAVA_HOME
    if (versionResult.stdout || versionResult.stderr) {
      try {
        const javaHome = await _runCommand("echo $JAVA_HOME", { silent: true });
        if (javaHome && typeof javaHome === 'string' && javaHome.trim()) {
          const javaHomePath = javaHome.trim();
          const javaExe = isWindows() ? "java.exe" : "java";
          const javaBinPath = path.join(javaHomePath, "bin", javaExe);
          
          // Verify the path exists
          try {
            const checkCmd = isWindows() ? "where" : "test -x";
            await _runCommand(`${checkCmd} "${javaBinPath}"`, { silent: true });
            javaPaths.push(javaBinPath);
          } catch {
            // JAVA_HOME path doesn't exist
          }
        }
      } catch {
        // JAVA_HOME not set or invalid
      }
    }
  } catch {
    // java command not available
  }

  // Method 3: Check common installation directories (limited to avoid timeouts)
  const commonPaths = isWindows()
    ? [
        "C:\\Program Files\\Java",
        "C:\\Program Files (x86)\\Java",
      ]
    : isLinux()
    ? [
        "/usr/lib/jvm",
      ]
    : [
        "/Library/Java/JavaVirtualMachines",
      ];

  for (const basePath of commonPaths) {
    try {
      // Quick check if directory exists first
      const checkCmd = isWindows()
        ? `if exist "${basePath}" echo exists`
        : `test -d "${basePath}" && echo exists`;
      
      const existsResult = await _runCommand(checkCmd, { silent: true });
      if (existsResult && typeof existsResult === 'string' && existsResult.includes('exists')) {
        // Use find command to look for java executables (limited to 3 results)
        const findCmd = isWindows()
          ? `dir "${basePath}" /s /b 2>nul | findstr /i "bin\\\\java.exe" | head -3`
          : `find "${basePath}" -name "java" -type f -executable 2>/dev/null | head -3`;
        
        const findResult = await _runCommand(findCmd, { silent: true });
        if (findResult && typeof findResult === 'string') {
          const paths = findResult.split("\n").filter((p: string) => p.trim());
          javaPaths.push(...paths.map((p: string) => p.trim()));
        }
      }
    } catch {
      // Directory doesn't exist or find command failed
    }
  }

  // Remove duplicates and filter out invalid paths
  const uniquePaths = [...new Set(javaPaths)].filter(p => p && p.length > 0);
  
  return uniquePaths;
}

/**
 * Synchronously detects Java installation paths.
 * @returns Array of detected Java paths or empty array if none found.
 */
export function detectJavaPathsSync(): string[] {
  const javaPaths: string[] = [];
  
  try {
    // Method 1: Try 'which java' or 'where java'
    const checkCmd = isWindows() ? "where" : "which";
    const whichResult = runSync(`${checkCmd} java`, { silent: true });
    
    if (whichResult) {
      javaPaths.push(whichResult);
    }
  } catch {
    // 'which java' failed, try other methods
  }

  try {
    // Method 2: Try to get JAVA_HOME
    const javaHome = runSync("echo $JAVA_HOME", { silent: true });
    if (javaHome && javaHome.trim()) {
      const javaHomePath = javaHome.trim();
      const javaExe = isWindows() ? "java.exe" : "java";
      const javaBinPath = path.join(javaHomePath, "bin", javaExe);
      javaPaths.push(javaBinPath);
    }
  } catch {
    // JAVA_HOME not set or invalid
  }

  return [...new Set(javaPaths)].filter(p => p && p.length > 0);
}

/**
 * Validates if a Java path exists and points to a valid Java executable.
 * @param javaPath The path to validate.
 * @returns True if the path exists and is executable, false otherwise.
 */
async function _validateJavaPath(javaPath: string): Promise<boolean> {
  if (!javaPath || typeof javaPath !== 'string') {
    return false;
  }

  try {
    // Check if file exists and is executable
    const checkCmd = isWindows() ? "where" : "test -x";
    const command = isWindows()
      ? `${checkCmd} "${javaPath}"`
      : `${checkCmd} "${javaPath}" && echo "valid"`;
    
    await _runCommand(command, { silent: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Synchronously validates if a Java path exists.
 * @param javaPath The path to validate.
 * @returns True if the path exists and is executable, false otherwise.
 */
export function validateJavaPathSync(javaPath: string): boolean {
  if (!javaPath || typeof javaPath !== 'string') {
    return false;
  }

  try {
    // Check if file exists and is executable
    const checkCmd = isWindows() ? "where" : "test -x";
    const command = isWindows()
      ? `${checkCmd} "${javaPath}"`
      : `${checkCmd} "${javaPath}" && echo "valid"`;
    
    runSync(command, { silent: true });
    return true;
  } catch {
    return false;
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
  /**
   * Detects Java installation paths
   */
  detectJavaPaths: asyncHandler(_detectJavaPaths),
  /**
   * Validates if a Java path exists and is executable
   */
  validateJavaPath: asyncHandler(_validateJavaPath),
};
