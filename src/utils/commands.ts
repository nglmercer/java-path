import { exec, execSync } from "node:child_process";
import { promisify } from "node:util";
import { isWindows, isLinux } from "../platforms/env.js"; // Importamos los detectores de SO
import { asyncHandler } from "./file.js";
/**
 * Ejecuta un comando de forma síncrona y devuelve su salida.
 * Lanza un error si el comando falla (exit code no es 0).
 * @param command El comando a ejecutar.
 * @returns El resultado (stdout) del comando como string.
 */
const execAsync = promisify(exec);
function runSync(command: string): string {
  // Usamos { stdio: 'pipe' } para capturar la salida y 'ignore' para el error,
  // y 'inherit' para la entrada. Esto evita que los errores se impriman en la consola.
  // El error se captura con el bloque try/catch.
  return execSync(command, {
    encoding: "utf8",
    stdio: ["inherit", "pipe", "ignore"],
  });
}
const _runCommand = async (command: string): Promise<string> => {
  const { stdout } = await execAsync(command);
  return stdout.trim();
};
/**
 * Comprueba si un comando está disponible en el PATH del sistema.
 * @param commandName El nombre del comando a verificar (ej. "git", "java").
 * @returns `true` si el comando existe, `false` en caso contrario.
 */
export function isCommandAvailable(commandName: string): boolean {
  try {
    // 'where' en Windows y 'which' en Linux/macOS son los comandos nativos
    // para localizar un ejecutable en el PATH. Son más fiables que solo intentar ejecutarlo.
    const checkCommand = isWindows() ? "where" : "which";
    runSync(`${checkCommand} ${commandName}`);
    return true;
  } catch (error) {
    return false;
  }
}
const _isCommandAvailable = async (command: string): Promise<boolean> => {
  const checkCmd = isWindows() ? "where" : "which";
  await _runCommand(`${checkCmd} ${command}`);
  // Si _runCommand no lanza error, el comando existe.
  return true;
};

const _getPackageManager = async (): Promise<string> => {
  const managers = [
    "apt",
    "pkg",
    "dnf",
    "yum",
    "pacman",
    "brew",
    "winget",
    "choco",
  ];
  for (const manager of managers) {
    // Usamos la versión sin envolver para un control más fino del flujo
    try {
      await _isCommandAvailable(manager);
      return manager;
    } catch {
      // Ignoramos el error y continuamos con el siguiente
      continue;
    }
  }
  throw new Error("No se pudo detectar un gestor de paquetes compatible.");
};
/**
 * Detecta el gestor de paquetes por defecto disponible en el sistema.
 * @returns El nombre del gestor de paquetes (ej. "apt", "brew", "winget") o null si no se encuentra uno compatible.
 */
export function getPackageManager(): string | null {
  // Lista de gestores de paquetes en orden de preferencia o commonality
  const managers = [
    // Linux
    "apt", // Debian, Ubuntu
    "dnf", // Fedora, CentOS
    "yum", // CentOS (legacy)
    "pacman", // Arch Linux
    // macOS
    "brew", // Homebrew
    // Windows
    "winget", // Windows Package Manager
    "choco", // Chocolatey
    // Android (Termux)
    "pkg",
  ];

  for (const manager of managers) {
    if (isCommandAvailable(manager)) {
      return manager;
    }
  }

  return null;
}

/**
 * Interfaz para la información de la distribución de Linux.
 */
export interface LinuxDistroInfo {
  id: string; // ej. "ubuntu", "fedora", "arch"
  versionId: string; // ej. "22.04"
}

/**
 * Obtiene información de la distribución de Linux parseando /etc/os-release.
 * @returns Un objeto con el ID y la versión de la distro, o null si no se puede determinar.
 */
