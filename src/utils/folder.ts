import fs from "node:fs/promises";
import path from "node:path";

// Interface mejorada con más información útil
interface FileDetails {
  name: string;
  path: string;
  absolutePath: string;
  size: number;
  sizeFormatted: string;
  modified: string;
  modifiedDate: Date;
  created: string;
  createdDate: Date; // Agregado para consistencia
  accessed: string;
  accessedDate: Date; // Agregado para consistencia
  isDirectory: boolean;
  extension?: string;
  permissions: string;
  isHidden: boolean;
  // Nuevas propiedades
  mimeType?: string; // Tipo MIME estimado
  relativePath: string; // Ruta relativa desde el directorio base
  depth: number; // Profundidad en la estructura de carpetas
}

// Nueva interface para stats individuales
interface FileStats extends Omit<FileDetails, "relativePath" | "depth"> {
  parentDirectory: string;
  isSymbolicLink: boolean;
  hardLinks: number;
  uid: number;
  gid: number;
  dev: number;
  ino: number;
}

// Opciones mejoradas
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
  // Nuevas opciones
  minSize?: number; // Tamaño mínimo en bytes
  maxSize?: number; // Tamaño máximo en bytes
  modifiedAfter?: Date; // Archivos modificados después de esta fecha
  modifiedBefore?: Date; // Archivos modificados antes de esta fecha
  followSymlinks?: boolean; // Seguir enlaces simbólicos
  includeMimeType?: boolean; // Incluir tipo MIME estimado
  onProgress?: (processed: number, total: number, current: string) => void; // Callback de progreso
}

// Cache para mejorar rendimiento en operaciones repetitivas
const statsCache = new Map<string, { stats: FileStats; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 segundos

// Función mejorada para formatear el tamaño
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  if (bytes < 0) return "N/A";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);

  // Mostrar más decimales para tamaños pequeños
  const decimals = i === 0 ? 0 : i === 1 ? 1 : 2;
  return `${size.toFixed(decimals)} ${sizes[i]}`;
};

// Función mejorada para permisos con información adicional
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

// Nueva función para obtener tipo MIME básico basado en extensión
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

// NUEVA FUNCIÓN: Obtener stats de un solo archivo o directorio
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
    // Verificar cache
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

// Función principal mejorada
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

            // Callback de progreso
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

    // Procesamiento recursivo mejorado con manejo de errores
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

    // Ordenamiento mejorado
    allDetails.sort((a, b) => {
      // Priorizar directorios si se especifica
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

// Funciones de conveniencia mejoradas
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

// Función mejorada y renombrada para mayor claridad
const getFolderStats = async (
  folderPath: string,
): Promise<FileStats | null> => {
  return getItemStats(folderPath);
};

// NUEVAS FUNCIONES ÚTILES

// Obtener archivos por tipo MIME
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

// Obtener resumen de directorio - simplificado y optimizado
const getDirectorySummary = async (
  basePath: string,
  options: GetFolderOptions & {
    includeFileTypes?: boolean;
    processSubdirectories?: boolean; // NUEVO: controla si procesa recursivamente
  } = {},
): Promise<{
  totalFiles: number;
  totalDirectories: number;
  totalSize: number;
  totalSizeFormatted: string;
  fileTypes?: Record<string, number>;
  isRecursive: boolean; // Indica si los números incluyen subdirectorios
}> => {
  const {
    includeFileTypes = false,
    processSubdirectories = false, // Por defecto NO procesa subdirectorios
    ...folderOptions
  } = options;

  // Solo procesar recursivamente si se solicita explícitamente
  const items = await getFolderDetails(basePath, "", {
    ...folderOptions,
    recursive: processSubdirectories,
    maxDepth: processSubdirectories ? folderOptions.maxDepth || Infinity : 0,
  });

  const files = items.filter((item) => !item.isDirectory);
  const directories = items.filter((item) => item.isDirectory);

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  const result: any = {
    totalFiles: files.length,
    totalDirectories: directories.length,
    totalSize,
    totalSizeFormatted: formatFileSize(totalSize),
    isRecursive: processSubdirectories,
  };

  // Solo calcular tipos de archivo si se solicita explícitamente
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

// NUEVA FUNCIÓN: Stats súper rápidos solo del directorio actual (no recursivo)
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

    // Procesar entradas de forma síncrona para máxima velocidad
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

// Ejemplo de uso mejorado
async function example() {
  const testPATH = "C:/Users/mm/Documents/GitHub/buntralino/overlay_apirest";

  try {
    // Obtener stats de un archivo específico
    const fileStats = await getItemStats(path.join(testPATH, "package.json"));
    console.log("Stats de package.json:", fileStats);

    // Obtener stats de un directorio
    const dirStats = await getItemStats(testPATH);
    console.log("Stats del directorio:", dirStats);

    // Obtener solo directorios
    const directories = await getDirectoriesOnly(testPATH);

    // Obtener archivos con progreso
    const files = await getFilesOnly(testPATH, "", {
      onProgress: (processed, total, current) => {
        console.log(`Procesando: ${processed}/${total} - ${current}`);
      },
    });

    // Buscar archivos JavaScript/TypeScript con filtros avanzados
    const jsFiles = await getFolderDetails(testPATH, "", {
      includeDirectories: false,
      filterExtensions: [".js", ".ts", ".jsx", ".tsx"],
      modifiedAfter: new Date("2024-01-01"),
      minSize: 100, // mínimo 100 bytes
      sortBy: "size",
      sortOrder: "desc",
      includeMimeType: true,
    });

    // Obtener archivos de imagen
    const imageFiles = await getFilesByMimeType(
      testPATH,
      ["image/jpeg", "image/png", "image/gif", "image/svg+xml"],
      { recursive: true },
    );

    // STATS SÚPER RÁPIDOS - Solo directorio actual (recomendado para UI)
    const quickStats = await getQuickDirectoryStats(testPATH);
    console.log("Stats instantáneos:", quickStats);

    // Resumen rápido del directorio actual (sin tipos de archivo, sin subdirectorios)
    const currentLevelSummary = await getDirectorySummary(testPATH);
    console.log("Resumen nivel actual:", currentLevelSummary);

    // Resumen completo recursivo (más lento - solo usar cuando sea necesario)
    const recursiveSummary = await getDirectorySummary(testPATH, {
      processSubdirectories: false,
      maxDepth: 3,
      includeFileTypes: false,
    });
    console.log("Resumen recursivo:", recursiveSummary);
  } catch (error) {
    console.error("Error en ejemplo:", error);
  }
}
//example().catch(console.error);
export {
  getFolderDetails,
  getDirectoriesOnly,
  getFilesOnly,
  getFolderStats, // Mantener compatibilidad
  getItemStats, // Nueva función principal
  getFilesByMimeType,
  getDirectorySummary,
  getQuickDirectoryStats, // NUEVA función súper rápida
  clearStatsCache,
  formatFileSize, // Exportar para uso externo
  type FileDetails,
  type FileStats,
  type GetFolderOptions,
};
