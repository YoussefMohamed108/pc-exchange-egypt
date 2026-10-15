import data from "@/data/reference-benchmarks.json";
export type BenchmarkKind = "gpu" | "cpu" | "ssd";
export type ReferenceBenchmark = {
  id: string;
  kind: BenchmarkKind;
  model: string;
  score: number;
  writeScore?: number;
  samples?: number;
  sourceId: string;
  sourceDate: string;
  unit: string;
  test: string;
  note: string;
  sourceDeviceName?: string;
};
export const referenceBenchmarks = data.results as ReferenceBenchmark[];
export const benchmarkSources: Record<string, { name: string; url: string; license: string }> =
  data.sources;
export const benchmarkSnapshotDate = data.retrievedAt;
const rankings = new Map(
  (["gpu", "cpu", "ssd"] as const).flatMap((kind) =>
    (["score", "writeScore"] as const).map(
      (metric) =>
        [
          `${kind}:${metric}`,
          referenceBenchmarks
            .filter((row) => row.kind === kind)
            .sort((a, b) => (b[metric] ?? 0) - (a[metric] ?? 0) || a.model.localeCompare(b.model)),
        ] as const,
    ),
  ),
);
export function selectBenchmarks(
  kind: BenchmarkKind,
  query: string,
  metric: "score" | "writeScore" = "score",
) {
  const words = query.toLowerCase().trim().split(/\s+/);
  return rankings
    .get(`${kind}:${metric}`)!
    .filter((row) => words.every((word) => row.model.toLowerCase().includes(word)));
}
