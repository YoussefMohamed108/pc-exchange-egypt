import data from "@/data/gaming-benchmarks.json";

export type GamingKind = "gpu" | "cpu";
export const gamingResolutions = ["1080p", "1440p", "4K"] as const;
export type GamingResolution = (typeof gamingResolutions)[number];
type Localized = { en: string; ar: string };
export type GamingSystem = {
  cpu: string | null;
  gpu: string;
  // Resolution order: 1080p, 1440p, 4K. Each pair is [average FPS, 1% low FPS].
  fps: ([number, number] | null)[];
};
export type GamingTest = {
  id: string;
  sourceId: string;
  gameId: string;
  preset: string;
  rendering?: Localized;
  kinds?: GamingKind[];
  charts: (string | null)[];
  systems: GamingSystem[];
};
export type GamingSource = {
  name: Localized;
  url: string;
  publishedAt: string;
  gpuTestCpu: string | null;
  cpuTestGpu: string | null;
  platform: Localized;
  chartBase: string;
};
export const gamingModels: Record<string, string> = data.models;
export const gamingGames: Record<string, string> = data.games;
export const gamingSources: Record<string, GamingSource> = data.sources;
export const gamingTests = data.tests as GamingTest[];
export const gamingSnapshotDate = data.retrievedAt;
const testsById = new Map(gamingTests.map((test) => [test.id, test]));
export const gamingMeasurementCount = gamingTests.reduce(
  (count, test) =>
    count + test.systems.reduce((sum, system) => sum + system.fps.filter(Boolean).length, 0),
  0,
);

export const gamingFamilies: Record<string, Localized> = {
  rtx20: { en: "GeForce RTX 20 series", ar: "GeForce RTX 20" },
  rtx30: { en: "GeForce RTX 30 series", ar: "GeForce RTX 30" },
  rtx40: { en: "GeForce RTX 40 series", ar: "GeForce RTX 40" },
  rtx50: { en: "GeForce RTX 50 series", ar: "GeForce RTX 50" },
  radeon: { en: "AMD Radeon", ar: "AMD Radeon" },
  am4: { en: "AMD AM4", ar: "AMD AM4" },
  am5: { en: "AMD AM5", ar: "AMD AM5" },
  intel9: { en: "Intel 9th gen", ar: "Intel الجيل التاسع" },
  intel10: { en: "Intel 10th gen", ar: "Intel الجيل العاشر" },
  intel11: { en: "Intel 11th gen", ar: "Intel الجيل الحادي عشر" },
  intel12: { en: "Intel 12th gen", ar: "Intel الجيل الثاني عشر" },
  intel13: { en: "Intel 13th gen", ar: "Intel الجيل الثالث عشر" },
  intel14: { en: "Intel 14th gen", ar: "Intel الجيل الرابع عشر" },
  ultra: { en: "Intel Core Ultra", ar: "Intel Core Ultra" },
};

export function gamingFamily(modelId: string): string {
  const name = gamingModels[modelId];
  if (name.includes("GeForce RTX")) return `rtx${modelId.slice(0, 2)}`;
  if (name.includes("Radeon")) return "radeon";
  if (name.includes("Ryzen")) return /^[235]/.test(modelId) ? "am4" : "am5";
  if (name.includes("Core Ultra")) return "ultra";
  return `intel${modelId.startsWith("9") ? "9" : modelId.slice(0, 2)}`;
}

function matchingSystems(test: GamingTest, kind: GamingKind) {
  const source = gamingSources[test.sourceId];
  if (test.kinds && !test.kinds.includes(kind)) return [];
  if (kind === "cpu" && !source.cpuTestGpu) return [];
  return test.systems.filter((system) =>
    kind === "gpu"
      ? system.cpu === source.gpuTestCpu
      : system.gpu === source.cpuTestGpu && system.cpu !== null,
  );
}

// The published snapshot is immutable. Index its finite combinations once, not on every keystroke.
const systemsByTest = new Map(
  gamingTests.map((test) => [
    test.id,
    {
      gpu: matchingSystems(test, "gpu"),
      cpu: matchingSystems(test, "cpu"),
    },
  ]),
);
function systemsFor(test: GamingTest, kind: GamingKind) {
  return systemsByTest.get(test.id)![kind];
}
const modelIdsByKind = Object.fromEntries(
  (["gpu", "cpu"] as const).map((kind) => [
    kind,
    [
      ...new Set(
        gamingTests.flatMap((test) =>
          systemsFor(test, kind).map((system) => (kind === "gpu" ? system.gpu : system.cpu)!),
        ),
      ),
    ].sort((a, b) => gamingModels[a].localeCompare(gamingModels[b], "en", { numeric: true })),
  ]),
) as Record<GamingKind, string[]>;

export function gamingModelIds(kind: GamingKind, family = "all") {
  return modelIdsByKind[kind].filter((id) => family === "all" || gamingFamily(id) === family);
}

export function gamingTestsFor(kind: GamingKind, gameId?: string, family = "all", modelId = "all") {
  return gamingTests.filter(
    (test) =>
      (!gameId || test.gameId === gameId) &&
      systemsFor(test, kind).some((system) => {
        const id = (kind === "gpu" ? system.gpu : system.cpu)!;
        return (
          (family === "all" || gamingFamily(id) === family) && (modelId === "all" || id === modelId)
        );
      }),
  );
}

function rankGamingResults(testId: string, kind: GamingKind, resolution: GamingResolution) {
  const test = testsById.get(testId);
  if (!test) return [];
  const index = gamingResolutions.indexOf(resolution);
  return systemsFor(test, kind)
    .map((system) => {
      const modelId = (kind === "gpu" ? system.gpu : system.cpu)!;
      return {
        ...system,
        modelId,
        model: gamingModels[modelId],
        average: system.fps[index]?.[0],
        low: system.fps[index]?.[1],
      };
    })
    .sort((a, b) => (b.average ?? -1) - (a.average ?? -1) || a.model.localeCompare(b.model));
}
const rankedResults = new Map(
  gamingTests.flatMap((test) =>
    (["gpu", "cpu"] as const).flatMap((kind) =>
      gamingResolutions.map(
        (resolution) =>
          [
            `${test.id}:${kind}:${resolution}`,
            rankGamingResults(test.id, kind, resolution),
          ] as const,
      ),
    ),
  ),
);
export function selectGamingResults(
  testId: string,
  kind: GamingKind,
  resolution: GamingResolution,
  query = "",
) {
  const words = query.toLowerCase().trim().split(/\s+/);
  return (rankedResults.get(`${testId}:${kind}:${resolution}`) || []).filter((row) =>
    words.every((word) => row.model.toLowerCase().includes(word)),
  );
}
