import { spawn } from "node:child_process";
import path from "node:path";

const maxAttempts = 6;
const retryDelayMs = 5_000;
const prismaCli = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");

function runMigration() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [prismaCli, "migrate", "deploy"], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["inherit", "pipe", "pipe"],
    });
    let output = "";

    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
      process.stdout.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
      process.stderr.write(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? 1, output }));
  });
}

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  const result = await runMigration();
  if (result.code === 0) process.exit(0);

  const advisoryLockTimeout = /P1002/i.test(result.output) && /advisory lock/i.test(result.output);
  if (!advisoryLockTimeout || attempt === maxAttempts) {
    process.exit(result.code);
  }

  console.warn(
    `Prisma migration advisory lock timed out (attempt ${attempt}/${maxAttempts}). Retrying in ${retryDelayMs / 1000}s...`,
  );
  await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
}
