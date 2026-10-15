# Reference benchmark library

The public `/en/benchmarks` and `/ar/benchmarks` pages use checked-in snapshots collected on **14–15 October 2026** (gaming extended on the 15th; rendering/storage unchanged). They are separate from seller listings, their evidence files and the admin's Benchmark reviewed badge. Publishing this reference data never assigns a badge to a listing.

## CPU and GPU

Source: **Blender Open Data**, version **4.5.0** only, median score grouped by device name. The score measures Cycles rendering samples per minute across benchmark scenes; it is not gaming FPS. CPU queries use CPU compute; GPU queries include OPTIX, CUDA, HIP, METAL and ONEAPI. Operating systems, drivers and configurations are not held constant. Names may combine memory variants.

- [CPU query](https://opendata.blender.org/benchmarks/query/?compute_type=CPU&group_by=device_name&blender_version=4.5.0)
- [GPU query](https://opendata.blender.org/benchmarks/query/?compute_type=OPTIX&compute_type=CUDA&compute_type=HIP&compute_type=METAL&compute_type=ONEAPI&group_by=device_name&blender_version=4.5.0)
- [Method and CC0 license](https://opendata.blender.org/about/)
- [Raw data and license](https://opendata.blender.org/download/)

Downloaded both query pages' JSON exports through their public export buttons. The raw files are retained locally in ignored `.artifacts/benchmark-sources/blender-{cpu,gpu}-4.5.0.json`. The importer selects consumer desktop names with at least ten submissions. A name with whitespace variants retains the original source name and largest submission group; medians and sample counts are never pooled. The curated snapshot contains 76 GPU groups and 32 CPU groups. It is not an exhaustive hardware database.

## SSDs

Six factual Blackmagic Disk Speed Test read/write pairs were individually checked against StorageReview's own reviews. Capacities and review settings are explicit. These reviews span 2021–2023 and are not a controlled contemporary head-to-head. They do not measure sustained writes or game-loading time. Version/configuration details not stated by the publisher are not invented. No publisher charts, photographs, prose or full datasets are republished.

| Model and tested capacity             | Read GB/s | Write GB/s | Review date | Primary source                                                                 |
| ------------------------------------- | --------: | ---------: | ----------- | ------------------------------------------------------------------------------ |
| Solidigm P44 Pro 2TB                  |      6.03 |       5.84 | 2022-10-28  | [Review](https://www.storagereview.com/review/solidigm-p44-pro-ssd-review-2tb) |
| WD BLACK SN850X 2TB, Game Mode 2.0 on |      5.77 |       6.01 | 2022-08-08  | [Review](https://www.storagereview.com/review/wd-black-sn850x-ssd-review)      |
| Samsung 990 Pro 2TB                   |      5.67 |      5.943 | 2022-10-18  | [Review](https://www.storagereview.com/review/samsung-990-pro-ssd-review-2tb)  |
| Crucial T500 2TB, no heatsink         |      5.67 |       5.95 | 2023-11-01  | [Review](https://www.storagereview.com/review/crucial-t500-ssd-review)         |
| Kingston KC3000 2TB                   |      5.59 |       5.80 | 2021-10-25  | [Review](https://www.storagereview.com/review/kingston-kc3000-ssd-review)      |
| WD BLACK SN770 1TB                    |     4.213 |      4.416 | 2022-02-02  | [Review](https://www.storagereview.com/review/wd-black-sn770-ssd-review)       |

SN770 values were reported as 4,213/4,416 MB/s and converted with 1 GB/s = 1,000 MB/s. Other values retain the publisher's GB/s precision. CPU/GPU and SSD metrics never share a ranking. Storage read/write sorting is selectable. Chart bars use the full category's maximum for the selected metric even when search narrows results.

## Gaming FPS

The `?view=gaming` view contains **466 system/game/resolution measurements**, each with average FPS and a 1% low. Coverage is **40 GPU models and 50 CPU models**, **16 game/build entries** and three selectable resolutions: 1080p, 1440p and 4K. Not every review publishes all resolutions. Counts include only actual measured pairs, once per physical system/game/resolution, even when a system appears in both views. Hardware coverage is curated, not every SKU or memory variant.

Factual numbers were transcribed from the publishers' original charts, viewed at their linked image URLs on 14–15 October 2026. A limited selection is retained; no articles, images or complete review datasets are redistributed. All reviews are by Steven Walton at TechSpot:

- [CPU/GPU scaling, 24 July 2025](https://www.techspot.com/review/3017-ryzen-9800x3d-vs-7600x-cpu-scaling/): selected Ultra/Ultra+ results for Marvel Rivals, Rainbow Six Siege X and Space Marine 2. GPU comparisons hold the Ryzen 7 9800X3D constant; CPU comparisons hold the RTX 5090 constant. Only the two tested Ryzen CPUs are included.
- [GeForce generations, 18 November 2025](https://www.techspot.com/review/3057-nvidia-geforce-rtx-70-series/): selected results for Cyberpunk 2077: Phantom Liberty, Call of Duty: Black Ops 6 and Shadow of the Tomb Raider. This article does not identify its test CPU, memory or driver; those fields explicitly say not reported.
- [Radeon generations, 9 December 2025](https://www.techspot.com/review/3069-six-years-radeon-tested-midrange/): the same three selected games in a distinct review, with its documented Ryzen test platform. Never merged with the GeForce review, even when the game and preset names match.
- [Space Marine 2, 12 September 2024](https://www.techspot.com/review/2891-warhammer-space-marine-2-benchmark/): 15 selected RTX GPUs, Ultra at three native resolutions, with a Ryzen 7 7800X3D. Includes RTX 2060 Super, 2070 Super, 2080 Ti, 3050 8GB through 3090 Ti, and 4060/4060 Ti memory variants. Source charts: `1080p-Ultra.png`, `1440p-Ultra.png`, `2160p-Ultra.png`.
- [Battlefield 6 GPU test, 10 October 2025](https://www.techspot.com/review/3042-battlefield-6-benchmark/): 14 selected RTX 40/50-series GPUs, High native TAA at three resolutions. Ryzen 7 9800X3D; campaign mission three. Source charts: `High-1080.png`, `High-1440.png`, `High-2160.png`.
- [Battlefield 6 CPU test, 16 October 2025](https://www.techspot.com/review/3043-battlefield-6-cpu-benchmark/): 28 selected AM4, AM5 and Intel CPUs, RTX 5090, High native TAA, **1080p only**. Portal bot match differs from the GPU campaign test. Source chart: `2025-10-15-image-2.png`. The publisher's estimated 7800X3D result is deliberately excluded.
- [Ryzen 3600 / Core i5-9600K revisit, 30 November 2023](https://www.techspot.com/review/2767-ryzen-3600-vs-core-i5-9600k-revisit/): five CPUs including the 9600K and 9900K, Cyberpunk Phantom Liberty Ultra at all three resolutions, RTX 4090. Source chart: `CP2077.png`.
- [CPU value review, 19 December 2024](https://www.techspot.com/bestof/cpu-value-24-25/): 15 selected CPU results in Cyberpunk Phantom Liberty patch 2.2, High, RTX 4090, **1080p only**. Includes 5700X/X3D, 7800X3D, additional Ryzen 7000/9000 and Core Ultra models. Source chart: `CP2077.png`. Do not substitute results for similar untested CPUs.
- [Core i7-13700K review, 23 October 2022](https://www.techspot.com/review/2554-intel-core-i7-13700k/): 15 selected CPU results in Shadow of the Tomb Raider Highest, RTX 4090, **1080p only** in the selected game chart (`SotTRr.png`). Intel 12th/13th-generation rows use DDR5-6400, not the separate DDR4 configurations also present in the source. Includes 13700K/13900K and additional AM4 models.
- [Original Cyberpunk 2077 GPU test, 11 December 2020](https://www.techspot.com/article/2164-cyberpunk-benchmarks/): seven RTX 20-series cards, Ultra at three resolutions, Ryzen 9 5950X. This is **launch v1.03**, explicitly a separate game/build entry from Phantom Liberty. Source charts: `1080p_Ultra.png`, `1440p_Ultra.png`, `4K_Ultra.png`. These historical results are not presented as performance of current game patches.

### AAA additions — 15 October 2026

Eight new games add **150 measurements**. Existing model IDs and older results are preserved.

| Games                                                          | View / selected hardware                                              | Published resolutions | Primary source and charts                                                                                                                                                                                                           |
| -------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alan Wake 2; Hogwarts Legacy; Starfield; The Last of Us Part I | GPU: RTX 4080, 4070 Super, 3070, 2070 Super, 2060 Super; RX 7800 XT   | 1440p, 4K             | [RTX 4070 Super review, 16 January 2024](https://www.techspot.com/review/2791-nvidia-geforce-rtx-4070-super/). `AW2`, `Hogwarts`, `Starfield`, `TLOU`, each with `-1440p.png` and `-2160p.png`, under `/articles-info/2791/bench/`. |
| Red Dead Redemption 2                                          | GPU: seven RTX 20-series models                                       | 1080p, 1440p, 4K      | [Launch-era test, 7 November 2019](https://www.techspot.com/review/1939-red-dead-redemption-2-benchmarks/). `/articles-info/1939/images/2019-11-06-image.png`, `2019-11-06-image-2.png`, `2019-11-06-image-3.png`.                  |
| Resident Evil Requiem; Marvel's Spider-Man 2; Forza Horizon 6  | GPU: RTX 5070 Ti, 5070, 5060 Ti 16GB; RX 9070, 7900 GRE, 9060 XT 16GB | 1440p, 4K             | [RX 9070 GRE review, 2 June 2026](https://www.techspot.com/review/3133-amd-radeon-9070-gre/). `RE.png`, `Spider.png`, `FH6.png` under `/articles-info/3133/bench/`.                                                                 |
| Hogwarts Legacy; Starfield; The Last of Us Part I              | CPU: 5800X3D, 3700X, 3600, 9900K, 9600K                               | 1080p, 1440p, 4K      | [2023 AM4 / Intel revisit](https://www.techspot.com/review/2767-ryzen-3600-vs-core-i5-9600k-revisit/). `Hogwarts.png`, `Starfield.png`, `TLOU.png` under `/articles-info/2767/bench/`.                                              |

The 2024 GPU review uses a 7800X3D and DDR5-6000 and explicitly excludes upscaling/frame generation. Alan Wake 2 uses High; the other selected games use Ultra. Its per-game 1080p values are **not published**; the separate 12-game average is never substituted for them.

RDR2 uses a 9900K at 5GHz and DDR4-3400, manual High settings and DX12 in Colter. The 2019 date is explicit. The 2026 review does **not** name its test CPU, memory, driver or game build; those remain unknown. Its selected charts are distinct from its ray tracing section; unspecified render settings remain unspecified.

Hogwarts CPU results use **Ultra / RT Ultra**, unlike the selected GPU results. Starfield CPU data precedes the performance update mentioned in the November 2023 article. Each CPU ranking retains its RTX 4090 test setup and stays separate from all GPU reviews. No CPU results are fabricated for the other new titles.

`src/data/gaming-benchmarks.json` stores normalized model/game names, source dates, platform limitations, exact chart links and measured pairs in the fixed order **1080p, 1440p, 4K**, each as **[average, 1% low]**. An unavailable resolution and its chart are `null`, never zero or an estimate. Explicit `kinds` prevents CPU-only reviews from becoming GPU rankings. `src/lib/gaming-benchmarks.ts` selects one review, preset, game and paired CPU/GPU at a time. There is no extrapolation, cross-review aggregation, Blender-to-FPS conversion or automatic seller badge assignment. Unknown upscaling/frame-generation/ray-tracing settings remain unknown; a quality preset is not evidence that those features were disabled.

The UI exposes source links, test context, within-series search, resolution controls and a three-model comparison. Generation/socket filters cover RTX 20/30/40/50, Radeon, AMD AM4/AM5, Intel 9th through 14th generations and Core Ultra. The global model selector narrows games/reviews to measured hardware. Changing game, series, hardware category, family or model clears comparisons; changing resolution preserves them. Bar scale uses the selected hardware cohort before text search. Missing resolutions have a dedicated explanation, available-resolution buttons, no source-chart link and “Not reported” comparison cells. The 1% low is not labeled as minimum FPS.

To extend gaming coverage, choose a primary test with explicit settings, add its source and chart URLs, transcribe only a limited selection of measurements, and check every pair against the chart. Do not infer the test CPU from another article by the same publisher. Run the gaming integrity suite and English/Arabic desktop/mobile browser tests before deployment.

## Rendering/storage refresh

Review sources and source conditions, download fresh exports using the same query filters, update retrieval dates and any explicitly selected models in `scripts/import-reference-benchmarks.mjs`, then run that script. The importer validates export headers and numbers and writes `src/data/reference-benchmarks.json`. Review the resulting diff, run `npm test` and the benchmark browser suite, and deploy explicitly. Do not automatically merge different Blender versions or replace measured SSD results with manufacturer claims.
