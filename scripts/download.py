import hashlib
import json
import time
import urllib.request
import zipfile
from pathlib import Path


def main():
    directory = Path(__file__).resolve().parent.parent / 'data'
    directory.mkdir(exist_ok=True)
    archive = directory / 'olist.zip'
    partial = directory / 'olist.zip.part'
    url = 'https://www.kaggle.com/api/v1/datasets/download/olistbr/brazilian-ecommerce'
    if not archive.exists() or not zipfile.is_zipfile(archive):
        for attempt in range(4):
            try:
                offset = partial.stat().st_size if partial.exists() else 0
                request = urllib.request.Request(url, headers={'User-Agent': 'Olist-local-research/1.0', **({'Range': f'bytes={offset}-'} if offset else {})})
                with urllib.request.urlopen(request, timeout=90) as response:
                    resume = response.status == 206 and response.headers.get('Content-Range', '').startswith(f'bytes {offset}-')
                    with partial.open('ab' if resume else 'wb') as output:
                        while chunk := response.read(1024 * 1024):
                            output.write(chunk)
                with zipfile.ZipFile(partial) as zipped:
                    if zipped.testzip():
                        raise ValueError('Dataset ZIP checksum failed')
                partial.replace(archive)
                break
            except Exception:
                if attempt == 3:
                    raise
                time.sleep(2 ** attempt)
    with zipfile.ZipFile(archive) as zipped:
        for member in zipped.infolist():
            if not member.filename.endswith('.csv') or Path(member.filename).name != member.filename:
                continue
            target = directory / member.filename
            if target.exists() and target.stat().st_size == member.file_size:
                continue
            temporary = target.with_suffix('.csv.part')
            with zipped.open(member) as source, temporary.open('wb') as output:
                while chunk := source.read(1024 * 1024):
                    output.write(chunk)
            temporary.replace(target)
    checksum = hashlib.sha256(archive.read_bytes()).hexdigest()
    manifest = {'source': url, 'sha256': checksum, 'bytes': archive.stat().st_size, 'csv_files': sorted(path.name for path in directory.glob('*.csv'))}
    (directory / 'download.json').write_text(json.dumps(manifest, indent=2))
    print(json.dumps(manifest))


if __name__ == '__main__':
    main()
