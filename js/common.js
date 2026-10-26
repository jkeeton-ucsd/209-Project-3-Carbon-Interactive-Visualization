// Shared helpers: data loading, color scales, formatters, tooltip.
// Every chart module imports from here so colors and formats stay consistent.
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export const LATEST_YEAR = 2018; // last year with CO2 data in this dataset

// Fixed region order -> fixed color slot. Never re-order (color follows entity).
export const REGIONS = [
  "East Asia & Pacific",
  "Europe & Central Asia",
  "Latin America & Caribbean",
  "Middle East & North Africa",
  "North America",
  "South Asia",
  "Sub-Saharan Africa",
];

// Colors are CSS custom properties (see css/style.css) so dark mode works.
export const regionColor = (region) => {
  const i = REGIONS.indexOf(region);
  return i >= 0 ? `var(--series-${i + 1})` : "var(--text-muted)";
};

// Income groups are ordered, so they get an ordinal (light -> dark) ramp.
export const INCOME_GROUPS = [
  "Low income",
  "Lower middle income",
  "Upper middle income",
  "High income",
];
export const incomeColor = (g) => {
  const i = INCOME_GROUPS.indexOf(g);
  return i >= 0 ? `var(--ord-${i + 1})` : "var(--text-muted)";
};

const NUMERIC = [
  "year", "gdp_pc", "co2_pc", "co2_kt", "pop", "life_exp",
  "renew_pct", "fossil_pct", "energy_pc", "urban_pct",
];

let _cache;
export function loadData() {
  if (!_cache) {
    _cache = d3.csv("data/wb_clean.csv", (row) => {
      for (const k of NUMERIC) row[k] = row[k] === "" ? null : +row[k];
      return row;
    });
  }
  return _cache;
}

export const fmt = {
  usd: (v) => (v == null ? "n/a" : d3.format("$,.0f")(v)),
  usdShort: (v) => d3.format("$~s")(v).replace("G", "B"),
  tons: (v) => (v == null ? "n/a" : `${d3.format(",.2f")(v)} t`),
  num: (v) => (v == null ? "n/a" : d3.format(",.1f")(v)),
  pop: (v) => (v == null ? "n/a" : d3.format(".3~s")(v).replace("G", "B")),
  pct: (v) => (v == null ? "n/a" : `${d3.format(".1f")(v)}%`),
};

// One tooltip div shared by every chart.
const tip = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);

export const tooltip = {
  show(event, html) {
    tip.html(html).style("opacity", 1);
    tooltip.move(event);
  },
  move(event) {
    const pad = 14;
    const node = tip.node();
    const w = node.offsetWidth, h = node.offsetHeight;
    let x = event.clientX + pad, y = event.clientY + pad;
    if (x + w > window.innerWidth - 8) x = event.clientX - w - pad;
    if (y + h > window.innerHeight - 8) y = event.clientY - h - pad;
    tip.style("left", `${x}px`).style("top", `${y}px`);
  },
  hide() {
    tip.style("opacity", 0);
  },
};

// Standard SVG frame: returns { svg, g, width, height } sized to the container.
export function frame(selector, { height = 420, margin = { top: 16, right: 24, bottom: 48, left: 64 } } = {}) {
  const container = d3.select(selector);
  container.selectAll("*").remove();
  const outerW = Math.max(320, container.node().clientWidth);
  const width = outerW - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${outerW} ${height}`)
    .attr("width", "100%");
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  return { svg, g, width, height: innerH, margin };
}

// Axis helpers with recessive gridlines.
export function drawAxes(g, x, y, width, height, { xLabel, yLabel, xTicks, yTicks, xFormat, yFormat } = {}) {
  g.append("g").attr("class", "grid")
    .call(d3.axisLeft(y).ticks(yTicks ?? 6, yFormat).tickSize(-width).tickFormat(""));
  g.append("g").attr("class", "axis x").attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(xTicks ?? 6, xFormat));
  g.append("g").attr("class", "axis y")
    .call(d3.axisLeft(y).ticks(yTicks ?? 6, yFormat));
  if (xLabel) g.append("text").attr("class", "axis-label")
    .attr("x", width).attr("y", height + 40).attr("text-anchor", "end").text(xLabel);
  if (yLabel) g.append("text").attr("class", "axis-label")
    .attr("x", 0).attr("y", -6).attr("text-anchor", "start").text(yLabel);
}

// HTML legend (keeps text in ink colors; a swatch carries identity).
export function legend(selector, items, colorFn) {
  const el = d3.select(selector).html("");
  const item = el.selectAll("span").data(items).join("span").attr("class", "legend-item");
  item.append("i").attr("class", "swatch").style("background", (d) => colorFn(d));
  item.append("span").text((d) => d);
  return item;
}

export function countryTip(d, extra = "") {
  return `<strong>${d.country}</strong> <span class="muted">${d.year}</span><br>
    <span class="muted">${d.region}</span><br>
    GDP / person: ${fmt.usd(d.gdp_pc)}<br>
    CO₂ / person: ${fmt.tons(d.co2_pc)}<br>
    Population: ${fmt.pop(d.pop)}${extra}`;
}
