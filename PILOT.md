# Re:Grow pilot — record, locate, ask, revisit

Updated 2026-11-16 (Korea). Public app: https://35eunlee.github.io/Regrow-pepper-guide/

## Farmer experience

The four navigation items are Home, Weekly records, AI consultation, and Farmer
stories. Weekly records contain **오늘 할 일 / 밭 지도** tabs. Pest and growth
changes are entered alongside the day's status, notes, irrigation, soil condition
and optional temperature/weather. The standalone growth model, validation menu,
abstract field illustration and duplicate assistant route are removed from the
active interface. The consultation header reuses the existing photographic pepper
asset; it is an introduction image, not a photograph of the selected farm.

An explicit problem/status or symptom entry saves into the existing daily diary
and prepares its date, note, symptom tags and farm key for point/polygon marking.
Saving the mapped observation links its ID back to the same diary entry and opens
an adaptive follow-up card. The same interview is available in AI consultation.
Answers are retained, the next question changes, a revisit date can be saved, and
a TXT consultation memo combines the observations, responses and reference.
Legacy #pilot links open consultation; #map and #clinic links open weekly records.
Existing diary and pest records remain on the device. Old optional quantitative
measurements are retained in stored diary objects, without exposing the former
model-training controls to farmers.

## What the consultation actually does

`field-reasoner.js` computes Korean word/character-bigram TF-IDF similarity over
five small curated observation topics. Explicit follow-up answers adjust the
order of checks. It chooses the next unanswered question from the relevant topic;
unrecognized questions first ask which change the farmer observed. This is an
offline retrieval and conditional interview, not an externally connected LLM,
computer-vision diagnosis, validated disease classifier or calibrated probability.
The disclosure is visible beneath each answer's evidence and sources.

The current farm's irrigation entries from the preceding three days, same-day soil
state, explicitly entered weather/temperature and selected GIS observation are
shown as evidence. Existing answers are not asked again. An explicit new response
overrides an earlier diary response. Missing data is not invented. A received
observation file does not inherit the researcher's own irrigation history. Changed
extent raises a follow-up priority, without claiming disease spread was inferred.
Three responses lead to a concrete observation plan; further questions remain
optional. Plans never prescribe a pesticide, diagnosis or universal water dose.

Reference material, paraphrased as observation guidance:

- RDA Nongsaro, pepper water requirements:
  https://www.nongsaro.go.kr/portal/oneclick/htmlfile/A0108010101/A010801010103.html
- RDA Nongsaro, light conditions:
  https://www.nongsaro.go.kr/portal/oneclick/htmlfile/A0108010101/A010801010102.html
- RDA/NIHHS aphid observation video (2019):
  https://www.nongsaro.go.kr/portal/ps/psb/psby/vodPlay.ps?mvpClipNo=6&mvpNo=741
- RDA/NIHHS fruit-spot observation video (2019):
  https://www.nongsaro.go.kr/portal/ps/psb/psby/vodPlay.ps?mvpClipNo=2&mvpNo=741

## Home information and recommendations

`farm-news.js` ranks verified official reading links using current target periods,
recent same-farm observation topics, and time-decayed reading topics from this
browser. Reasons are shown with each card. Dated bulletins show publication and
target dates separately; expired items are marked historical and lose priority.
Undated reference material and 2019 videos are not presented as current outbreaks.
The source list was checked on 2026-11-16; it is a dated editorial snapshot, not a
continuously refreshed news feed. Personal reading history can be cleared.
No aggregate visitor analytics or fabricated popularity counts are used.

Verified period references:

- NCPMS monthly bulletin 14, target 2026-11-01–30, published 2026-11-02:
  https://ncpms.rda.go.kr/npms/NewIndcUserListR.np
- NCPMS weekly farming information 46, target 2026-11-16–22, published 2026-11-11:
  https://ncpms.rda.go.kr/npms/WeekFarmInfoListR.np
- Current warnings: https://www.weather.go.kr/w/special-report/list.do
- Ten-day outlook: https://www.weather.go.kr/w/forecast/overall/mid-term.do

For a farm explicitly set to Cheongyang-eup, the browser attempts the existing KMA
RSS zone 4479025000. A weather card is shown only with a fresh publication and
future valid rows within 72 hours. Its range is explicitly the minimum/maximum
among provided forecast times, not an observed daily minimum/maximum or plot
microclimate. Other regions, stale responses, missing dates or failed connections
show no invented values; official latest-source links remain available. The
prototype does not invent a tomato outbreak or a next-week heatwave.

## Practical GIS and collection

The named starting landmark is Cheongyang Agricultural Technology Center,
충남 청양군 청양읍 구봉로 1026-84, approximately 36.42328,126.7794.
It does not indicate an actual cultivated parcel or institutional partnership.
The technical bounding rectangle is latitude 36.30–36.65, longitude 126.60–127.05;
it is not a surveyed administrative boundary.

