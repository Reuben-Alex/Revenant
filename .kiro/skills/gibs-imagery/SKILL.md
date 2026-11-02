---
name: gibs-imagery
description: Fetch NASA GIBS VIIRS true-colour and snow-cover frames for the Revenant bounding box and pick low-cloud keyframes.
---
# GIBS imagery for Revenant
Endpoint (WMS 1.3.0, EPSG:4326, BBOX order lat,lon):
`https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&CRS=EPSG:4326&BBOX=54,-126,60,-109&WIDTH=1060&HEIGHT=716&FORMAT=image/jpeg&LAYERS=VIIRS_SNPP_CorrectedReflectance_TrueColor&TIME=YYYY-MM-DD`
- Snow: `LAYERS=VIIRS_SNPP_NDSI_Snow_Cover&FORMAT=image/png&TRANSPARENT=TRUE` (opaque pixel = snow; transparent = no snow OR cloud OR no data; treat a frame with < 2000 opaque px region-wide as missing).
- Keyframes: for each target date ±5 days, score cloud = share of pixels with brightness > 165 that are NOT snow; drop frames with > 5% black (swath gaps); pick the lowest score.
- Save as WebP q72, 1060×716. Credit "NASA GIBS · VIIRS".
