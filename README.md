# SoftDiplomacy Wiki

Independent documentation for the SoftDiplomacy OpenFront modification. The site mirrors the coverage of the OpenFront community wiki and adds original documentation for airports, passenger planes, fighter jets, attack helicopters, and base-mechanics parity.

## Local development

```bash
pnpm dev
pnpm lint
pnpm build
```

## Refreshing OpenFront wiki content

Run `node scripts/sync-wiki-content.mjs` to download the current OpenFront wiki data, split it into lazy-loaded article files, and reapply the SoftDiplomacy pages. Pass `--audit <OpenFront commit>` to record the reviewed upstream revision.

## Source projects

- OpenFront game: https://github.com/openfrontio/OpenFrontIO
- OpenFront community wiki: https://openfront.wiki/
- OpenFront wiki source: https://github.com/openfrontio/wiki
- SoftDiplomacy game: https://github.com/dfgamer-commits/soft-diplomacy

This is an independent community project and is not the official OpenFront wiki.
