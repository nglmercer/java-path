#!/usr/bin/env bun
/**
 * Example: Java Path Detection
 * 
 * This example demonstrates how to use the new Java path detection
 * functionality in the java-path library.
 */

import { CommandUtils, detectJavaPathsSync, validateJavaPathSync, isCommandAvailable } from "../index.ts";

async function demonstrateJavaPathDetection() {
  console.log("🔍 Java Path Detection Example");
  console.log("=====================================\n");

  // 1. Check if Java is available on the system
  console.log("1. Checking if Java is available...");
  const javaAvailable = isCommandAvailable("java");
  console.log(`   Java available: ${javaAvailable}\n`);

  if (!javaAvailable) {
    console.log("❌ Java is not available on this system.");
    console.log("   Please install Java to see path detection in action.");
    return;
  }

  // 2. Synchronously detect Java paths
  console.log("2. Synchronously detecting Java paths...");
  const syncPaths = detectJavaPathsSync();
  console.log(`   Found ${syncPaths.length} Java path(s):`);
  syncPaths.forEach((path: string, index: number) => {
    console.log(`   ${index + 1}. ${path}`);
  });
  console.log();

  // 3. Asynchronously detect Java paths
  console.log("3. Asynchronously detecting Java paths...");
  const asyncResult = await (CommandUtils as any).detectJavaPaths();
  if (asyncResult.success) {
    console.log(`   Found ${asyncResult.data.length} Java path(s):`);
    asyncResult.data.forEach((path: string, index: number) => {
      console.log(`   ${index + 1}. ${path}`);
    });
  } else {
    console.log("   Error detecting Java paths:", asyncResult.error);
  }
  console.log();

  // 4. Validate Java paths
  console.log("4. Validating detected Java paths...");
  if (syncPaths.length > 0) {
    for (const javaPath of syncPaths) {
      // Synchronous validation
      const syncValid = validateJavaPathSync(javaPath);
      console.log(`   ${javaPath}`);
      console.log(`   Synchronous validation: ${syncValid ? "✅ Valid" : "❌ Invalid"}`);

      // Asynchronous validation
      const asyncResult = await CommandUtils.validateJavaPath(javaPath);
      if (asyncResult.success) {
        console.log(`   Asynchronous validation: ${asyncResult.data ? "✅ Valid" : "❌ Invalid"}`);
      } else {
        console.log(`   Asynchronous validation: ❌ Error - ${asyncResult.error}`);
      }
      console.log();
    }
  }

  // 5. Test with invalid paths
  console.log("5. Testing validation with invalid paths...");
  const invalidPaths = [
    "/nonexistent/path/java",
    "C:\\Windows\\System32\\notjava.exe",
    "",
    null
  ];

  for (const invalidPath of invalidPaths) {
    if (typeof invalidPath === 'string') {
      const result = validateJavaPathSync(invalidPath);
      console.log(`   ${invalidPath}: ${result ? "✅ Valid" : "❌ Invalid"}`);
    } else {
    //@ts-expect-error
      const result = await CommandUtils.validateJavaPath(invalidPath);
      console.log(`   ${invalidPath}: ${result.data ? "✅ Valid" : "❌ Invalid"}`);
    }
  }
  console.log();

  console.log("✅ Java path detection example completed!");
}

// Run the demonstration
demonstrateJavaPathDetection().catch(console.error);