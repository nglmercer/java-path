import fs from "node:fs/promises";
import path from "node:path";

interface FileDetails {
  name: string;
  path: string;
  absolutePath: string;
  size: number;
  sizeFormatted: string;
  modified: string;
  modifiedDate: Date;
  created: string;
  createdDate: Date; 
  accessed: string;
  accessedDate: Date; 
  isDirectory: boolean;
  extension?: string;
  permissions: string;
  isHidden: boolean;
  mimeType?: string; 
  relativePath: string; 
  depth: number; 
}
interface FileStats extends Omit<FileDetails, "relativePath" | "depth"> {
  parentDirectory: string;
  isSymbolicLink: boolean;
  hardLinks: number;
  uid: number;
  gid: number;
  dev: number;
  ino: number;
}

interface GetFolderOptions {
  includeDirectories?: boolean;
  includeFiles?: boolean;
  recursive?: boolean;
  maxDepth?: number;
  sortBy?: "name" | "size" | "modified" | "created" | "accessed" | "extension";
  sortOrder?: "asc" | "desc";
  includeHidden?: boolean;
  filterExtensions?: string[];
  filterPattern?: RegExp;
  includeDotFiles?: boolean;
  minSize?: number; 
  maxSize?: number; 
  modifiedAfter?: Date; 
  modifiedBefore?: Date; 
  followSymlinks?: boolean; 
  includeMimeType?: boolean; 
  onProgress?: (processed: number, total: number, current: string) => void;
}

const statsCache = new Map<string, { stats: FileStats; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 segundos

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  if (bytes < 0) return "N/A";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);

  const decimals = i === 0 ? 0 : i === 1 ? 1 : 2;
  return `${size.toFixed(decimals)} ${sizes[i]}`;
};

const getPermissions = (mode: number): string => {
  const permissions = [];

  // Owner permissions
  permissions.push(mode & 0o400 ? "r" : "-");
  permissions.push(mode & 0o200 ? "w" : "-");
  permissions.push(mode & 0o100 ? "x" : "-");

  // Group permissions
  permissions.push(mode & 0o040 ? "r" : "-");
  permissions.push(mode & 0o020 ? "w" : "-");
  permissions.push(mode & 0o010 ? "x" : "-");

  // Others permissions
  permissions.push(mode & 0o004 ? "r" : "-");
  permissions.push(mode & 0o002 ? "w" : "-");
  permissions.push(mode & 0o001 ? "x" : "-");

  return permissions.join("");
};

const getMimeType = (extension: string): string | undefined => {
  const mimeTypes: Record<string, string> = {
    ".txt": "text/plain",
    ".html": "text/html",
    ".css": "text/css",
    ".js": "text/javascript",
    ".ts": "text/typescript",
    ".json": "application/json",
    ".xml": "application/xml",
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".mp3": "audio/mpeg",
    ".mp4": "video/mp4",
    ".zip": "application/zip",
    ".rar": "application/x-rar-compressed",
    ".exe": "application/x-executable",
    ".dll": "application/x-msdownload",
    ".py": "text/x-python",
    ".cpp": "text/x-c++src",
    ".c": "text/x-csrc",
    ".java": "text/x-java-source",
    ".php": "text/x-php",
    ".md": "text/markdown",
  };

  return mimeTypes[extension.toLowerCase()];
};

const getItemStats = async (
  itemPath: string,
  options: {
    useCache?: boolean;
    includeMimeType?: boolean;
    followSymlinks?: boolean;
  } = {},
): Promise<FileStats | null> => {
  const {
    useCache = true,
    includeMimeType = true,
    followSymlinks = false,
  } = options;

  try {

    if (useCache && statsCache.has(itemPath)) {
      const cached = statsCache.get(itemPath)!;
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.stats;
      }
      statsCache.delete(itemPath);
    }

    const absolutePath = path.resolve(itemPath);
    const stats = followSymlinks
      ? await fs.stat(absolutePath)
      : await fs.lstat(absolutePath);

    const parsedPath = path.parse(absolutePath);
    const isDirectory = stats.isDirectory();
    const isSymbolicLink = stats.isSymbolicLink();
    const extension = isDirectory ? undefined : parsedPath.ext.toLowerCase();

    const fileStats: FileStats = {
      name: parsedPath.base,
      path: itemPath,
      absolutePath,
      size: isDirectory ? 0 : stats.size,
      sizeFormatted: isDirectory ? "-" : formatFileSize(stats.size),
      modified: stats.mtime.toISOString(),
      modifiedDate: stats.mtime,
      created: stats.birthtime.toISOString(),
      createdDate: stats.birthtime,
      accessed: stats.atime.toISOString(),
      accessedDate: stats.atime,
      isDirectory,
      extension,
      permissions: getPermissions(stats.mode),
      isHidden: parsedPath.base.startsWith("."),
      mimeType:
        includeMimeType && extension ? getMimeType(extension) : undefined,
      parentDirectory: parsedPath.dir,
      isSymbolicLink,
      hardLinks: stats.nlink,
      uid: stats.uid,
      gid: stats.gid,
      dev: stats.dev,
      ino: stats.ino,
    };

    // Guardar en cache
    if (useCache) {
      statsCache.set(itemPath, {
        stats: fileStats,
        timestamp: Date.now(),
      });
    }

    return fileStats;
  } catch (error) {
    console.error(`Error getting stats for ${itemPath}:`, error);
    return null;
  }
};

