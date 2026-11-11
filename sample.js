const { createHash } = require("node:crypto");
const { readFile, writeFile } = require("node:fs/promises");
const { join } = require("node:path");

const source = "https://raw.githubusercontent.com/LaihoE/demoparser/aafa6079f5c53efa036189b5e6fe0aa350523d87/src/parser/test_demo.dem";
const expected = "84a1a4191302bdd2a3bbb5a727842093744b1fb1a228aeec630369e44b622cb2";
const file = join(__dirname, "sample.dem");
const digest = (data) => createHash("sha256").update(data).digest("hex");

async function main() {
  let data = await readFile(file).catch((error) => {
    if (error.code !== "ENOENT") throw error;
    return null;
  });
  if (!data) {
    const response = await fetch(source, { signal: AbortSignal.timeout(120_000) });
    if (!response.ok) throw new Error(`Download retornou HTTP ${response.status}.`);
    data = Buffer.from(await response.arrayBuffer());
    if (digest(data) !== expected) throw new Error("SHA-256 incorreto no download.");
    await writeFile(file, data, { flag: "wx" });
  }
  if (digest(data) !== expected) throw new Error("O sample.dem existente tem outro SHA-256.");
  console.log(`Amostra verificada: ${file}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
