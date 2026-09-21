# Valle Nuevo 3D web map

Mobile-first 3D/2D map of Valle Nuevo National Park for community meetings and park rangers (ES/EN).

## Open it
- On a computer: double-click `index.html` (internet needed for the satellite image and 3D relief).
- On phones: publish this folder with GitHub Pages (same as DR-30x30-Monitor) and share the link.
  "My location" works only from an https link.

## Files
- `index.html`, `css/styles.css`, `js/app.js`, `js/i18n.js` (texts ES/EN)
- `data/data.js` : park, burned area 2026 (>= 10 ha), rivers, roads, villages, nearby protected areas (714 KB)
- `assets/lib/` : MapLibre GL JS 5.24 (bundled, no CDN)
- `assets/img/` : MMARN, KOICA, KNPS logos

## Add or change a "go to" button
Edit the `PLACES` list at the top of `js/app.js` (center + zoom, or bounds) and add its name in `js/i18n.js`.

Data: SINAP/WDPCA Sep 2026, OpenStreetMap (Geofabrik 2026-09-20), Sentinel-2 L2A dNBR (Microsoft Planetary Computer),
Mapzen Terrain Tiles, Esri World Imagery.
