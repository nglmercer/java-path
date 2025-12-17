import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  createSuccessResponse,
  createErrorResponse,
  type ServiceResponse,
} from "./validator.js";
// --- Constants ---
import { ALLOWED_FILE_EXTENSIONS } from "../constants.js";

// --- Constants ---
export const ALLOWED_EXTENSIONS = ALLOWED_FILE_EXTENSIONS;

// --- Fundamental Types and Helpers ---

/**
 * Wrapper for async functions to standardize error handling and response.
 * @param fn The async function to execute.
 * @returns A new function that returns a ServiceResponse object.
 */
export function asyncHandler<T, A extends unknown[]>(
  fn: (...args: A) => Promise<T>,
): (...args: A) => Promise<ServiceResponse<T>> {
  return async (...args: A): Promise<ServiceResponse<T>> => {
    try {
      const data = await fn(...args);
      return createSuccessResponse(data);
    } catch (error) {
      // Ensure a readable error message is always captured.
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`Error in operation '${fn.name}': ${errorMessage}`);
      return createErrorResponse(errorMessage);
    }
  };
}

// --- Internal Logic (Real Implementation) ---

/** Validates if a file extension is allowed. */
async function _isExtensionAllowed(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    // If it's a directory, allow it
    if (stats.isDirectory()) return true;

    const ext = path.extname(filePath).toLowerCase();
    if (!ext) return false; // Files without extension are not allowed by default
    return ALLOWED_EXTENSIONS.includes(ext);
  } catch (error) {
    // If file doesn't exist, just check the extension
    const ext = path.extname(filePath).toLowerCase();
    if (!ext) return false;
    return ALLOWED_EXTENSIONS.includes(ext);
  }
}

