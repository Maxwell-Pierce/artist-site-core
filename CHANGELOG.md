# Changes

## 1.10.0

Bundle Maxwell Pierce’s full HEAVNS - Moving Out Of Frame audio, original artwork, original transcript and editable timing data in the shared core. Default the token-free studio demo to the real music track, with local assets and isolated session edits. Retain the generated tone for tutorial exercises.


## 1.9.0

Add graphical audio envelopes on the waveform with draggable fade-length diamonds and curve thumbnail selection (linear, slow, fast, S curve, equal power). Use the same gain functions in visual envelopes, stereo listening and MP4 exports; retain saved linear fades and optional exact values.


## 1.8.0

Move export In/Out flags onto the waveform with shared zoom/scroll geometry, vertical boundary lines, outside shading, edge auto-pan, offscreen indicators and Fit export. Keep audio fades, exact values and independent practice looping. Refresh the export walkthrough for integrated markers.


## 1.7.1

Add three focused, captioned video walkthroughs to the shared lyric help: timeline modes and zoom, anchored word resizing with Delete/Undo, and export markers with audio fades. Include still posters, native playback/fullscreen controls and no autoplay. Correct outdated instructions about word edits, double-click, track duration and export defaults.

## 1.7.0

Default new lyric videos to the full track and allow full-length exports. Add a full-track export ruler with draggable, keyboard-accessible In/Out markers, Entire track reset, range summary and contextual export button. Add saved stereo audio fades and an audible export preview using the same crop/envelope as MP4; keep practice loops independent. Existing saved clip bounds remain intact.

## 1.6.2

Keep the opposite word edge anchored when resizing timeline regions. Clamp only the dragged edge at sentence boundaries; preserve duration only when moving a word. Prevent repeated end extensions from shifting the word start backward.

## 1.6.1

Show the deployed shared core version beside the Artist Studio branding and Content & Design badge. Inject the version from VERSION during the site build so every consumer reports its actual pinned release.

## 1.6.0

Add explicit timeline selection with a high-contrast region outline, selected-word chips and inspector highlighting, and a visible selection label. Delete/Backspace and the contextual delete button remove the selected word or sentence without shifting other timings. Preserve selection in Undo, ignore held-key repeats, and protect text-entry fields. Escape clears selection.

## 1.5.1

Keep Original transcript selection controls clickable in short panes by removing the overlapping sticky toolbar. Report restored text and timings after Undo. Browser-verified multiline insertion, immediate loop review, deletion and batch undo.

## 1.5.0

Add a sentence insertion composer with before/after/playhead/loop placement, multiline paste, source-timing recovery and clearly labelled audio-guided estimates. Add Original transcript selection and insertion, per-row insertion/deletion actions, overlap review, immediate Sentence loop review and reviewed markers. Keep existing timings anchored and make insertion/deletion undoable.

## 1.4.3

Expand the timeline automatically during Sentence practice so the sentence boundary and both word lanes remain visible. Restore the earlier height on exit unless the user resized it manually. Browser-verified the 1.4.2 mode transitions, line-region double-click and word-chip zoom.

## 1.4.2

Make Words a continuous cross-sentence timeline at a readable four-second zoom. Add a sentence boundary lane and clickable word chips in isolated Sentence practice. Preserve double-click targets by ignoring blur-only timing updates, capture line region double-clicks directly, and apply scroll after waveform redraw. Fix visualizer initialization after the preview canvas is attached.

## 1.4.1

Resolve long source lyrics stored as Next.js Flight text references during playlist import, including UTF-8 byte lengths and split stream chunks. Stop exposing unresolved source tokens in Original transcript. Older catalogs fall back to preserved alignment text with an explicit source-availability notice.

## 1.4.0

Add six audio-driven visualizers to the lyric video studio with a Visuals picker, independent per-style settings, direct preview dragging/resizing, colour palettes and layer placement. Use timestamp-based stereo FFT analysis for consistent preview, seeks, loops and offline MP4 frames. Legacy video projects default to no visualizer.

## 1.3.6

Make Lines, Words and Sentence exclusive timeline views with automatic full-track, context and sentence zoom. Double-click a line region or transcript row to open Sentence mode. Restore the previous loop when leaving focused editing.

## 1.3.5

Add Sentence mode: auto-fit the selected sentence, enable looping, display all word regions in alternating lanes with larger handles, and navigate previous/next sentences without entering timestamps.


## 1.3.4

Preserve unchanged word timings through lyric text corrections using sequence alignment. Estimate only changed spans, borrowing adjacent timing locally when insertions have no gap. Use edit-session baselines to prevent timing drift while typing.


## 1.3.3

Add a separate amber A/B practice loop with lead/tail context, replay, keyboard shortcuts and new sentence insertion. Add Original/Edited transcript tabs with copy, replace and insert actions, including lyrics missed by recognition.


## 1.3.1

Replace the scrolling lyric form layout with a viewport-bounded editor workspace: independently scrolling transcript/preview/inspector panes, resizable splitters, a pinned waveform and adjacent transport, compact clip/action bars, inspector tabs and narrow-screen pane switching. Add direct subtitle/word editing on waveform labels with Enter/Escape handling. Persist pane sizes locally.

## 1.3.0

Add a shared lyric timeline and video studio: WaveSurfer line/word regions, precise fields, loop/split/merge/nudge/offset/undo, SRT/VTT and project downloads. Preserve manual edits separately from analysis and apply them during build. Add artwork upload/crop, five aspect-ratio icons, five lyric effects, safe areas and H.264/AAC MP4 export with codec checks and cancellation. Unsupported encoders are reported clearly; unreliable real-time recording is not offered. Include a generated-tone interactive demo and complete help chapter.

## 1.2.0

Add opt-in remembered Studio connections with explicit forget/disconnect, persistent saved-catalog music preview, optional DJ events with timezone-aware upcoming/ongoing filtering and ICS downloads, and configurable monochrome social/music footer links. Bundle 45 Simple Icons brand SVGs plus generic support for other/custom services. Update the manual and regression tests. Legacy sites without events/links load no extra public runtime.

## 1.1.1

Ship a six-chapter Artist Studio help centre covering setup, token permissions, every editor control, drafts, publication, recovery, troubleshooting and maintainer integration. Link help from the toolbar and connection form.

## 1.1.0

Add opt-in Artist Studio: browser-only GitHub content editing, live sandboxed preview, structured pages, navigation, theme controls, local recovery, draft branches and explicit publication tracking. Preserve existing HTML, configuration and player runtime. Include structured-page validation and GitHub adapter tests.

## 1.0.2

Version app icon URLs and the shell cache from artist artwork so branding updates replace cached fallback icons.

## 1.0.1

Read the playlist-specific complete songs query instead of the truncated entity preview. Keep partial-page rejection and normalize absent lyrics for instrumental tracks. Add a lightweight catalog-refresh action and a supplied-line caption fallback while recognition is queued.

## 1.0.0

Initial extraction of the DiscoPrincess runtime and analysis pipeline into a configurable core. Added artist isolation, saved-data-only publishing, source-preserving caption estimation, starter rendering, optional entry effects, build tests and composite CI actions. Existing artist HTML and analysis results remain owned by each site.
