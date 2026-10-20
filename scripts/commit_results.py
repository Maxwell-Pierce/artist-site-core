"""Commit only catalog/results; never overwrite artist configuration or runtime."""
import subprocess

def git(*args,**kwargs):return subprocess.run(['git',*args],check=True,**kwargs)
git('config','user.name','github-actions[bot]');git('config','user.email','41898282+github-actions[bot]@users.noreply.github.com')
git('fetch','origin','main')
changed=subprocess.check_output(['git','diff','--name-only','HEAD..origin/main','--','catalog-source.json','lyric-config.json','lyric-overrides.json','.artist-core'],text=True).strip()
if changed:raise SystemExit('Analysis inputs changed during this run. Results were not pushed; rerun analysis.')
git('add','tracks.json','playlists.json','lyrics/')
if subprocess.run(['git','diff','--cached','--quiet']).returncode:
    git('commit','-m','Refresh playlist catalog and lyric timings')
    git('pull','--rebase','origin','main')
    git('push','origin','HEAD:main')