const getFolderDetails = async (
  basePath: string,
  folderName: string = "",
  options: GetFolderOptions = {},
  currentDepth: number = 0,
): Promise<FileDetails[]> => {
  const {
    includeDirectories = true,
    includeFiles = true,
    recursive = false,
    maxDepth = Infinity,
    sortBy = "name",
    sortOrder = "asc",
    includeHidden = false,
    filterExtensions,
    filterPattern,
    includeDotFiles = false,
    minSize,
    maxSize,
    modifiedAfter,
    modifiedBefore,
    followSymlinks = false,
    includeMimeType = false,
    onProgress,
  } = options;

  if (currentDepth > maxDepth) {
    return [];
  }

  const folderPath = folderName ? path.join(basePath, folderName) : basePath;

  try {
    const entries = await fs.readdir(folderPath, { withFileTypes: true });
    let allDetails: FileDetails[] = [];
    let processedCount = 0;

    const details = await Promise.all(
      entries
        .filter((entry) => {
          if (
            !includeHidden &&
            entry.name.startsWith(".") &&
            !includeDotFiles
          ) {
            return false;
          }
          if (!includeDirectories && entry.isDirectory()) return false;
          if (!includeFiles && !entry.isDirectory()) return false;
          return true;
        })
        .map(async (entry) => {
          const entryPath = path.join(folderPath, entry.name);

          try {
            const stats = followSymlinks
              ? await fs.stat(entryPath)
              : await fs.lstat(entryPath);

            const isDirectory = entry.isDirectory();
            const extension = isDirectory
              ? undefined
              : path.extname(entry.name).toLowerCase();

            // Aplicar filtros de tamaño
            if (!isDirectory) {
              if (minSize !== undefined && stats.size < minSize) return null;
              if (maxSize !== undefined && stats.size > maxSize) return null;
            }

            // Aplicar filtros de fecha
            if (modifiedAfter && stats.mtime < modifiedAfter) return null;
            if (modifiedBefore && stats.mtime > modifiedBefore) return null;

            const fileDetail: FileDetails = {
              name: entry.name,
              path: path.relative(basePath, entryPath),
              absolutePath: entryPath,
              size: isDirectory ? 0 : stats.size,
              sizeFormatted: isDirectory ? "-" : formatFileSize(stats.size),
              modified: stats.mtime.toISOString(),
              modifiedDate: stats.mtime,
              created: stats.birthtime.toISOString(),
              createdDate: stats.birthtime,
              accessed: stats.atime.toISOString(),
              accessedDate: stats.atime,
              isDirectory,
              extension,
              permissions: getPermissions(stats.mode),
              isHidden: entry.name.startsWith("."),
              mimeType:
                includeMimeType && extension
                  ? getMimeType(extension)
                  : undefined,
              relativePath: path.relative(basePath, entryPath),
              depth: currentDepth,
            };

            // Aplicar filtros adicionales
            if (filterExtensions && !isDirectory) {
              if (!filterExtensions.includes(extension || "")) return null;
            }

            if (filterPattern && !filterPattern.test(entry.name)) {
              return null;
            }

            if (onProgress) {
              processedCount++;
              onProgress(processedCount, entries.length, entryPath);
            }

            return fileDetail;
          } catch (error) {
            console.warn(`Error processing ${entryPath}:`, error);
            return null;
          }
        }),
    );

    const validDetails = details.filter(
      (detail): detail is FileDetails => detail !== null,
    );
    allDetails.push(...validDetails);

    if (recursive && currentDepth < maxDepth) {
      const subdirectories = validDetails.filter(
        (detail) => detail.isDirectory,
      );

      const recursiveResults = await Promise.allSettled(
        subdirectories.map((subdir) =>
          getFolderDetails(basePath, subdir.path, options, currentDepth + 1),
        ),
      );

      recursiveResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          allDetails.push(...result.value);
        } else {
          console.warn(
            `Error processing subdirectory ${subdirectories[index]!.name}:`,
            result.reason,
          );
        }
      });
    }

    allDetails.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;

      let comparison = 0;

      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name, undefined, {
            numeric: true,
            sensitivity: "base",
          });
          break;
        case "size":
          comparison = a.size - b.size;
          break;
        case "modified":
          comparison = a.modifiedDate.getTime() - b.modifiedDate.getTime();
          break;
        case "created":
          comparison = a.createdDate.getTime() - b.createdDate.getTime();
          break;
        case "accessed":
          comparison = a.accessedDate.getTime() - b.accessedDate.getTime();
          break;
        case "extension":
          comparison = (a.extension || "").localeCompare(b.extension || "");
          break;
      }

      return sortOrder === "desc" ? -comparison : comparison;
    });

    return allDetails;
  } catch (error) {
    console.error(`Error reading directory ${folderPath}:`, error);
    return [];
  }
};

