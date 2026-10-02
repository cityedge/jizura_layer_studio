# Manual publication

## Publishing v1.4.0

Upload the contents of the new `upload/` folder and attach `JIZURA-Layer-Studio-v1.4.0.zip` to your Release. Use the 1.4.0 entry in `CHANGELOG.md` for the release description. Both manuals, source files, licenses and verification tests are included.

After publication, check the **v1.4.0** header, both interface languages and manual links. Verify Binary/Alpha modes, background color opacity, decorative-number hiding (preserving lyrics and [timestamp]), themes with cue keys 1–6/9/0, JSON restoration of settings and fillers, and short pair/simple MP4 exports. The manuals include the Difference-based alpha compositing workflow. This update removes no files relative to v1.3.2. Follow the legacy deletion instructions below only for obsolete files left from earlier multilingual releases.

Publish this derivative as an independent repository without GitHub Fork, git push or upstream synchronization. Preserve the original copyright, MIT license and third-party notices.

## Create the upload folder

From the repository root, using Python 3.10 or later (standard library only):

```text
python tools/package_release.py
```

Use the Python executable for your environment. The script rebuilds all HTML editions and creates a new timestamped directory under `dist/`. Use `--output PATH` to choose another parent directory. It does not overwrite previous bundles or perform Git/network operations.

- `upload/`: app, source, documentation and licenses.
- `UPLOAD_README.txt`: destination instructions.
- `SHA256SUMS.txt`: hashes of files in `upload/`.

An allowlist excludes Git history, virtual environments, input media, generated tests and upstream AE/CEP distributions. The included source and build scripts can rebuild the published HTML.

## Upload to GitHub

1. Create an independent repository in your account, for example `JIZURA-layer-studio`. Do not use Fork; automatic README/license creation is unnecessary.
2. Drag the **contents** of `upload/` into the repository upload screen. Keep `index.html`, `README.md` and `LICENSE` at repository root, not inside an `upload/` folder.
3. Upload in batches if necessary: root files, then `app/`, `src/`, each language folder, etc. Browser uploads are limited to 25 MiB per file and 100 files at a time.
4. Use the web page’s “Commit changes” action. No local git push is needed.
5. Check the file paths, including `en/index.html`.

See [GitHub’s upload instructions](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository).

## Optional GitHub Pages

After all files are uploaded, go to Settings → Pages, choose “Deploy from a branch”, the uploaded branch (usually main), and `/ (root)`. Pages availability depends on your plan and repository visibility. Open the URL GitHub provides after deployment. Test language switching, both dialogs and a short MP4 pair export on that URL. Allow multiple downloads when prompted, or use the individual save links.

See [GitHub’s Pages source instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

For updates, change source, VERSION and CHANGELOG, test, generate a new bundle and manually upload its files. Delete obsolete/renamed files on GitHub too; uploads alone do not remove them. Verify the displayed version after Pages updates. Local commits can remain private recovery records. Upstream updates are optional.

## Updating the old language editions

When updating from layer.13 / layer.14 to the Japanese/English edition, upload the new files, then delete the 18 obsolete paths in `DELETE_FROM_REPOSITORY.txt`. The same list is stored in [tools/obsolete_files.txt](../tools/obsolete_files.txt). Skip absent files. The list covers five old language HTML files, three README translations and ten translation sources. Do not delete the entire `app/` folder.

Open each old file on GitHub and use the top-right menu → Delete file → Commit changes. If an old language directory contains only the obsolete HTML, use Delete directory instead. Review the deletion before committing. The new language menu should contain only Japanese and English. Old files left online still serve the old app at their URLs; uploading alone does not remove them. You do not need to recreate the repository.

See [GitHub's file and directory deletion instructions](https://docs.github.com/en/repositories/working-with-files/managing-files/deleting-files-in-a-repository).

## Site URL

The default canonical and OG URL is https://cityedge.github.io/jizura_layer_studio/. Language links are relative. Override `JIZURA_SITE_URL` for another site, or set it to an empty string to omit site metadata.

Edit identity in `app/publication.py` and `app/body.html`, and guides in `app/guide.ja.html` and `app/guide.en.html`. Full notices are embedded from LICENSE and THIRD_PARTY_NOTICES.md at build time. Do not edit generated HTML alone.

## Release ZIP and site URL

Packaging also creates a ZIP with `index.html` at archive root. Attach it to GitHub Releases; upload the extracted files to update Pages. Preserve the Mediabunny source archive and license. The default canonical/OG site URL is https://cityedge.github.io/jizura_layer_studio/; override `JIZURA_SITE_URL` for a different site or set it to an empty string to omit these tags.
