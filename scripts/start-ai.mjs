import { existsSync, readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { delimiter, dirname } from "node:path";

const dir = new URL("../.local/ai/", import.meta.url).pathname;
async function find(path) {
  if (!existsSync(path)) return null;
  for (const entry of await readdir(path, { withFileTypes: true })) {
    if (entry.name === "llama-server") return path + "/" + entry.name;
    if (entry.isDirectory()) {
      const found = await find(path + "/" + entry.name);
      if (found) return found;
    }
  }
  return null;
}
const binary = (await find(dir)) ?? "llama-server";
const model = dir + "Qwen3-0.6B-Q8_0.gguf";
if (!existsSync(model)) {
  console.error("Run npm run ai:setup before starting the model.");
  process.exit(1);
}
if (process.platform === "linux") {
  const available = Number(
    readFileSync("/proc/meminfo", "utf8").match(/MemAvailable:\s+(\d+)/)?.[1] ??
      0,
  );
  if (available < 1300 * 1024) {
    console.error(
      "Not enough available RAM (need 1.3 GB). Stop other task processes or use a separate machine; the model has not been started.",
    );
    process.exit(1);
  }
}
const args = [
  "-m",
  model,
  "--host",
  "127.0.0.1",
  "--port",
  "8080",
  "-c",
  "4096",
  "-t",
  "1",
  "--parallel",
  "1",
  "--alias",
  "qwen3-0.6b",
  "--jinja",
  "--chat-template-kwargs",
  '{"enable_thinking":false}',
];
const limited =
  process.platform === "linux" &&
  process.getuid?.() === 0 &&
  existsSync("/run/systemd/system");
console.log(
  limited
    ? "Starting with a hard 1.1 GB memory limit and a one-core CPU budget."
    : "Starting one model worker with a 4096-token context.",
);
const child = spawn(
  limited ? "systemd-run" : binary,
  limited
    ? [
        "--scope",
        "--quiet",
        "-p",
        "MemoryMax=1100M",
        "-p",
        "MemoryHigh=1050M",
        "-p",
        "CPUQuota=100%",
        binary,
        ...args,
      ]
    : args,
  {
    stdio: "inherit",
    env: {
      ...process.env,
      LD_LIBRARY_PATH: [dirname(binary), process.env.LD_LIBRARY_PATH]
        .filter(Boolean)
        .join(delimiter),
    },
  },
);
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
