# Changes to shared behavior

1. Change runtime, scripts or composite actions here.
2. Run the Python tests and JavaScript syntax check.
3. Update `VERSION` and `CHANGELOG.md` for a meaningful release.
4. Push the tested change. Dependabot proposes an update to each consumer.
5. Review the consumer's generated-site artifact and build checks, then merge its update PR.

If changing recognition models, acceptance or source inputs, preserve audit fields and deliberately update `VERSION` in `scripts/build_lyrics.py` when cache invalidation is required. UI fixes must not invalidate audio caches.

Keep artist names, portraits, copy, videos and playlist IDs out of shared code. Browser-side settings are scoped by the artist's storage key. Avoid changes that restart audio on navigation.
