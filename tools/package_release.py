"""Build an allowlisted, history-free folder for manual browser upload. No network or Git operations."""
import argparse
import hashlib
import shutil
import subprocess
import sys
import zipfile
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = [
    '.gitignore', 'index.html', 'VERSION', 'LICENSE', 'THIRD_PARTY_NOTICES.md',
    'README.md', 'README.en.md', 'user_guide.md', 'user_guide.en.md', 'tools/obsolete_files.txt',
    'CHANGELOG.md', 'build.py', 'tools/package_release.py', 'dev/layer_test.js', 'dev/filler_test.js', 'dev/simple_export_test.js', 'dev/native_spectrum_test.js',
    'dev/transition_test.js', 'dev/coverage_review_test.js', 'dev/global_taste_test.js', 'dev/preview_audio_test.js', 'dev/text_test.js', 'dev/local_fonts_test.js',
    'dev/background_color_test.js', 'dev/theme_test.js',
    'dev/user_theme_test.js', 'dev/appearance_test.js', 'dev/motion_library_test.js', 'dev/motion_pitch_test.js',
]
PATTERNS = ['src/*.js', 'app/*.py', 'app/*.js', 'app/*.html', 'app/*.css',
            'vendor/*.js', 'vendor/*.txt', 'vendor/*.tgz', 'docs/*.md']
LANGUAGES = ['en']


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
    obsolete = [line for line in (ROOT / 'tools/obsolete_files.txt').read_text(encoding='utf-8').splitlines() if line and not line.startswith('#')]
    for name in obsolete:
        relative = Path(name)
        if relative.is_absolute() or '..' in relative.parts or (ROOT / relative).exists():
            raise ValueError('Obsolete-file list contains an unsafe or existing path: ' + name)
    (release / 'DELETE_FROM_REPOSITORY.txt').write_text(
        '手動アップロードでは削除されない旧ファイル（layer.13 / layer.14 → layer.15）\n\n'
        '新しい upload/ の中身をアップロードした後、GitHub上で下記の旧ファイルを削除してください。\n'
        'すでに存在しないものはスキップしてください。app/ フォルダ全体は削除しません。\n'
        'この一覧をアップロードしても自動削除は実行されません。\n'
        '手順: upload/docs/PUBLISHING.md\n\n'
        'After uploading the new files, delete these obsolete paths on GitHub.\n'
        'Skip absent files. Do not delete the entire app/ folder. This list performs no automatic deletion.\n\n'
        + '\n'.join(obsolete) + '\n', encoding='utf-8')
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
        '更新時の削除対象: DELETE_FROM_REPOSITORY.txt（上書きアップロードだけでは消えません）\n\n'
        'Upload the CONTENTS of upload/ to the root of your independent repository.\n'
        'Keep index.html at repository root. No Git or network publishing has been performed.\n'
        'See upload/docs/PUBLISHING.en.md for instructions.\n\n'
        'For updates, also follow DELETE_FROM_REPOSITORY.txt; uploading does not delete old files.\n\n'
        f'Files: {count}\nLargest file: {largest:,} bytes\n'
        'If the browser rejects a large selection, upload the root files and each folder in separate batches.\n', encoding='utf-8')
    archive = release / ('JIZURA-Layer-Studio-v' + version + '.zip')
    with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED) as bundle:
        for path in sorted(upload.rglob('*')):
            if path.is_file():
                bundle.write(path, path.relative_to(upload).as_posix())
    with zipfile.ZipFile(archive) as bundle:
        if bundle.testzip() is not None or len(bundle.namelist()) != count:
            raise ValueError('Release ZIP verification failed')
        for path in upload.rglob('*'):
            if path.is_file() and bundle.read(path.relative_to(upload).as_posix()) != path.read_bytes():
                raise ValueError('Release ZIP content mismatch: ' + str(path))
    archive.with_suffix('.zip.sha256').write_text(hashlib.sha256(archive.read_bytes()).hexdigest() + '  ' + archive.name + '\n', encoding='utf-8')
    print('Release folder:', release)
    print('Upload folder:', upload)
    print('Files:', count, '/ largest:', largest, 'bytes')
    print('Release ZIP:', archive)


if __name__ == '__main__':
    main()
