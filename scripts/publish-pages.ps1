$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
node scripts/check.mjs
if ($LASTEXITCODE -ne 0) { throw 'Checks failed.' }
node --test tests/app.test.mjs tests/merge.test.mjs
if ($LASTEXITCODE -ne 0) { throw 'Tests failed.' }
git push origin main
if ($LASTEXITCODE -ne 0) { throw 'Commit local changes and push main before publishing.' }
$studyPagesCommit = git subtree split --prefix public HEAD
if ($LASTEXITCODE -ne 0) { throw 'Could not prepare the static website.' }
git push origin "${studyPagesCommit}:refs/heads/gh-pages"
if ($LASTEXITCODE -ne 0) { throw 'Could not publish the static website.' }
