# Re:Grow Field Intelligence — Cheongyang pilot

## Scope and evidence

- Proposed location: Cheongyang-eup, Cheongyang-gun, Chungcheongnam-do, Korea.
- Cultivar: 칼라탄 (Kalatan). Its inclusion in county seedling supply is documented by Cheongyang Agricultural Technology Center: https://www.cheongyang.go.kr/cop/bbs/BBSMSTR_000000000152/selectBoardArticle.do?nttId=208170
- Proposed validation partner: Cheongyang Agricultural Technology Center. No partnership has been signed or represented as agreed. https://www.cheongyang.go.kr/cop/bbs/BBSMSTR_000000000152/selectBoardArticle.do?nttId=208171
- The default 300 × 240m field, elevations, buildings, plot positions, and 36 machine-learning examples are **synthetic demonstrations**, not an actual farm, cadastral survey, climate measurement, or cultivar trial.

## Working features

The default page is the farmer-facing **AI in Action** workflow: pick a concern,
find a paired shade/open observation window, enter a short actual observation,
revisit previous notes, and prepare a consultation memo. Technical GIS and
learning details remain available in separate views and disclosure panels.

- Observation windows require at least 30 continuous minutes of contrasting
  geometric shadow states between the selected probes, within the displayed
  analysis date. They are suggestions for measurement, not irrigation or disease
  prescriptions. The hypothetical default scene is labelled at the point of use.
- Quick entries require an explicitly selected plant status. They preserve
  previously recorded numeric observations for the same farm/date, write into
  the existing weekly diary, and never auto-fill synthetic temperatures or growth.
- Optional browser speech recognition inserts editable text only after the user
  starts it; it never saves or diagnoses automatically. Availability depends on
  browser/device support. Leaving the view or submitting cancels active capture.
- Seven-day measurement reminders are calculated from recorded heights. These
  are in-app prompts, not background notifications.
- The consultation TXT combines user-entered farm records, questions, and a
  separately labelled GIS provenance section. It is downloaded locally and is
  not sent to an institution. Benefits such as labour reduction and yield gains
  have not been measured or claimed as achieved.

1. Date/location-specific solar elevation and azimuth, implemented independently from NOAA's public equations: https://gml.noaa.gov/grad/solcalc/solareqns.PDF
2. Local elevation-grid interpolation and 3m ray marching against terrain and rectangular buildings. Probe height is 0.5m. Daily direct-sun opportunity is integrated at 15-minute intervals; the visual daily heatmap uses 30-minute intervals. Geographic limits and finite grid extent are explicit.
3. Editable building-height counterfactuals, point selection, plot comparison, sun-path playback, and terrain contours interpolated from the active grid.
4. Actual browser-local ridge regression with four standardized features: average daily temperature, temperature range, direct-sun duration, and a consistently calibrated soil-moisture index. Target: measured height increase over seven days. L2 penalty 1.2; chronological 75/25 holdout; MAE/RMSE reported. Final prediction fit uses all records. Features are explained relative to their training means, not as causal effects.
5. Field mode requires at least 12 valid weekly records, the same pilot location and cultivar, observed sunlight input, and inputs inside the training ranges. This threshold only enables the model and does not establish field performance. The error reference is 2 × holdout RMSE, not a calibrated confidence interval. Cross-farm and cross-year validation remains pending.
6. Grounded briefing uses current numerical results, intent matching, and cited references; a generative language model is not connected. The UI does not claim an LLM or computer-vision diagnosis.
7. Local observation/CSV input, source-labelled GIS JSON import, and reproducible JSON analysis export. No measurements are uploaded or shared automatically.

## Importing real GIS

Download the example JSON in the app. Required fields:

```json
{
  "version": 1,
  "name": "Survey area",
  "lat": 36.45,
  "lon": 126.8,
  "width": 300,
  "depth": 240,
  "cols": 2,
  "rows": 2,
  "elevations": [80, 82, 82, 84],
  "provenance": {"kind": "uploaded", "title": "Source + survey date", "url": "", "date": "2027-05-01"},
  "buildings": [{"id": "B1", "name": "Surveyed building", "x": 100, "y": 80, "width": 20, "depth": 20, "height": 6}],
  "plots": [{"id": "A", "name": "Plot A", "x": 80, "y": 60}]
}
```

Local x points east and y north; the origin is the southwest corner. Distances and elevation are metres. Elevations are row-major, west to east, from south to north. Every grid cell must be present. Grid dimensions: 2–81 each; scene extent: 30–2,000m each; max 30 buildings and eight plot probes. Boundary terrain is not extrapolated. Imported material is labelled **user supplied / not reviewed**, never automatically verified.

Use a ground DEM and separately joined building footprints/heights. Do not add building heights onto a DSM that already contains roofs. Public source candidates:

- NGII DEM: https://www.data.go.kr/data/15059920/fileData.do (IMG download and preprocessing needed).
- Building registry height attributes: https://www.data.go.kr/data/15044720/fileData.do (footprint join required).
- KMA village forecast: https://www.data.go.kr/data/15084084/openapi.do (key and safe server integration required; not connected by this static pilot).

No public GIS dataset has been silently substituted by fabricated national data. Real source acquisition, georeferencing, building joins, and a validation survey remain part of the proposed field project.

## Observations and validation

CSV columns:

```csv
date,plotId,cultivar,region,area,min,max,sunHours,moisture,growth7d,source
```

`cultivar` must be `칼라탄`, `region` must be `충청남도 청양군`, and `area` must be `청양읍`. Date is the period-end date. `min`, `max`, `sunHours`, and `moisture` are seven-day averages; `growth7d` is the measured seven-day height increase in cm. Synthetic rows cannot be imported as field observations. Each date/plot pair is unique. Use consistently calibrated sensors; values are not interchangeable with volumetric moisture percentages.

The diary bridge requires height observations exactly seven days apart in the same plot/location/cultivar and at least four valid intermediate daily environment records. This is a prototype aggregation rule, not an experimentally established sampling protocol.

The proposed 12-week study uses matched shade/open plots, sensors, and weekly phenotyping. UI targets (sun-duration MAE ≤30min/day, shade F1 ≥0.85, growth MAE ≤1cm/week) are **proposed acceptance targets**, not achieved results. Institutional review, consenting farms, sample-size design, ground truth, and a full-season external validation precede expansion.

## Limits

Direct-sun opportunity is not measured irradiance, illuminance, PAR, DLI, canopy photosynthesis, irrigation need, or yield. Clouds, tree transmissivity, greenhouse films, reflected/diffuse light, and obstacles outside the uploaded scene are absent. Official crop light context: https://www.nongsaro.go.kr/portal/oneclick/htmlfile/A0108010101/A010801010102.html

Run computational and interface checks with `node --test checks/pilot.test.cjs` from the repository root.
