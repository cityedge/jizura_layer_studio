"""Build an allowlisted, history-free folder for manual browser upload. No network or Git operations."""
import argparse
import hashlib
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = [
    '.gitignore', 'index.html', 'VERSION', 'LICENSE', 'THIRD_PARTY_NOTICES.md',
    'README.md', 'README.en.md', 'README.id.md', 'README.ko.md', 'README.vi.md',
    'CHANGELOG.md', 'build.py', 'tools/package_release.py', 'dev/layer_test.js',
]
PATTERNS = ['src/*.js', 'app/*.py', 'app/*.js', 'app/*.html', 'app/*.css',
            'vendor/*.js', 'vendor/*.txt', 'docs/*.md']
LANGUAGES = ['en', 'id', 'ko', 'vi', 'zh-hans', 'zh-hant']


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / 'dist', help='Parent directory for a new release folder')
    args = parser.parse_args()
    subprocess.run([sys.executable, str(ROOT / 'build.py')], cwd=ROOT, check=True)
    version = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
    release = args.output.resolve() / ('JIZURA-Layer-Studio-' + version + '-' + datetime.now().strftime('%Y%m%d-%H%M%S-%f'))
    upload = release / 'upload'
    upload.mkdir(parents=True, exist_ok=False)
    paths = {ROOT / name for name in FILES}
    paths.update(ROOT / lang / 'index.html' for lang in LANGUAGES)
    for pattern in PATTERNS:
        paths.update(ROOT.glob(pattern))
    checksums = []
    for source in sorted(paths):
        if not source.is_file() or source.is_symlink() or not source.resolve().is_relative_to(ROOT):
            raise ValueError('Missing or unexpected source file: ' + str(source))
        relative = source.relative_to(ROOT)
        target = upload / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
        checksums.append(hashlib.sha256(target.read_bytes()).hexdigest() + '  ' + relative.as_posix())
    (upload / '.nojekyll').write_text('', encoding='utf-8')
    checksums.append(hashlib.sha256(b'').hexdigest() + '  .nojekyll')
    (release / 'SHA256SUMS.txt').write_text('\n'.join(checksums) + '\n', encoding='utf-8')
    largest = max(p.stat().st_size for p in upload.rglob('*') if p.is_file())
    count = len(checksums)
    (release / 'UPLOAD_README.txt').write_text(
        'JIZURA Layer Studio — cityedge fork\n\n'
        'upload フォルダの「中身」を独立したGitHubリポジトリのルートへ手動アップロードしてください。\n'
        'upload フォルダ自体をルートの下に置かないでください。index.html がリポジトリ直下にある形にします。\n'
        'このフォルダを生成しただけでは公開されません。Gitへの接続・pushは行っていません。\n'
        '詳しい手順: upload/docs/PUBLISHING.md\n\n'
        'Upload the CONTENTS of upload/ to the root of your independent repository.\n'
        'Keep index.html at repository root. No Git or network publishing has been performed.\n'
        'See upload/docs/PUBLISHING.en.md for instructions.\n\n'
        f'Files: {count}\nLargest file: {largest:,} bytes\n'
        'If the browser rejects a large selection, upload the root files and each folder in separate batches.\n', encoding='utf-8')
    print('Release folder:', release)
    print('Upload folder:', upload)
    print('Files:', count, '/ largest:', largest, 'bytes')


if __name__ == '__main__':
    main()
