# Artist Site Core

One shared player and build pipeline; each artist keeps their own identity and content.

## Included

- Persistent shuffled audio across internal page navigation, compact mobile player, volume popover, keyboard-accessible menu, and Media Session controls.
- Muted shuffled video backgrounds, a loading gate and configurable entry portrait. Eye-glow entry is opt-in; other portraits use a fade. Reduced-motion preferences are respected.
- Five caption styles, a separate persistent lyric surface, recognized/estimated timing provenance and fast interpolation during publishing.
- Public Treblo playlist importer and incremental CPU lyric analysis: wav2vec2, Demucs, two Whisper passes, cautious corrections, review output and caching.
- Manifest, service worker, device-resume viewport handling and artist-specific PWA icons.
- Composite GitHub Actions for quick builds and separate audio analysis.

## Ownership

Shared code is in `runtime/`, `scripts/`, `actions/` and `tests/`. There are no DiscoPrincess videos, portraits, playlists or manifesto pages in this repository. The default visual system was extracted from that site with its owner's requested reuse; artist assets stay in their own repositories.

Artist repositories contain `artist.json`, `index.html`, optional extra HTML pages, `custom.css` / `custom.js`, `assets/`, `catalog-source.json`, saved catalogs, `lyrics/`, `lyric-config.json` and reviewed overrides. Do not edit built `app.js` or `style.css`: edit the shared runtime here, or use an artist extension.

## Local development

```sh
git clone --recurse-submodules https://github.com/Maxwell-Pierce/site.git
cd site
python .artist-core/scripts/build.py --site . --output _site
```

Python 3.12 and Node are enough for builds and tests. No models, audio processing, network calls or third-party Python packages are required for publishing. Heavy dependencies are installed only by the analysis action when at least one playlist is configured.

```sh
python -m unittest discover -s tests
node --check runtime/app.js
```

## Shared updates

Consumers pin this repository as `.artist-core`, a Git submodule at an exact commit. Dependabot checks the tracked `main` branch daily and proposes a submodule update PR. Each consumer builds that candidate before publication; merging adopts the new core. Nothing updates production merely because this repository changes. Reverting the submodule commit rolls back the shared code.

Normal UI pushes do not analyze audio. Daily/manual analysis refreshes configured playlists, uses caches, processes the configured budget and commits only catalogs and raw lyric results. Successful analysis triggers a fast publish. Updating the core alone does not start audio analysis.

## Configuration

`artist.json` requires `name`, lowercase `slug`, and six-digit hex theme colors. Entry portraits must live under `assets/`. The starter demonstrates all fields. HTML templates interpolate `{{field.path}}` as escaped text; JSON configuration is embedded with script-safe escaping. Keep deliberate HTML structure in artist-owned pages.

The first configured playlist is the homepage entry queue. Add IDs to `catalog-source.json` in the desired order, then run **Analyze artist lyrics**. Recognition coverage and estimated animation coverage are distinct. Unsupplied line timings cannot be reconstructed by interpolation alone.

## Platform limits

PWA media-card taps are owned by the browser/OS; the web API cannot guarantee Android returns to the standalone window. Native integration is outside this shared web core. The core does not promise offline audio playback.
