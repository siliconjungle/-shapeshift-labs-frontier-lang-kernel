import { copyFile, mkdir, readdir, rm } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });

for (const entry of await readdir("src", { withFileTypes: true })) {
  if (!entry.isFile()) {
    continue;
  }
  if (entry.name.endsWith(".js") || entry.name.endsWith(".d.ts")) {
    await copyFile(`src/${entry.name}`, `dist/${entry.name}`);
  }
}
