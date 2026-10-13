import { mkdir, rename, rm } from "node:fs/promises";
import { createWriteStream, createReadStream, existsSync } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

if (!process.argv.includes("--download")) {
  console.log(
    "Optional AI setup downloads 640 MB of verified weights, then converts them to a 391 MB Q4 model. Linux runtime archive: 17 MB. Allow 1 GB available RAM and 1.1 GB temporary disk space for setup.",
  );
  console.log("To opt in: npm run ai:setup -- --download");
  process.exit(0);
}
const dir = new URL("../.local/ai/", import.meta.url);
await mkdir(dir, { recursive: true });
const optimizedModel = new URL("Qwen3-0.6B-Q4_K_M.gguf", dir);
if (existsSync(optimizedModel) && existsSync(new URL("model.sha256", dir))) {
  const { readFile } = await import("node:fs/promises");
  const checksum = createHash("sha256");
  for await (const chunk of createReadStream(optimizedModel))
    checksum.update(chunk);
  if (
    checksum.digest("hex") ===
    (await readFile(new URL("model.sha256", dir), "utf8")).trim()
  ) {
    console.log("Quantized model is already verified. No downloads needed.");
    process.exit(0);
  }
}
async function download(url, name, checksum) {
  const target = new URL(name, dir);
  const hashFile = async (path) => {
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(path)) hash.update(chunk);
    return hash.digest("hex");
  };
  if (existsSync(target) && (await hashFile(target)) === checksum) {
    console.log(`${name}: already verified`);
    return target;
  }
  const partial = new URL(name + ".partial", dir);
  console.log(`Downloading ${name} from ${new URL(url).hostname}…`);
  const response = await fetch(url, { signal: AbortSignal.timeout(600000) });
  if (!response.ok || !response.body)
    throw new Error(`Download failed: HTTP ${response.status}`);
  await pipeline(Readable.fromWeb(response.body), createWriteStream(partial));
  if ((await hashFile(partial)) !== checksum) {
    await rm(partial);
    throw new Error(`Checksum mismatch for ${name}`);
  }
  await rename(partial, target);
  console.log(`${name}: SHA-256 verified`);
  return target;
}

if (process.platform !== "linux" || process.arch !== "x64") {
  console.log(
    "Automatic runtime installation supports Linux x64. On macOS: brew install llama.cpp. On other systems install llama-server from https://github.com/ggml-org/llama.cpp/releases and put it on PATH.",
  );
} else {
  const archive = await download(
    "https://github.com/ggml-org/llama.cpp/releases/download/b11588/llama-b11588-bin-ubuntu-x64.tar.gz",
    "runtime.tar.gz",
    "656cba79ba40776e766070145e6d6b2f23b06158803b0fa318fb95bdefa7dd23",
  );
  execFileSync("tar", ["-xzf", archive.pathname, "-C", dir.pathname]);
}
await download(
  "https://huggingface.co/Qwen/Qwen3-0.6B-GGUF/resolve/23749fefcc72300e3a2ad315e1317431b06b590a/Qwen3-0.6B-Q8_0.gguf",
  "Qwen3-0.6B-Q8_0.gguf",
  "9465e63a22add5354d9bb4b99e90117043c7124007664907259bd16d043bb031",
);
let quantizer =
  process.platform === "win32" ? "llama-quantize.exe" : "llama-quantize";
let runtimeDir = "";
if (process.platform === "linux" && process.arch === "x64") {
  runtimeDir = new URL("llama-b11588/", dir).pathname;
  quantizer = runtimeDir + "llama-quantize";
}
const quantizeArgs = [
  "--allow-requantize",
  new URL("Qwen3-0.6B-Q8_0.gguf", dir).pathname,
  optimizedModel.pathname,
  "Q4_K_M",
  "1",
];
const limited =
  process.platform === "linux" &&
  process.getuid?.() === 0 &&
  existsSync("/run/systemd/system");
console.log("Converting the verified weights to Q4_K_M for lower memory use…");
const env = {
  ...process.env,
  ...(runtimeDir ? { LD_LIBRARY_PATH: runtimeDir } : {}),
};
execFileSync(
  limited ? "systemd-run" : quantizer,
  limited
    ? [
        "--scope",
        "--quiet",
        "-p",
        "MemoryMax=900M",
        "-p",
        "CPUQuota=100%",
        "env",
        ...(runtimeDir ? [`LD_LIBRARY_PATH=${runtimeDir}`] : []),
        quantizer,
        ...quantizeArgs,
      ]
    : quantizeArgs,
  { env, stdio: "inherit" },
);
const checksum = createHash("sha256");
for await (const chunk of createReadStream(optimizedModel))
  checksum.update(chunk);
const { writeFile } = await import("node:fs/promises");
await writeFile(new URL("model.sha256", dir), checksum.digest("hex") + "\n");
await rm(new URL("Qwen3-0.6B-Q8_0.gguf", dir));
console.log(
  "Removed the larger source weights. Only the optimized model is retained.",
);
console.log(
  "Ready. Start local inference with npm run ai:start. Initial downloads need internet; inference does not.",
);