const _createFile = async (
  basePath: string,
  folderName: string,
  fileName: string,
  content: string = "",
): Promise<string> => {
  const filePath = path.join(basePath, folderName, fileName);
  if (!(await _isExtensionAllowed(filePath))) {
    throw new Error(`Extension not allowed for file: '${fileName}'`);
  }
  const folderPath = path.dirname(filePath);
  await fs.mkdir(folderPath, { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
  return filePath;
};

const _readFile = async (
  basePath: string,
  folderName: string,
  fileName: string,
): Promise<string> => {
  const filePath = path.join(basePath, folderName, fileName);
  // No need to check existence, fs.readFile will throw an error if it doesn't exist.
  return fs.readFile(filePath, "utf8");
};

const _writeFile = async (
  basePath: string,
  folderName: string,
  fileName: string,
  content: string,
): Promise<string> => {
  const filePath = path.join(basePath, folderName, fileName);
  if (!(await _isExtensionAllowed(filePath))) {
    throw new Error(`Extension not allowed for file: '${fileName}'`);
  }
  const folderPath = path.dirname(filePath);
  await fs.mkdir(folderPath, { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
  return filePath;
};

const _deletePath = async (
  basePath: string,
  relativePath: string,
): Promise<true> => {
  const fullPath = path.join(basePath, relativePath);
  // fs.rm will handle if it doesn't exist (it will throw error if not suppressed, but we want errors to be caught by asyncHandler)
  await fs.rm(fullPath, { recursive: true, force: true });
  return true;
};

const _renameFile = async (
  basePath: string,
  folderName: string,
  oldName: string,
  newName: string,
): Promise<string> => {
  const oldPath = path.join(basePath, folderName, oldName);
  const newPath = path.join(basePath, folderName, newName);

  if (!(await _isExtensionAllowed(newPath))) {
    throw new Error(`New extension for '${newName}' is not allowed.`);
  }

  // Prevent accidental overwrite
  try {
    await fs.access(newPath);
    // If no error thrown, file exists
    throw new Error(`Destination file '${newName}' already exists.`);
  } catch (error) {
    // If error is 'ENOENT', it means file does NOT exist, which is good.
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error; // Rethrow other errors
    }
  }

  await fs.rename(oldPath, newPath);
  return newPath;
};

const _pathExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

interface FileDetails {
  name: string;
  path: string;
  size: number;
  modified: string;
  isDirectory: boolean;
}

const _getFolderDetails = async (
  basePath: string,
  folderName: string,
): Promise<FileDetails[]> => {
  const folderPath = path.join(basePath, folderName);

  // Verify base directory exists
  try {
    await fs.access(basePath);
  } catch (error) {
    throw new Error(`Base directory does not exist: ${basePath}`);
  }

  // Verify target directory exists
  try {
    const stats = await fs.stat(folderPath);
    if (!stats.isDirectory()) {
      throw new Error(
        `Specified path is not a directory: ${folderPath}`,
      );
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Directory does not exist: ${folderPath}`);
    }
    throw error;
  }

  const entries = await fs.readdir(folderPath, { withFileTypes: true });

  const details = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(folderPath, entry.name);
      try {
        const stats = await fs.stat(entryPath);
        return {
          name: entry.name,
          path: path.relative(basePath, entryPath),
          size: stats.size,
          modified: stats.mtime.toISOString(),
          isDirectory: entry.isDirectory(),
        };
      } catch (error) {
        // If error getting stats for a specific file, skip it
        console.warn(`Could not get information for: ${entryPath}`);
        return null;
      }
    }),
  );

  // Filter out null entries
  return details.filter((detail): detail is FileDetails => detail !== null);
};

interface FileValidityReport {
  exists: boolean;
  isAllowedType: boolean;
  isWithinSize: boolean;
  details: string[];
}

const _checkFileValidity = async (
  filePath: string,
  options?: { allowedExtensions?: string[]; maxSizeInBytes?: number },
): Promise<FileValidityReport> => {
  const extensions = options?.allowedExtensions ?? ALLOWED_EXTENSIONS;
  const maxSize = options?.maxSizeInBytes ?? 1024 * 1024; // 1MB default

  const report: FileValidityReport = {
    exists: false,
    isAllowedType: false,
    isWithinSize: false,
    details: [],
  };

  try {
    const stats = await fs.stat(filePath);
    report.exists = true;

    const ext = path.extname(filePath).toLowerCase();
    if (extensions.includes(ext)) {
      report.isAllowedType = true;
    } else {
      report.details.push(`Extension '${ext}' not allowed.`);
    }

    if (stats.size <= maxSize) {
      report.isWithinSize = true;
    } else {
      report.details.push(
        `File exceeds maximum size (${stats.size} > ${maxSize} bytes).`,
      );
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      report.details.push("File does not exist.");
    } else {
      throw error; // Rethrow unexpected errors
    }
  }

  if (report.details.length > 0) {
    // If there are errors, throw exception so asyncHandler captures it
    // and formats it as a standard error.
    throw new Error(report.details.join(" "));
  }

  return report;
};

const _calculateChecksum = async (
  filePath: string,
  algorithm: string = "sha256",
): Promise<string> => {
  const fileBuffer = await fs.readFile(filePath);
  const hashSum = createHash(algorithm);
  hashSum.update(fileBuffer);
  return hashSum.digest("hex");
};

const _verifyFileIntegrity = async (
  filePath: string,
  expectedSize: number,
  expectedChecksum?: string,
  algorithm: string = "sha256",
): Promise<boolean> => {
  try {
    const stats = await fs.stat(filePath);
    if (stats.size !== expectedSize) {
       console.warn(`File size mismatch: expected ${expectedSize}, got ${stats.size}`);
       return false;
    }
    if (expectedChecksum) {
        const checksum = await _calculateChecksum(filePath, algorithm);
        if (checksum.toLowerCase() !== expectedChecksum.toLowerCase()) {
            console.warn(`Checksum mismatch: expected ${expectedChecksum}, got ${checksum}`);
            return false;
        }
    }
    return true;
  } catch (error) {
    console.error(`Error verifying file integrity: ${error}`);
    return false;
  }
};

// --- Exported Public API ---

/**
 * Set of utilities for safe and asynchronous file and directory manipulation.
 * All operations return an object { success: boolean, ... }
 */
export const FileUtils = {
  /** Creates a file with optional content, creating directories if necessary. */
  createFile: asyncHandler(_createFile),

  /** Reads the content of a text file. */
  readFile: asyncHandler(_readFile),

  /** Writes (or overwrites) content to a file. */
  writeFile: asyncHandler(_writeFile),

  /** Recursively deletes a file or directory. */
  deletePath: asyncHandler(_deletePath),

  /** Renames a file. */
  renameFile: asyncHandler(_renameFile),

  /** Gets a detailed list of folder content. */
  getFolderDetails: asyncHandler(_getFolderDetails),

  /** Checks if a path exists in the filesystem. */
  pathExists: asyncHandler(_pathExists),

  /** Performs a full validation of a file (existence, type, size). */
  checkFileValidity: asyncHandler(_checkFileValidity),

  /** Calculates the checksum of a file. */
  calculateChecksum: asyncHandler(_calculateChecksum),

  /** Verifies file integrity via size and optional checksum. */
  verifyFileIntegrity: asyncHandler(_verifyFileIntegrity),
};
