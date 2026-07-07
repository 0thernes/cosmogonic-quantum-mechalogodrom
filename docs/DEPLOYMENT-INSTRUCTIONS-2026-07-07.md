# Deployment Instructions 2026-07-07

**Date:** 2026-07-07  
**Version:** v0.21.8  
**Status:** ✅ READY FOR DEPLOYMENT

---

## DEPLOYMENT STEPS

### Step 1: Build GitHub Pages

Run the following command from the project root:

```bash
bun run pages
```

This will:

1. Run `bun run build` to build the production bundle
2. Run `bun scripts/build-pages.ts` to assemble the GitHub Pages site
3. Copy the CONSOLIDATED-22 files to the public root docs
4. Copy all current/relevant docs to the site/docs/ directory
5. Archive local-only drafts
6. Rewrite navigation links for GitHub Pages subpath

### Step 2: Verify Build Output

Check that the `site/` directory contains:

- `index.html` (main page)
- `docs.html` (docs page)
- `specs.html` (specs page)
- `bible.html` (bible page)
- `lab/index.html` (lab page)
- `lab/consciousness/index.html` (consciousness lab)
- `lab/sentience/index.html` (sentience lab)
- `docs/CONSOLIDATED-22-MASTER-ASSESSMENT-CURRENT-2026-07-07.md`
- `docs/CONSOLIDATED-22-MASTER-ASSESSMENT-CURRENT-2026-07-07.html`
- `docs/CONSOLIDATED-22-FILE-AUDIT-CURRENT-2026-07-07.md`
- `docs/CONSOLIDATED-22-FILE-AUDIT-CURRENT-2026-07-07.html`
- `docs/CHANGELOG.md`
- `docs/ROADMAP-2026-06-26.md`
- `docs/THIRD-PARTY-NOTICES.md`

### Step 3: Commit and Push Changes

```bash
git add .
git commit -m "docs: consolidate 22 reports and update all references to CONSOLIDATED-22 files

- Consolidated 22 AI agent reports into CONSOLIDATED-22-MASTER-ASSESSMENT-CURRENT-2026-07-07
- Added CONSOLIDATED-22-FILE-AUDIT-CURRENT-2026-07-07 audit ledger
- Archived 12 historical reports in docs/reports/2026-07-07/
- Updated all documentation surfaces (README, docs.html, specs.html, bible.html, lab pages)
- Updated build-pages.ts to deploy CONSOLIDATED-22 files to GitHub Pages
- Updated CHANGELOG.md with consolidation details

Generated with [Devin](https://devin.ai)

Co-Authored-By: Devin <158243242+devin-ai-integration[bot]@users.noreply.github.com>"
git push
```

### Step 4: Verify GitHub Pages Deployment

1. Navigate to: https://0thernes.github.io/cosmogonic-quantum-mechalogodrom/
2. Test all navigation links
3. Verify CONSOLIDATED-22-MASTER-ASSESSMENT is accessible
4. Verify archive index is accessible
5. Verify all lab pages link to CONSOLIDATED-22 files

---

## FILES CHANGED

### Modified (9 files)

1. README.md
2. CHANGELOG.md
3. docs/BOOK-2026-06-26.md
4. docs.html
5. specs.html
6. bible.html
7. lab/consciousness.html
8. lab/sentience.html
9. scripts/build-pages.ts

### Deleted (3 files)

1. docs/MASTER-ASSESSMENT-2026-07-07.md (superseded by CONSOLIDATED-22)
2. docs/MASTER-ASSESSMENT-2026-07-07.html (superseded by CONSOLIDATED-22)
3. docs/FILE-AUDIT-16-FILES-2026-07-07.md (superseded by CONSOLIDATED-22-FILE-AUDIT)

### Created (1 file)

1. docs/DOCUMENTATION-UPDATE-CORRECTED-SUMMARY-2026-07-07.md

### Archived (12 files)

1-12. Historical reports moved to docs/reports/2026-07-07/

---

## VERIFICATION CHECKLIST

- [ ] `bun run pages` completes successfully
- [ ] `site/` directory contains all expected files
- [ ] CONSOLIDATED-22 files are in site/docs/
- [ ] All navigation links work on local build
- [ ] Git commit includes all changes
- [ ] Git push succeeds
- [ ] GitHub Pages deploys successfully
- [ ] All links work on deployed GitHub Pages
- [ ] CONSOLIDATED-22-MASTER-ASSESSMENT is accessible
- [ ] Archive index is accessible

---

## TROUBLESHOOTING

### Build Fails

If `bun run pages` fails:

1. Check that all modified files are saved
2. Run `bun run check` to verify the full gate passes
3. Check that CONSOLIDATED-22 files exist in docs/
4. Check that archived reports are in docs/reports/2026-07-07/

### Links Broken on GitHub Pages

If links are broken after deployment:

1. Check that build-pages.ts correctly rewrote navigation links
2. Verify that CONSOLIDATED-22 files are in PUBLIC_ROOT_DOCS
3. Check that archive directory is in LOCAL_ONLY_DOC_ARTIFACTS
4. Re-run `bun run pages` and redeploy

### Archive Not Accessible

If archive index is not accessible:

1. Verify docs/reports/2026-07-07/INDEX.md exists
2. Check that reports/2026-07-07 is in LOCAL_ONLY_DOC_ARTIFACTS
3. Verify that archived reports are in the directory
4. Re-run `bun run pages` and redeploy

---

## POST-DEPLOYMENT

After successful deployment:

1. Update GitHub Releases v0.21.8 notes with CONSOLIDATED-22 references
2. Verify CI/CD pipeline passes
3. Monitor GitHub Pages deployment status
4. Test all links on deployed site
5. Update any external documentation that references old reports

---

**Deployment Instructions Created:** 2026-07-07  
**Status:** ✅ READY FOR DEPLOYMENT
