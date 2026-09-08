# Project Notes

## Ice emblem 3D model (src/app/components/ice)

The "ice" component renders a 3D crystal emblem with Three.js, derived from
`src/assets/images/3d-image.svg` (LibreOffice Draw export).

### Reference SVG
- viewBox `0 0 21590 27940`; bilateral symmetry axis at `x = 10777`.
- Contains blue line-work (`rgb(52,101,164)`) plus 2 filled circles
  (`rgb(114,159,207)`).
- We ADDED a `FilledClosedObjects` group of 7 filled paths (same fill as the
  circles) marking each closed object. These fills are the source of truth for
  the 3D objects.
- IGNORE the older `1000001115.*` tattoo files (removed from project).

### Architecture (refactored into one file per object)
`src/app/components/ice/shapes/`
- `shape-utils.ts` — shared: `CX=10777`, `CY=15287`, `SCALE=0.00024`,
  `DEPTH=0.16`, `toWorld()`, `extrudeContour()`, `buildSphere()`.
- `central-spike.ts`, `upper-crown.ts`, `side-blade-right.ts`,
  `side-blade-left.ts`, `lower-blade-right.ts`, `lower-blade-left.ts`,
  `spade-tail.ts` — 7 extruded outline objects (contours in raw viewBox units).
- `spheres.ts` — `buildLeftSphere()` (8041,17232,r423),
  `buildRightSphere()` (13454,17117,r423).
- `index.ts` — `buildIceEmblem()` builds all 9, converts to non-indexed,
  `mergeGeometries`, then computeVertexNormals/center/bounding volumes.
- `ice.ts` — lean component; calls `buildIceEmblem()`.

### Key lessons / gotchas
- `mergeGeometries` returns null (silent black screen) if parts have mismatched
  attributes OR mixed indexed/non-indexed. FIX: convert all to `.toNonIndexed()`
  before merge. Extrude geoms are non-indexed; spheres are indexed.
- Glass material (`transmission:1`) is invisible on dark bg; currently
  `transmission:0` (opaque) for evaluation. Restore transmission later for the
  intended ice look.
- Blades must be flat bevel-extruded outlines (angular), NOT swept tubes
  (they pinch at sharp corners and look too soft).
- Editing tool escaping: `single_find_and_replace` kept failing on
  literal-newline args; prefer `edit_existing_file`/`create_new_file`.

### Build / run
- Build check: `npx ng build --configuration development --output-path=public_html`
- Dev server: `npm run dev` (restart it after adding/removing .ts files — the
  watcher caches deletions and throws "missing from TypeScript compilation").

### Status (last session)
- All 9 objects + combiner created; `ice.ts` rewritten to use `buildIceEmblem()`.
- Build passes cleanly. NEXT: user to view render; then tune per-object
  contours/positions, sphere radius, extrude depth, and eventually re-enable
  transmission/tint for the icy look.

### About fugu-config.yaml
- User asked about a `fugu-config.yaml` to raise token/turn allowance. This is a
  Fugu orchestration setting, not part of this repo; not created. Follow up:
  confirm whether such a config is supported in their environment.