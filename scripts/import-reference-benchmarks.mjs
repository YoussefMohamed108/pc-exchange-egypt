// Inputs are Blender Open Data's CC0 JSON exports from the exact queries documented below.
// Never infer a missing score or combine medians from differently named device groups.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cpuModels = new Set([
  "9950X",
  "9950X3D",
  "7950X",
  "7950X3D",
  "7900X",
  "5950X",
  "5900X",
  "9800X3D",
  "7800X3D",
  "7700X",
  "7700",
  "7600X",
  "7600",
  "5800X3D",
  "5800X",
  "5700X3D",
  "5700X",
  "5600X",
  "5600",
  "3600",
  "14900K",
  "14700K",
  "14600K",
  "13900K",
  "13700K",
  "13600K",
  "12700K",
  "12600K",
  "12400F",
  "11400F",
  "10400F",
]);
function load(kind) {
  const file = path.join(root, `.artifacts/benchmark-sources/blender-${kind}-4.5.0.json`);
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  if (raw.header.join("|") !== "Device Name|Median Score|Number of Benchmarks")
    throw new Error("Unexpected export schema");
  const chosen = new Map();
  for (const [originalName, score, samples] of raw.body) {
    const model = originalName.trim();
    if (samples < 10 || !Number.isFinite(score) || score <= 0) continue;
    const cpu =
      model.match(/^AMD Ryzen [579] (\w+) \d+-Core Processor$/)?.[1] ||
      model.match(/^(?:13th Gen )?Intel Core i[579]-(\d+[A-Z]*)(?: CPU)?(?: @ [\d.]+GHz)?$/)?.[1];
    const gpu =
      /^NVIDIA GeForce (?:RTX|GTX) \d+(?: Ti| SUPER| Ti SUPER| [36]GB)?$/.test(model) ||
      /^AMD Radeon RX \d+(?: XT| XTX| GRE)?$/.test(model) ||
      /^Intel Arc [AB]\d+ Graphics$/.test(model);
    if (kind === "cpu" ? !cpuModels.has(cpu) : !gpu) continue;
    // Whitespace variants remain separate upstream groups. Select the largest group,
    // retain its exact source name and count, and do not pretend to pool their medians.
    if ((chosen.get(model)?.samples || 0) >= samples) continue;
    chosen.set(model, {
      id: `${kind}-${model.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      kind,
      model,
      sourceDeviceName: originalName,
      score,
      samples,
      sourceId: `blender-${kind}`,
      sourceDate: "2026-10-14",
      unit: "samples/min",
      test: "Blender 4.5.0",
      note: "",
    });
  }
  return [...chosen.values()].sort((a, b) => b.score - a.score);
}
const ssds = [
  [
    "Solidigm P44 Pro",
    "2TB",
    6.03,
    5.84,
    "2022-10-28",
    "solidigm-p44-pro-ssd-review-2tb",
    "Windows 11",
  ],
  [
    "WD BLACK SN850X",
    "2TB",
    5.77,
    6.01,
    "2022-08-08",
    "wd-black-sn850x-ssd-review",
    "Game Mode 2.0 on",
  ],
  [
    "Samsung 990 Pro",
    "2TB",
    5.67,
    5.943,
    "2022-10-18",
    "samsung-990-pro-ssd-review-2tb",
    "Windows 11",
  ],
  [
    "Crucial T500",
    "2TB",
    5.67,
    5.95,
    "2023-11-01",
    "crucial-t500-ssd-review",
    "Windows 11 · no heatsink",
  ],
  [
    "Kingston KC3000",
    "2TB",
    5.59,
    5.8,
    "2021-10-25",
    "kingston-kc3000-ssd-review",
    "Review test platform",
  ],
  [
    "WD BLACK SN770",
    "1TB",
    4.213,
    4.416,
    "2022-02-02",
    "wd-black-sn770-ssd-review",
    "Review test platform",
  ],
].map(([model, capacity, score, writeScore, sourceDate, slug, note]) => ({
  id: `ssd-${slug}`,
  kind: "ssd",
  model: `${model} ${capacity}`,
  score,
  writeScore,
  sourceId: slug,
  sourceDate,
  unit: "GB/s",
  test: "Blackmagic Disk Speed Test",
  note,
}));
const sources = {
  "blender-cpu": {
    name: "Blender Open Data",
    url: "https://opendata.blender.org/benchmarks/query/?compute_type=CPU&group_by=device_name&blender_version=4.5.0",
    license: "CC0",
  },
  "blender-gpu": {
    name: "Blender Open Data",
    url: "https://opendata.blender.org/benchmarks/query/?compute_type=OPTIX&compute_type=CUDA&compute_type=HIP&compute_type=METAL&compute_type=ONEAPI&group_by=device_name&blender_version=4.5.0",
    license: "CC0",
  },
};
for (const row of ssds)
  sources[row.sourceId] = {
    name: "StorageReview",
    url: `https://www.storagereview.com/review/${row.sourceId}`,
    license: "Selected factual measurements; article rights retained by publisher",
  };
const output = {
  retrievedAt: "2026-10-14",
  sources,
  results: [...load("gpu"), ...load("cpu"), ...ssds],
};
fs.mkdirSync(path.join(root, "src/data"), { recursive: true });
fs.writeFileSync(
  path.join(root, "src/data/reference-benchmarks.json"),
  JSON.stringify(output, null, 2) + "\n",
);
console.log(`Imported ${output.results.length} sourced reference results.`);
