# Timeline walkthroughs

Captured from the public sixteen-second generated-tone demo on 26 October 2026. Timeline modes and word timing show core 1.7.0; the updated waveform export guide shows core 1.8.0. No account, artist audio, personal data, credentials or saved lyrics were used. The clips show actual browser screenshots of individual workflow steps, with an added caption, pulsing gold callout and progress indicator. They are edited walkthroughs, not continuous real-time screen recordings.

- timeline-modes.mp4 — Lines → Sentence → selected word → word zoom → Fit sentence → Words → Lines (17.5 seconds).
- word-timing.mp4 — selected “your”, right edge 3.100 → 3.230 → 3.366 seconds with start anchored at 2.700, Delete word, Undo (12.5 seconds).
- export-range.mp4 — integrated waveform IN/OUT flags, In 2 seconds / Out 12 seconds, zoomed offscreen indicators, Fit export, fade in 1s/out 2s, Listen to export, Entire track (24 seconds). Actual states were adjusted using the accessible marker arrow-key controls; the captions also explain pointer dragging.

MP4 uses H.264, 1364×570, 12 fps, no audio, fast-start. JPGs are still previews. Videos load only on user request and do not autoplay. Each has native pause, seek and fullscreen controls, with readable instructions alongside. The GIF is a lightweight looping preview of the modes guide for sharing. Keep these assets aligned with the current timeline UI when workflows change.

The updated export clip can be rendered from captured UI states using `python tools/render_export_walkthrough.py /path/to/manifest.json`. The script documents the manifest format. Capture each step in the public demo through normal UI actions and pass the unmodified screenshots; the renderer adds only captions, pulsing callouts and a progress line. No UI elements are synthesized.
