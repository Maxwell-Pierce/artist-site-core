# Pinned browser media dependencies

- wavesurfer.js 8.0.3: WaveSurfer waveform player, Regions and Timeline plugins. BSD-3-Clause. Source: https://github.com/katspaugh/wavesurfer.js/tree/v8.0.3 . Distributed from the official npm package https://registry.npmjs.org/wavesurfer.js/8.0.3 . See wavesurfer-LICENSE.
- mediabunny 1.62.1: browser MP4 muxing and WebCodecs encoding. MPL-2.0, distributed unmodified. Corresponding source: https://github.com/Vanilagy/mediabunny/tree/v1.62.1 . Official npm package: https://registry.npmjs.org/mediabunny/1.62.1 . See mediabunny-LICENSE.

Files are pinned and bundled locally; no CDN imports, microphone access, installation or additional backend is required. Keep licenses and source links when updating. The UI checks actual codec support before export and never renames WebM as MP4. The fallback uses MediaRecorder only when it advertises MP4 support.