export function getLinuxDistroInfo(): LinuxDistroInfo | null {
  if (!isLinux()) {
    return null;
  }
  try {
    // /etc/os-release es el estándar moderno para obtener esta información
    const output = runSync("cat /etc/os-release");
    const lines = output.split("\n");
    const info: Partial<LinuxDistroInfo> = {};

    lines.forEach((line) => {
      if (line.startsWith("ID=")) {
        info.id = line.replace("ID=", "").replace(/"/g, "").trim();
      } else if (line.startsWith("VERSION_ID=")) {
        info.versionId = line
          .replace("VERSION_ID=", "")
          .replace(/"/g, "")
          .trim();
      }
    });

    if (info.id && info.versionId) {
      return info as LinuxDistroInfo;
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Comprueba si un paquete está instalado utilizando el gestor de paquetes del sistema.
 * @param packageName El nombre del paquete a verificar. ¡OJO! Este nombre puede variar entre distros.
 * @param pm Opcional. El gestor de paquetes a usar. Si no se provee, se auto-detecta.
 * @returns `true` si el paquete está instalado, `false` en caso contrario.
 */
export function isPackageInstalled(packageName: string, pm?: string): boolean {
  try {
    const packageManager = pm || getPackageManager();

    if (!packageManager) {
      // Si no hay gestor de paquetes, no podemos comprobar.
      return false;
    }
    switch (packageManager) {
      case "apt":
        // `dpkg -s` devuelve un estado detallado. Si no está instalado, da un exit code != 0.
        runSync(`dpkg -s ${packageName}`);
        return true;

      case "pkg": // Termux
        // `pkg list-installed` es silencioso y efectivo.
        return runSync(`pkg list-installed ${packageName}`).includes(
          packageName,
        );

      case "dnf":
      case "yum":
        // `rpm -q` es el comando subyacente para consultar la base de datos de paquetes.
        runSync(`rpm -q ${packageName}`);
        return true;

      case "pacman":
        // `pacman -Q` consulta la base de datos local.
        runSync(`pacman -Q ${packageName}`);
        return true;

      case "brew":
        // `brew list --versions` devuelve la versión si está instalado, o nada si no lo está.
        // Si no está instalado, el comando falla.
        runSync(`brew list --versions ${packageName}`);
        return true;

      case "winget":
        // `winget list` filtra por nombre. Si no encuentra nada, la salida es vacía.
        return runSync(`winget list --name "${packageName}"`).includes(
          packageName,
        );

      case "choco":
        // `choco list --local-only` busca solo paquetes instalados.
        return runSync(
          `choco list --local-only --exact ${packageName}`,
        ).includes("1 packages installed.");

      default:
        console.warn(
          `Comprobación de paquete no implementada para el gestor: ${packageManager}`,
        );
        return false;
    }
  } catch (error) {
    // Si cualquiera de los comandos falla, significa que el paquete no está instalado.
    return false;
  }
}
const _isPackageInstalled = async (packageName: string): Promise<boolean> => {
  const pmResult = await getPackageManager(); // Usamos la versión envuelta
  if (!pmResult) {
    return false; // Si no hay gestor, no podemos comprobar
  }
  const pm = pmResult as string; // Aseguramos que es un string

  let command: string;
  switch (pm) {
    case "apt":
      command = `dpkg -s ${packageName}`;
      break;
    case "pkg":
      command = `pkg list-installed ${packageName}`;
      break;
    case "dnf":
    case "yum":
      command = `rpm -q ${packageName}`;
      break;
    case "pacman":
      command = `pacman -Q ${packageName}`;
      break;
    case "brew":
      command = `brew list --versions ${packageName}`;
      break;
    case "winget":
      command = `winget list --name "${packageName}"`;
      break;
    case "choco":
      command = `choco list --local-only --exact ${packageName}`;
      break;
    default:
      throw new Error(`Comprobación no implementada para el gestor: ${pm}`);
  }

  const output = await _runCommand(command);

  // Algunas comprobaciones necesitan verificar la salida además del código de éxito
  if (pm === "winget" || pm === "pkg") {
    return output.includes(packageName);
  }
  if (pm === "choco") {
    return output.includes("1 packages installed.");
  }
  return true; // Para los demás, el éxito del comando es suficiente
};

/**
 * Conjunto de utilidades para ejecutar comandos del sistema de forma asíncrona.
 */
export const CommandUtils = {
  /** Ejecuta un comando y devuelve su salida. */
  run: asyncHandler(_runCommand),
  /** Verifica si un comando está disponible en el PATH. */
  isCommandAvailable: asyncHandler(_isCommandAvailable),
  /** Detecta el gestor de paquetes por defecto del sistema. */
  getPackageManager: asyncHandler(_getPackageManager),
  /** Verifica si un paquete está instalado a través del gestor del sistema. */
  isPackageInstalled: asyncHandler(_isPackageInstalled),
};
