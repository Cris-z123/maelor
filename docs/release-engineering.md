# Release Engineering

## Release Flow

Maelor uses a `release-please` driven release flow:

1. Push Conventional Commit changes to `main`.
2. `release-please` opens or updates a Release PR that bumps `package.json` and `CHANGELOG.md`.
3. Merge that Release PR.
4. The workflow creates the release tag and GitHub Release, then builds versioned Windows and macOS assets and uploads them to that release.

This keeps versioning, changelog generation, packaging, and release uploads aligned to the same version source: `package.json`.

Repository-managed release metadata:

- [release-please-config.json](D:/work/project/mailCopilot/release-please-config.json)
- [.release-please-manifest.json](D:/work/project/mailCopilot/.release-please-manifest.json)

## Local Packaging Commands

```bash
pnpm run dist:win
pnpm run dist:mac
```

Use these only for local packaging checks. Version bumps and changelog updates are managed by `release-please`, not local scripts.

## GitHub Actions

Workflow: `.github/workflows/release-assets.yml`

Trigger:

- push to `main`

Behavior:

1. runs `release-please` against `main`
2. creates or updates the Release PR when unreleased commits exist
3. after the Release PR is merged, creates tag `v<version>` and the GitHub Release
4. checks out that tag and builds Windows assets on `windows-latest`
5. checks out that tag and builds macOS assets on `macos-latest`
6. uploads all generated files to the GitHub Release

## Artifact Naming

Expected output names:

- `Maelor-<version>-windows-x64.exe`
- `Maelor-<version>-macos-<arch>.dmg`
- `Maelor-<version>-macos-<arch>.zip`

Metadata files such as `.yml` and `.blockmap` are uploaded alongside the installers and archives.

## Changelog Rules

`release-please` owns `CHANGELOG.md` generation from Conventional Commit history. Prefer commit messages such as:

```text
feat(runs): add recent run filters
fix(onboarding): handle unreadable pst files
chore(ci): cache release artifacts
```

Unsupported commit subjects still appear in the changelog under `Other`.

## Notes

- Runtime scope remains the Outlook PST MVP. macOS packaging expands release distribution, not the app feature boundary.
- Windows builds are currently self-signed internal test installers, not production-trusted releases.
- Internal test devices must import and trust the self-signed test certificate before installation.
- The old manual prepare-release and legacy release workflows have been removed.
- The macOS build is currently unsigned and not notarized. Users may need to use `Open Anyway` in `System Settings > Privacy & Security` on first launch.
- Do not manually pre-generate or hand-maintain `CHANGELOG.md`; let `release-please` create and update it in the Release PR.
