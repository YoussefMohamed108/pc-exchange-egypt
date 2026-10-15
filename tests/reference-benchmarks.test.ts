import { describe, expect, it } from "vitest";
import {
  benchmarkSources,
  referenceBenchmarks,
  selectBenchmarks,
} from "../src/lib/reference-benchmarks";

describe("reference benchmark integrity", () => {
  it("keeps every result identifiable and linked to a real HTTPS source", () => {
    expect(new Set(referenceBenchmarks.map((row) => row.id)).size).toBe(referenceBenchmarks.length);
    for (const row of referenceBenchmarks) {
      expect(row.score).toBeGreaterThan(0);
      expect(new URL(benchmarkSources[row.sourceId].url).protocol).toBe("https:");
      expect(Date.parse(row.sourceDate)).not.toBeNaN();
      if (row.kind !== "ssd") {
        expect(row.samples).toBeGreaterThanOrEqual(10);
        expect(row.test).toBe("Blender 4.5.0");
      } else {
        expect(row.writeScore).toBeGreaterThan(0);
        expect(row.model).toMatch(/\dTB$/);
      }
    }
  });
  it("never mixes CPU, GPU and storage metrics in search or ranking", () => {
    for (const kind of ["cpu", "gpu", "ssd"] as const)
      expect(selectBenchmarks(kind, "").every((row) => row.kind === kind)).toBe(true);
    expect(selectBenchmarks("cpu", "RTX")).toEqual([]);
    expect(selectBenchmarks("gpu", "rtx 3060").map((row) => row.model)).toContain(
      "NVIDIA GeForce RTX 3060",
    );
  });
  it("preserves measured values, source precision and the largest duplicate CPU group", () => {
    expect(selectBenchmarks("cpu", "7900X")[0]).toMatchObject({ score: 413.6, samples: 161 });
    expect(selectBenchmarks("ssd", "990 Pro")[0]).toMatchObject({ score: 5.67, writeScore: 5.943 });
    expect(selectBenchmarks("ssd", "SN770")[0]).toMatchObject({ score: 4.213, writeScore: 4.416 });
  });
  it("sorts storage by the selected measured quantity", () => {
    expect(selectBenchmarks("ssd", "", "score")[0].model).toBe("Solidigm P44 Pro 2TB");
    expect(selectBenchmarks("ssd", "", "writeScore")[0].model).toBe("WD BLACK SN850X 2TB");
  });
});
