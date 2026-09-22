# SoftDiplomacy Wiki

Independent documentation for the SoftDiplomacy OpenFront modification. The site mirrors the coverage of the OpenFront community wiki and adds original documentation for airports, passenger planes, fighter jets, attack helicopters, and base-mechanics parity.

## Local development

```bash
pnpm dev
pnpm lint
pnpm build
```

## Refreshing OpenFront wiki content

Run `node scripts/sync-wiki-content.mjs --audit <incorporated-game-commit> --available-upstream <latest-checked-game-commit> --wiki-audit <full-wiki-commit> --audited-at <YYYY-MM-DD>` to refresh the lazy-loaded articles and reapply the SoftDiplomacy pages. Use full commit hashes, not moving branch names. The recorded incorporated game commit must remain unchanged until that upgrade actually lands; a newer available commit is shown as pending.

The importer combines the official Markdown game articles with the Masters JSON articles at the same pinned revision, using Astro's Markdown renderer and explicit heading anchors. Legacy all-JSON snapshots are also supported. Incomplete imports, duplicate slugs, and failed downloads stop the update before article files are written.

After synchronization, run `node scripts/verify-upstream-images.mjs --update`, then `pnpm verify:content`, `pnpm verify:images`, `node --test scripts/*.test.mjs`, `pnpm lint`, and `pnpm build`. Content verification uses the recorded revision and checks every official article, its images, base-animation citations, and air/naval topic coverage. Keep air documentation separate from the original articles. Reviews are scheduled weekly; passing checks is not a guarantee that every game behavior is bug-free.

## Source projects

- OpenFront game: https://github.com/openfrontio/OpenFrontIO
- OpenFront community wiki: https://openfront.wiki/
- OpenFront wiki source: https://github.com/openfrontio/wiki
- SoftDiplomacy game: https://github.com/dfgamer-commits/soft-diplomacy

This is an independent community project and is not the official OpenFront wiki.