The practical map supports one-pointer drag, two-pointer anchored pinch, wheel
zoom, optional GPS, accessible +/- buttons and keyboard navigation. Panning does
not add a record. Point/polygon mode creates geometry only on an intentional tap;
polygon area is an approximate local projection, not a cadastral survey. No
unverified 3D building height or irradiance is shown in this workflow.

Visible basemaps are Esri World Imagery (attribution: Esri, Vantor, Earthstar
Geographics, GIS User Community) and OpenStreetMap (ODbL contributors). Actual
roofs/roads are visible when those external tiles load. Imagery age and current
building appearance are not guaranteed. Tiles are display-only, not included in
exports or presentation assets; there is no bulk/offline tile export.

Observations and up to three resized JPEGs are stored in IndexedDB
`regrow-field-gis-v1`. Photos are resized to at most 1,200px and re-encoded, removing
metadata. No photo is auto-uploaded or automatically diagnosed. Daily links use
`diaryDate` and `fieldIds`; mapped follow-up answers are also retained with the
observation and included in deliberate GeoJSON exports. Local consultation state
is `rg-field-interviews-v2`; view preferences use `rg-farmer-workflow-v2`; personal
reading events use `rg-news-views-v1`. Existing `rg-daily-logs` / `rg-symptoms` data
remain compatible. Removing browser site data removes these local records.

Sharing remains deliberate: GeoJSON rounds locations to 0.001 degrees (roughly
100m) and omits polygon boundaries by default. Exact geometry and photos require
explicit choices; photographs are packaged with GeoJSON as ZIP. Coarsened
coordinates are not promoted to exact on re-export and are excluded from 30m
clustering. Received GeoJSON can be combined by a research team; IDs deduplicate,
existing records are kept, follow-up responses remain unreviewed, and photos are
inspected separately after ZIP extraction. Limit: 1,000 observations per device.

A selected report can optionally be drafted as a public GitHub issue after a
disclosure checkbox. The farmer must log in, review and submit it. Coarse location,
shortened note/action and no automatic photos are used. Public reports are fetched
only on request, at most the latest 100 issues, and labelled unreviewed. There is
no automatic shared research server or global readership database.

## Verification and technical archive

Run `node --test dist/checks/*.test.cjs` in this source checkout (or
`node --test checks/*.test.cjs` in the published-root layout). Checks cover diary
preservation, actual script/route wiring, mapped problem links, answer-dependent
follow-up and non-repetition, topic personalization/expiry, forecast gating,
pan/pinch versus record taps, HTML escaping, observation validation, source-labelled
imports, location precision, ZIP/CRC, and explicit IndexedDB submit/status updates.
Static markup for home, weekly records, mapped forms and consultation was checked
for balanced tags and duplicate IDs. A browser runner is unavailable in this
environment: external tiles, device photo capture, real GPS, CORS and visual layout
on a physical phone still need an end-to-end device check.

The earlier NOAA solar, synthetic ridge-regression experiment and sample scenes
remain as source/test history, not active farmer-facing features. Their past
validation targets were never achieved field measurements. Presentation PNG/SVG
assets are source-based UI mockups with illustrative data labelled as examples,
not browser screenshots or claimed model performance.


## Record-based substrate and seed advice (2026-11-16)

AI consultation now has **변화 상담 / 상토·종자 추천** tabs. A material-selection
question also opens the appropriate tab. `material-advisor.js` uses current-farm
settings, up to 30 days of diary entries, recent explicit soil observations and
follow-up answers, and same-farm seed search history. It does not import another
farm's irrigation history or future diary entries. Matching is transparent rules
and stored preferences, without a connected LLM or product ranking model.

Substrate advice compares labels for pepper seedling use, drainage, aeration and
water retention. Wet/dry observations change which comparison criteria appear
first; extra watering alone is not diagnosed as excess moisture. For a farm past
the seedling stage, the app asks when substrate will be used before showing a
comparison search. Seed advice reuses known purpose/heat preferences, asks for
missing region, purpose or heat, and combines those with the growing environment.
Observed spots/pests prompt verification of resistance labels and their exact
disease scope; they never establish a disease or required resistant cultivar.

The result is an evidence-labelled selection brief with deliberate external
comparison-search links. Manufacturer catalogs, current prices, inventory,
individual brand/cultivar performance and supplier verification are unconnected.
No brand, best-product claim or yield guarantee is fabricated. Preferences can be
changed independently of retained historical seed searches.

Sources verified for the selection criteria:

- RDA, pepper seedling methods and substrate properties:
  https://www.rda.go.kr/middlePopOpenPopNongsaroDBView.do?no=1112
- Cheongyang Agricultural Technology Center, cultivar selection considerations:
  https://www.cheongyang.go.kr/farm/sub02_01_05_01.do
