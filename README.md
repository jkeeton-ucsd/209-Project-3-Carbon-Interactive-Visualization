# How Wealth Shapes Carbon Footprints

Project 3 — interactive D3 visualization of GDP per capita vs CO₂ (and other metrics) per person, 1960–2018, using World Bank data.

**Live site:** `https://<your-username>.github.io/<repo-name>/`

## What's here

```
index.html                  page: prototype + 5 exploratory charts + data notes + write-up stub
css/style.css               all styling; color tokens (light + dark mode) at the top
js/main.js                  loads data once, calls each chart's draw()
js/common.js                shared: data loader, region/income colors, tooltip, axes, legend
js/prototype.js             WIP final graphic: animated scatter, year slider, metric + region dropdowns
js/explore1_wealth_vs_co2.js     static scatter, 2018
js/explore2_income_trends.js     median CO₂/capita over time by income group
js/explore3_top_emitters.js      top-15 bars, per-person vs total toggle
js/explore4_wealth_vs_life.js    GDP vs life expectancy, 2018
js/explore5_trajectories.js      connected scatter for 6 countries, 1960–2018
data/wb_clean.csv           cleaned, merged data (~1.2 MB, 213 countries × years)
scripts/prepare_data.py     rebuilds wb_clean.csv from the raw repo
.nojekyll                   tells GitHub Pages to serve files as-is
```

One file per chart, so teammates can each own one without merge conflicts.

## Run locally

ES modules and `d3.csv` don't work from `file://`, so serve the folder:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

(VS Code's "Live Server" extension works too.)

## Deploy to GitHub Pages

1. Create a **public** repo on GitHub (no README, since this one has one).
2. From this folder:
   ```bash
   git init
   git add .
   git commit -m "Starter: checkpoint charts + prototype"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
3. Repo → **Settings → Pages** → Source: *Deploy from a branch* → Branch `main`, folder `/ (root)` → Save.
4. The site appears at `https://<you>.github.io/<repo>/` after a minute or two.
5. Add teammates under **Settings → Collaborators**.

## Rebuilding the data

```bash
git clone --depth 1 https://github.com/light-and-salt/World-Bank-Data-by-Indicators.git wb-raw
pip install pandas
python3 scripts/prepare_data.py wb-raw
```

Don't commit `wb-raw/` (it's ~500 MB) — it's in `.gitignore`.

## Data notes

- GDP per capita is **constant 2010 US$** (inflation-adjusted, not PPP). A PPP series exists in the raw repo from 1990 only.
- CO₂ series end in **2018** in this snapshot of the data; everything stops there.
- Life expectancy = mean of male and female series (the repo has no "total" column).
- Income groups are the 2021 classification, applied to all years.
- Outliers worth knowing: Aruba (up to ~360 t/person in early years — a refinery on a tiny population) and Gulf states (UAE, Qatar, Kuwait) have extreme CO₂ per capita. They stretch the y-axis in the animated chart; decide whether to clip, annotate, or keep them.

## Known to-dos for the final

- Region uses 7 colors, which is more than can be told apart reliably in a scatter (especially with color-vision deficiency). The highlight dropdown / legend click helps; consider also faceting or fewer groups.
- Fill in "What we noticed" notes and the write-up (rationale + process). The rubric penalises an AI-written write-up — write it yourselves.
- Ideas: country search box, trail for a selected country, annotations of key events (1973 oil shock, 1991 USSR collapse).
