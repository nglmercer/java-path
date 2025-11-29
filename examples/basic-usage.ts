// Basic usage example for Java-Path library
import {
  env,
  getJavaInfoByVersion,
  scanJavaInstallations,
  FileUtils,
  CommandUtils,
} from "../index.js";

async function main() {
  console.log("=== Java-Path Library Demo ===\n");

  // 1. Environment Detection
  console.log("1. Environment Detection:");
  console.log(`Platform: ${env.platform.name} (${env.platform.ext})`);
  console.log(`Architecture: ${env.arch}`);
  console.log(`Is Windows: ${env.isWindows()}`);
  console.log(`Is macOS: ${env.isMacOS()}`);
  console.log(`Is Linux: ${env.isLinux()}`);
  console.log("");

  // 2. Java Information
  console.log("2. Java Information:");
  const javaVersions = ["8", "11", "17", "21"];

  for (const version of javaVersions) {
    const javaInfo = getJavaInfoByVersion(version);
    if (javaInfo) {
      console.log(`Java ${version}:`);
      if (javaInfo.isTermux) {
        console.log(`  Type: Termux Package`);
        console.log(`  Package: ${javaInfo.packageName}`);
        console.log(`  Install Command: ${javaInfo.installCmd}`);
        console.log(`  Installed: ${javaInfo.installed}`);
      } else {
        console.log(`  Type: Standard Distribution`);
        console.log(`  Download URL: ${javaInfo.url}`);
        console.log(`  Filename: ${javaInfo.filename}`);
        console.log(`  Download Path: ${javaInfo.downloadPath}`);
      }
    }
  }
  console.log("");

  // 3. Scan for Java Installations
  console.log("3. Scanning for Java Installations:");
  try {
    const installations = await scanJavaInstallations("./binaries/java");
    console.log(`Found ${installations.length} Java installations:`);

    for (const installation of installations) {
      console.log(`  Java ${installation.featureVersion}:`);
      console.log(`    Folder: ${installation.folderName}`);
      console.log(`    Path: ${installation.installPath}`);
      console.log(`    Architecture: ${installation.arch}`);
      console.log(`    OS: ${installation.os}`);
      console.log(`    Valid: ${installation.isValid}`);
    }
  } catch (error) {
    console.log("No Java installations found or error occurred:", error);
  }
  console.log("");
  // Check for available commands
  const nodeCheck = await CommandUtils.isCommandAvailable("node");
  if (nodeCheck.success) {
    console.log(`Node.js command available: ${nodeCheck.data}`);
  }

  // Detect package manager
  const pmResult = await CommandUtils.getPackageManager();
  if (pmResult.success) {
    const pm = pmResult.data;
    console.log(`Package manager: ${pm || "Not detected"}`);

    // Check if a package is installed
    if (pm) {
      const packageResult = await CommandUtils.isPackageInstalled("curl");
      if (packageResult.success) {
        console.log(`curl installed: ${packageResult.data}`);
      }
    }
  }

  console.log("\n=== Demo Complete ===");
}

// Run the example
main().catch(console.error);
