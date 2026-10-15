import { describe, expect, it } from "vitest";
import {
  gamingGames,
  gamingMeasurementCount,
  gamingModels,
  gamingFamily,
  gamingModelIds,
  gamingSources,
  gamingTests,
  gamingTestsFor,
  selectGamingResults,
} from "../src/lib/gaming-benchmarks";

describe("gaming benchmark provenance and comparisons", () => {
  it("keeps complete, positive measurements tied to unique systems and primary charts", () => {
    expect(gamingMeasurementCount).toBe(466);
    expect(new Set(gamingTests.map((test) => test.id)).size).toBe(gamingTests.length);
    for (const test of gamingTests) {
      const source = gamingSources[test.sourceId];
      expect(new URL(source.url).hostname).toBe("www.techspot.com");
      expect(Date.parse(source.publishedAt)).not.toBeNaN();
      expect(gamingGames[test.gameId]).toBeTruthy();
      expect(test.preset).toBeTruthy();
      expect(test.charts).toHaveLength(3);
      expect(new Set(test.systems.map((row) => `${row.cpu}/${row.gpu}`)).size).toBe(
        test.systems.length,
      );
      for (const row of test.systems) {
        expect(gamingModels[row.gpu]).toBeTruthy();
        if (row.cpu) expect(gamingModels[row.cpu]).toBeTruthy();
        expect(row.fps).toHaveLength(3);
        for (const [index, pair] of row.fps.entries()) {
          if (pair === null) {
            expect(test.charts[index]).toBeNull();
            continue;
          }
          expect(test.charts[index]).toBeTruthy();
          const [average, low] = pair;
          expect(Number.isFinite(average) && Number.isFinite(low)).toBe(true);
          expect(average).toBeGreaterThan(0);
          expect(low).toBeGreaterThan(0);
          expect(low).toBeLessThanOrEqual(average);
        }
      }
    }
  });
  it("holds the paired hardware constant and never mixes reviews or absent CPU tests", () => {
    const gpu = selectGamingResults("scaling-marvel", "gpu", "1080p");
    expect(gpu).toHaveLength(4);
    expect(gpu.every((row) => row.cpu === "9800x3d")).toBe(true);
    const cpu = selectGamingResults("scaling-marvel", "cpu", "4K");
    expect(cpu).toHaveLength(2);
    expect(cpu.every((row) => row.gpu === "5090")).toBe(true);
    expect(selectGamingResults("geforce-cyberpunk", "cpu", "1080p")).toEqual([]);
    expect(gamingTestsFor("cpu", "cyberpunk").map((test) => test.id)).toEqual([
      "legacy-cpu",
      "cpu-value-2024",
    ]);
    expect(selectGamingResults("bf6-cpu", "gpu", "1080p")).toEqual([]);
    expect(gamingTestsFor("gpu").some((test) => test.id === "bf6-cpu")).toBe(false);
    expect(
      selectGamingResults("geforce-cyberpunk", "gpu", "1440p").every((row) => row.cpu === null),
    ).toBe(true);
    expect(selectGamingResults("radeon-cyberpunk", "gpu", "1440p", "RTX")).toEqual([]);
  });
  it("preserves visually checked chart numbers at all resolutions instead of estimating", () => {
    expect(selectGamingResults("scaling-marvel", "gpu", "1080p", "5090")[0]).toMatchObject({
      average: 157,
      low: 121,
    });
    expect(selectGamingResults("scaling-siege", "cpu", "4K").map((row) => row.average)).toEqual([
      238, 238,
    ]);
    expect(selectGamingResults("scaling-space-marine", "cpu", "1440p", "7600")[0]).toMatchObject({
      average: 90,
      low: 76,
    });
    expect(selectGamingResults("geforce-cyberpunk", "gpu", "4K", "3070")[0]).toMatchObject({
      average: 35,
      low: 26,
    });
    expect(selectGamingResults("radeon-cod", "gpu", "1440p", "6700")[0]).toMatchObject({
      average: 60,
      low: 40,
    });
    expect(selectGamingResults("radeon-tomb-raider", "gpu", "1080p", "9070")[0]).toMatchObject({
      average: 234,
      low: 198,
    });
    expect(selectGamingResults("no-such-test", "gpu", "4K")).toEqual([]);
    expect(selectGamingResults("scaling-marvel", "cpu", "1080p", "intel")).toEqual([]);
  });
  it("finds every requested hardware family without counting test-rig-only hardware", () => {
    expect(gamingModelIds("gpu")).toHaveLength(40);
    expect(gamingModelIds("cpu")).toHaveLength(50);
    for (const family of ["rtx20", "rtx30", "rtx40", "rtx50"]) {
      expect(gamingModelIds("gpu", family).length).toBeGreaterThan(3);
    }
    for (const family of [
      "am4",
      "am5",
      "intel9",
      "intel10",
      "intel11",
      "intel12",
      "intel13",
      "intel14",
      "ultra",
    ]) {
      expect(gamingModelIds("cpu", family).length).toBeGreaterThan(0);
      expect(gamingTestsFor("cpu", undefined, family).length).toBeGreaterThan(0);
    }
    expect(gamingFamily("8400f")).toBe("am5");
    expect(gamingFamily("5800x3d")).toBe("am4");
    expect(gamingTestsFor("gpu", undefined, "rtx20", "2060").map((test) => test.id)).toEqual([
      "cyberpunk-2020",
      "rdr-2019-gpu",
    ]);
    expect(gamingTestsFor("cpu", undefined, "intel9", "9600k").map((test) => test.id)).toEqual([
      "legacy-cpu",
      "legacy-hogwarts",
      "legacy-starfield",
      "legacy-last-of-us",
    ]);
  });
  it("preserves expanded source measurements and explicit missing resolutions", () => {
    expect(selectGamingResults("cyberpunk-2020", "gpu", "1440p", "2060 6GB")[0]).toMatchObject({
      average: 34,
      low: 29,
    });
    expect(selectGamingResults("sm2-2024", "gpu", "4K", "3060 12GB")[0]).toMatchObject({
      average: 22,
      low: 19,
    });
    expect(selectGamingResults("bf6-gpu", "gpu", "1440p", "5060 Ti 16GB")[0]).toMatchObject({
      average: 94,
      low: 75,
    });
    expect(selectGamingResults("legacy-cpu", "cpu", "4K", "9600K")[0]).toMatchObject({
      average: 71,
      low: 58,
    });
    expect(selectGamingResults("bf6-cpu", "cpu", "1080p", "11900K")[0]).toMatchObject({
      average: 110,
      low: 81,
    });
    expect(
      selectGamingResults("bf6-cpu", "cpu", "4K").every(
        (row) => row.average === undefined && row.fps[2] === null,
      ),
    ).toBe(true);
    expect(selectGamingResults("cpu-value-2024", "cpu", "1080p", "5700X3D")[0]).toMatchObject({
      average: 157,
      low: 111,
    });
    expect(selectGamingResults("raptor-cpu", "cpu", "1080p", "13700K")[0]).toMatchObject({
      average: 275,
      low: 214,
    });
  });
  it("adds eight AAA games with checked numbers, published resolutions and separate CPU tests", () => {
    expect(Object.keys(gamingGames)).toHaveLength(16);
    for (const game of [
      "alan-wake-2",
      "red-dead-2",
      "resident-evil-requiem",
      "spider-man-2",
      "forza-horizon-6",
      "hogwarts",
      "starfield",
      "last-of-us-1",
    ])
      expect(gamingTestsFor("gpu", game).length).toBeGreaterThan(0);
    expect(gamingTestsFor("cpu", "resident-evil-requiem")).toEqual([]);
    expect(
      selectGamingResults("gre-requiem", "gpu", "1080p").every((row) => row.average === undefined),
    ).toBe(true);
    expect(selectGamingResults("gre-requiem", "gpu", "1440p", "5070 Ti")[0]).toMatchObject({
      average: 137,
      low: 107,
      cpu: null,
    });
    expect(selectGamingResults("gre-requiem", "gpu", "4K", "5070 Ti")[0]).toMatchObject({
      average: 82,
      low: 70,
    });
    expect(selectGamingResults("super-alan-wake-2", "gpu", "1440p", "4070 Super")[0]).toMatchObject(
      { average: 67, low: 57, cpu: "7800x3d" },
    );
    expect(selectGamingResults("super-alan-wake-2", "gpu", "4K", "4070 Super")[0]).toMatchObject({
      average: 36,
      low: 29,
    });
    expect(selectGamingResults("rdr-2019-gpu", "gpu", "1080p", "2080 Ti")[0]).toMatchObject({
      average: 114,
      low: 101,
      cpu: "9900k",
    });
    expect(selectGamingResults("rdr-2019-gpu", "gpu", "4K", "2060 6GB")[0]).toMatchObject({
      average: 35,
      low: 30,
    });
    expect(selectGamingResults("super-hogwarts", "gpu", "1440p", "4080")[0]).toMatchObject({
      average: 116,
      low: 71,
    });
    expect(selectGamingResults("legacy-hogwarts", "cpu", "1080p", "5800X3D")[0]).toMatchObject({
      average: 60,
      low: 36,
      gpu: "4090",
    });
    expect(selectGamingResults("legacy-hogwarts", "gpu", "1080p")).toEqual([]);
    expect(selectGamingResults("super-hogwarts", "cpu", "1440p")).toEqual([]);
    expect(selectGamingResults("legacy-starfield", "cpu", "4K", "9600K")[0]).toMatchObject({
      average: 49,
      low: 40,
    });
    expect(selectGamingResults("legacy-last-of-us", "cpu", "1080p", "9600K")[0]).toMatchObject({
      average: 79,
      low: 46,
    });
    expect(selectGamingResults("gre-spider-2", "gpu", "4K", "9060 XT")[0]).toMatchObject({
      average: 46,
      low: 25,
    });
    expect(selectGamingResults("gre-forza-6", "gpu", "1440p", "5070 Ti")[0]).toMatchObject({
      average: 132,
      low: 113,
    });
  });
});
