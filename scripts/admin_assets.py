"""Version the complete static admin module graph, including dynamic imports."""
import hashlib,re

def version_admin(root):
    files=sorted(path for path in root.rglob('*') if path.is_file())
    digest=hashlib.sha256()
    for path in files:digest.update(str(path.relative_to(root)).encode());digest.update(path.read_bytes())
    version=digest.hexdigest()[:16]
    for path in files:
        if path.suffix in ('.mjs','.js'):
            text=path.read_text()
            text=re.sub(r'''((?:from\s*|import\s*\(\s*|import\s*)['"])(\.{1,2}/[^'"?]+\.(?:mjs|js))(?:\?v=[a-f0-9]+)?(['"])''',lambda m:m[1]+m[2]+'?v='+version+m[3],text)
            path.write_text(text)
        elif path.suffix=='.html':
            text=re.sub(r'''((?:src|href)=['"])(?!https?:|//)([^'"?]+\.(?:mjs|js|css))(?:\?v=[a-f0-9]+)?(['"])''',lambda m:m[1]+m[2]+'?v='+version+m[3],path.read_text())
            path.write_text(text)
    return version
