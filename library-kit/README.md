# Wizard library asset kit — revision 2

[**View the revised scene**](composite.png) · [**Download the complete ZIP**](../library-kit.zip?raw=true) · [**Browse individual PNGs**](assets/) · [**Scene JSON**](scene.json)

![Revised assembled library](composite.png)

This revision addresses shelf alignment and empty shelves, smoke appearance, tea shading and perspective, cauldron placement and fire, potion-table grounding, and the rug's floor perspective. It contains 20 source/layer PNGs, 11 interactive object sprites, detailed JSON, and a browser preview.

## Changes

- **Books:** 64 separately positioned rows are fitted to traced shelf baselines across the visible shelf banks. Books are no longer baked into arbitrary floating decorative clusters. Each row's source crop, destination quad, supporting line, and height are recorded in JSON.
- **Rug:** an orthographic textile texture is mapped into the floor plane with a mesh. It has no raised edge, warped stone-floor patch, or baked floor pixels. The exact four floor corners are in JSON.
- **Potion table:** a new complete four-leg workbench replaces the floating grouped decoration. Its four foot locations and contact shadows are recorded; all projected feet lie within its floor-support region.
- **Tea:** the teapot, removable lid, cup, saucer and creamer have new warm ivory glaze, shaded undersides, low viewing angles and localized tabletop contact shadows. Grip and seating anchors were recalibrated to the new art.
- **Cauldron:** a smaller, lower-angle pot sits inside the firebox, behind the front stone sill. Separate hearth fire and rim flames render in the correct order and are clipped to the fireplace interior. Shortened banners leave the flames unobstructed.
- **Dragon smoke:** a faint transparent raster wisp replaces circular particles. Two source points remain anchored to the muzzle; a cooldown prevents repeated clicks from producing a dense cloud. Reduced motion removes expansion and drift.

## Preview

From this folder, run:

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Then open **http://127.0.0.1:8000/preview.html**. GitHub's file viewer does not run the interactive HTML; download the ZIP and run it locally.

Click the dragon for smoke or the cauldron for steam. Drag tea pieces onto the tabletop, or seat the cup on its saucer and lid on the teapot. Moving a seated parent carries its child. Invalid drops return to the last support; Escape cancels a drag; Reset restores initial placement. The object menu supports keyboard activation. Layer toggles expose the blank architecture. Rain and night controls are exterior-only demonstrations, not alternate painted weather backgrounds.

## Files

| File | Purpose |
| --- | --- |
| `assets/outside_day.png` | Opaque alpine exterior behind the transparent openings. |
| `assets/room.png` | Empty room architecture with transparent outdoor openings and preserved mullions. |
| `assets/furnishings.png` | Full-canvas transparent convenience overlay, rendered from the exact book/rug/table/decor placement data. Excludes interactive objects and hearth effects. |
| `assets/decor.png` | Short banners, chandelier, ivy, foreground tea table, chair and cushion, without books, floor rug or potion table. |
| `assets/book_row.png` | Flat-baseline source book strip used by 64 shelf instances. |
| `assets/rug.png` | Orthographic textile texture, projected by `floor_props` JSON. |
| `assets/potion_table.png` | Full-legged potion workbench. |
| `assets/hearth_fire.png` | Separate transparent logs/flames, with rear-fire and upper-flame crops in JSON. |
| `assets/smoke_wisp.png` | Transparent wisp used for dragon smoke and optional cauldron vapor. |
| `assets/dragon.png`, `gargoyle.png`, `ladder.png`, `cauldron.png`, `chest.png`, `astrolabe.png` | Individual interactive props. |
| `assets/teapot.png`, `teapot_lid.png`, `teacup.png`, `saucer.png`, `milk_jug.png` | Independent tea pieces. |
| `scene.json` | Authoritative transforms, depth, physics estimates, source crops, projective quads, anchors, contacts, click rules, weather and character-integration contracts. |
| `metadata/*.json` | Object records plus shelf/rug/table placement data. |
| `validation.json` | PNG/hash checks, attachment coincidence, table-foot support, tea-base support, book baselines, and hearth containment. |
| `preview-checks.json` | Browser checks for dragging, reset, smoke cooldown, muzzle origins and blank-room isolation. |
| `composite.png` | Native 1536 × 1024 assembled scene, without editor controls. |
| `preview.png` | Full browser workbench screenshot. |
| `smoke-preview.png` | Snapshot with the revised smoke active. |

## Assembly

Canvas: **1536 × 1024**, origin at top left, x right, y down. Scale the scene uniformly. Source-raster UV anchors include transparent margins; they do not refer to alpha-cropped bounds. Individual prop images have different native dimensions. Use the recorded dimensions and transforms.

For exact preview reproduction, use `layers` and the separate `shelf_rows`, `floor_props`, `static_props`, `effects` and `objects` collections. Draw outside at z0, architecture at z10, books at z12, floor rug at z14, rear hearth fire at z22, cauldron at z24, rim flames at z25, potion table at z32, other props at their recorded depths, foreground decor at z60, and tea above the foreground table at z75–79. Held props temporarily move to z100. Clip hearth effects and cauldron to `hearth_interior`.

`assets/furnishings.png` is a convenient preassembled raster alternative for the static portions. **Use it instead of the separate static collections, not in addition to them.** Keep `decor.png` separate when accurate foreground occlusion is needed. Never draw the room architecture into the outdoor layer.

Book rows use their source strip crops and individually traced shelf quads. Rug and books are rendered as clipped affine triangle meshes over their stored quads. Contact shadows are generated separately at support points rather than baked into prop backgrounds.

Alpha-based click testing uses threshold 32/255 after inverse coordinate conversion. Transparent handle holes pass clicks through. The preview also excludes hidden firebox regions and portions hidden behind foreground decor. Collision proxies are conservative approximations, not click masks.

## Interaction scope

Mass, capacity, friction, temperature, collision shapes and reach distances are authored design estimates. The browser is a lightweight interaction demonstrator, not a rigid-body simulator. Numeric precision does not imply measured physical accuracy.

Tea JSON includes grip points, seat constraints, pouring origins, tilt limits, volume estimates and a character-hand attachment contract. Actual wizard poses and hand occlusion artwork are not in this batch. Pouring and filled-vessel states remain specified rather than implemented.

The chest remains a closed combined sprite; opening requires separate body/lid/interior artwork. The armillary sphere needs separate ring layers for gimbal motion. Ladder sliding/climbing needs a calibrated rail and character poses. No dragon skeletal rig is supplied; smoke is animated independently without moving its ground contacts.

Warm highlights are baked into some props, so changing the exterior does not fully relight the room. Only daylight exterior art is included. Arbitrary character walk-behind still requires additional occlusion masks. Some generated opaque pixels remain at 254/255 alpha, allowing slight backdrop bleed. This remains a new interpretation of the reference rather than a pixel-exact reconstruction.
