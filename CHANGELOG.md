# Changes

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
