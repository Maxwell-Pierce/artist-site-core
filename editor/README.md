# Artist Studio

Optional static content editor, shipped by the shared core. Enable with `builder.json` containing `{"enabled":true}`, build, then visit `/admin/`. There is no backend and no conventional OAuth login. Enter `owner/repository`, the published branch, and a fine-grained GitHub token granting Contents read/write on that repository. Browser API requests use an in-memory token by default. The explicit Remember connection option stores it locally for automatic reconnection for 30 days; Disconnect/Forget clears it. Do not embed tokens in configuration or HTML.

The shared editor owns the UI, validation, preview, and GitHub adapter. Consumers own `artist.json`, optional `pages.json`, HTML templates, branding, and assets. Existing fields, including unknown extensions, are preserved. Existing HTML pages are not converted or overwritten. The editor must be explicitly enabled; old consumers do not receive an admin route or changed player code.

## Editing

- Home: headline, accent, introduction, about copy and captions using existing `{{field.path}}` placeholders.
- Identity: artist name, tagline, search description, entrance copy and portrait.
- Appearance: six theme colours with desktop/mobile preview.
- Pages: create, remove and reorder pages; add text, image and link sections; reorder sections and customise menu links. Image paths can be selected from existing repository assets. Uploading new media is not yet included.
- Undo, local recovery scoped to repository/branch, and JSON export. Local recovery is blocked after the production branch changes to avoid overwriting newer content; exported drafts can be reconciled manually.

Preview uses the actual artist HTML template and generated stylesheet in a sandboxed iframe. A separate native audio player previews saved catalog tracks and persists across edits. The visual frame does not execute JavaScript, custom interactions or video playback. It is a visual content preview, not an executable replica of the player. Home sections hardcoded in custom HTML need placeholders before configuration edits affect them. Extra pages use the artist shell with escaped structured content. HTML block editing is deliberately not offered.

## Drafts and publication

Save draft creates a `studio/draft-<timestamp>` branch, then commits both content files together. It does not change the configured production branch. Draft visibility follows repository visibility: a branch in a public repository is public. The default template workflow only deploys main; custom workflows must likewise exclude draft branches.

Publish commits both files to the production branch. The branch head must match the revision loaded into the editor. GitHub updates the reference without force, protecting against concurrent writers. Protected branches may reject direct publication; this version does not create or merge pull requests. Reconnect when another writer advances the branch.

Pages deployment is asynchronous. The editor checks `build-info.json` for the exact published site commit and only then reports Live. It times out after roughly 20 minutes with a workflow-check message. It does not claim deployment success from commit success. The existing saved-data build does no audio analysis, package install or model download. Workflow queuing and Pages propagation remain outside the editor's control. No cached-renderer fast path is introduced in this release; this Python build already copies the renderer directly.

Public visitors access only deployed files; no repository name or token is baked into the admin bundle. The underlying repository must itself be made private if its source is meant to be private (subject to GitHub plan support). Any file deliberately deployed to Pages is publicly retrievable.

## Page format

```json
{
  "schemaVersion": 1,
  "navigation": [{"label": "Music", "href": "index.html#music"}],
  "pages": [{
    "slug": "story", "title": "Our story", "label": "Story",
    "description": "Behind the music", "nav": true,
    "blocks": [
      {"type": "text", "heading": "A new chapter", "text": "Your story."},
      {"type": "image", "src": "assets/portrait.webp", "alt": "Artist portrait", "caption": "In the studio"},
      {"type": "link", "text": "Listen", "href": "index.html#music"}
    ]
  }]
}
```

`navigation` is optional: omit it to retain the artist's original menu. Visible generated pages are appended to the menu. Slugs cannot collide with existing HTML, admin, index or offline pages. Deleting a generated page removes it from the next clean build. Scheme-relative links, traversal and executable URLs are rejected by both the editor and build pipeline.

Checks: `python -m unittest discover -s tests`, `node --test tests/editor.test.mjs`, `node --check editor/studio.mjs`.

## Events and links (1.2)

Studio edits optional `artist.calendar` and `artist.socials` configuration. Calendar has `enabled`, `heading`, IANA `timezone`, `limit` and an `events` array. Each event has a unique `id`, `title`, offset-qualified ISO `start`, optional `end`, `venue`, `city`, `description`, HTTPS `url`, `linkLabel` and `cancelled`. Events are entered in device-local time and stored as UTC. Public cards use the configured display zone, sort upcoming/ongoing appearances and hide expired/cancelled entries. Disabled or empty calendars have no public section. Calendar export uses RFC 5545 ICS. No external calendar sync is included.

Socials has `heading` (default Available on) and `links`, each with a named `platform`, HTTPS `url` and optional `label` (required for custom). Email accepts mailto. 45 Simple Icons SVGs are bundled under CC0; more named choices and unlimited custom services use the generic globe. Only configured links are shown, in order, in the footer on public pages. No remote icon service is used. Existing consumers with neither feature load no extra public runtime.

## Lyric and video studio (1.3)

See [the complete timeline/video manual](help/lyrics.html). WaveSurfer 8.0.3 supplies waveform, draggable regions and ruler. Mediabunny 1.62.1 supplies frame-accurate H.264/AAC MP4 on supported browsers. Unsupported browsers retain timeline/subtitle/project editing but cannot export MP4. Real-time recording is not used because startup latency can omit initial video frames. Both are pinned, served locally and licensed under editor/vendor. No camera, microphone, screen capture or backend is required. A generated-tone demo at lyric-demo.html supports token-free UI and export checks without repository writes.

Manual timing documents live under lyric-edits, separate from analysis output. The build applies them after automatic results, validates track identity/duration and line/word bounds, and retains manual/estimated provenance. Video project JSON stays in the source repository; uploaded artwork is compressed and embedded in that project. Local audio fallback is never uploaded. The existing Save/Publish workflow writes changed creative files atomically with site content.