const getDirectoriesOnly = async (
  basePath: string,
  folderName: string = "",
  options: Omit<GetFolderOptions, "includeFiles" | "includeDirectories"> = {},
): Promise<FileDetails[]> => {
  return getFolderDetails(basePath, folderName, {
    ...options,
    includeFiles: false,
    includeDirectories: true,
  });
};

const getFilesOnly = async (
  basePath: string,
  folderName: string = "",
  options: Omit<GetFolderOptions, "includeFiles" | "includeDirectories"> = {},
): Promise<FileDetails[]> => {
  return getFolderDetails(basePath, folderName, {
    ...options,
    includeFiles: true,
    includeDirectories: false,
  });
};

const getFolderStats = async (
  folderPath: string,
): Promise<FileStats | null> => {
  return getItemStats(folderPath);
};

const getFilesByMimeType = async (
  basePath: string,
  mimeTypes: string[],
  options: Omit<GetFolderOptions, "includeMimeType"> = {},
): Promise<FileDetails[]> => {
  const files = await getFolderDetails(basePath, "", {
    ...options,
    includeDirectories: false,
    includeMimeType: true,
  });

  return files.filter(
    (file) => file.mimeType && mimeTypes.includes(file.mimeType),
  );
};

const getDirectorySummary = async (
  basePath: string,
  options: GetFolderOptions & {
    includeFileTypes?: boolean;
    processSubdirectories?: boolean;
  } = {},
) => {
  const {
    includeFileTypes = false,
    processSubdirectories = false,
    ...folderOptions
  } = options;

  const items = await getFolderDetails(basePath, "", {
    ...folderOptions,
    recursive: processSubdirectories,
    maxDepth: processSubdirectories ? folderOptions.maxDepth || Infinity : 0,
  });

  const files = items.filter((item) => !item.isDirectory);
  const directories = items.filter((item) => item.isDirectory);

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  const result = {
    totalFiles: files.length,
    totalDirectories: directories.length,
    totalSize,
    totalSizeFormatted: formatFileSize(totalSize),
    isRecursive: processSubdirectories,
    fileTypes: includeFileTypes ? {} : undefined,
  };

  if (includeFileTypes) {
    const fileTypes: Record<string, number> = {};
    files.forEach((file) => {
      const ext = file.extension || "sin extensión";
      fileTypes[ext] = (fileTypes[ext] || 0) + 1;
    });
    result.fileTypes = fileTypes;
  }

  return result;
};

const getQuickDirectoryStats = async (
  basePath: string,
): Promise<{
  filesCount: number;
  directoriesCount: number;
  totalSizeCurrentLevel: number;
  totalSizeFormatted: string;
}> => {
  try {
    const entries = await fs.readdir(basePath, { withFileTypes: true });

    let filesCount = 0;
    let directoriesCount = 0;
    let totalSize = 0;

    const sizePromises = entries.map(async (entry) => {
      if (entry.isDirectory()) {
        directoriesCount++;
        return 0;
      } else {
        filesCount++;
        try {
          const stats = await fs.stat(path.join(basePath, entry.name));
          return stats.size;
        } catch {
          return 0;
        }
      }
    });

    const sizes = await Promise.all(sizePromises);
    totalSize = sizes.reduce((sum, size) => sum + size, 0);

    return {
      filesCount,
      directoriesCount,
      totalSizeCurrentLevel: totalSize,
      totalSizeFormatted: formatFileSize(totalSize),
    };
  } catch (error) {
    console.error(`Error getting quick stats for ${basePath}:`, error);
    return {
      filesCount: 0,
      directoriesCount: 0,
      totalSizeCurrentLevel: 0,
      totalSizeFormatted: "0 B",
    };
  }
};

// Limpiar cache
const clearStatsCache = (): void => {
  statsCache.clear();
};

export {
  getFolderDetails,
  getDirectoriesOnly,
  getFilesOnly,
  getFolderStats,
  getItemStats,
  getFilesByMimeType,
  getDirectorySummary,
  getQuickDirectoryStats,
  clearStatsCache,
  formatFileSize,
  type FileDetails,
  type FileStats,
  type GetFolderOptions,
};
