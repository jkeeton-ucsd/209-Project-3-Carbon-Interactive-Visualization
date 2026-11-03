// Prototype of the final graphic: animated bubble scatter.
//   x = GDP per capita (log), y = CO₂ per capita (log), size = population, color = region
//   Interactions: year slider + play, region highlight dropdown, tooltips,
//   color by region or income group, and pinned country trails (click a bubble or pick a country).
// Axis domains are fixed across ALL years so motion over time is honest.
import { LATEST_YEAR, REGIONS, regionColor, INCOME_GROUPS, incomeColor, frame, legend, tooltip, fmt } from "./common.js";
import { trailRows, drawTrails } from "./trails.js";
import { loessCurve, drawTrend } from "./trend.js"; 
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const METRICS = {
  co2_pc:    { label: "CO₂ per capita (tonnes)",                 log: true,  f: fmt.tons },
};

export function draw(data) {
  // state.region is the highlight filter: a region, or an income group when coloring by income.
  const state = { year: 1960, metric: "co2_pc", region: "all", country: "", colorBy: "region", pinned: ["USA", "CHN", "FRA"], trend: false, timer: null };
  const groupsFor = () => (state.colorBy === "income" ? INCOME_GROUPS : REGIONS);
  const groupOf = (d) => (state.colorBy === "income" ? d.income : d.region);
  const colorOf = (d) => (state.colorBy === "income" ? incomeColor(d.income) : regionColor(d.region));
  const years = [1960, LATEST_YEAR];

  // --- controls -------------------------------------------------------------
  const slider = d3.select("#year-slider").attr("min", years[0]).attr("max", years[1]).property("value", state.year);
  const yearOut = d3.select("#year-value");
  const playBtn = d3.select("#play-btn");

  function fillHighlightOptions() {
    d3.select("#region-select").selectAll("option").data(["all", ...groupsFor()]).join("option")
      .attr("value", (d) => d)
      .text((d) => (d === "all" ? (state.colorBy === "income" ? "All income groups" : "All regions") : d));
    d3.select("#region-select").property("value", state.region);
  }
  fillHighlightOptions();

  // Country names for the search box's autocomplete list.
  const countryByName = new Map(data.map((d) => [d.country.toLowerCase(), d]));
  d3.select("#country-list").selectAll("option")
    .data([...new Set(data.map((d) => d.country))].sort()).join("option").attr("value", (d) => d);

  slider.on("input", function () { stop(); state.year = +this.value; update(250); });
  d3.select("#region-select").on("change", function () { state.region = this.value; highlight(); });
  d3.select("#country-search").on("input", function () { state.country = this.value.trim().toLowerCase(); highlight(); });
  // Picking an exact country name (Enter or the autocomplete list) pins its trail.
  d3.select("#country-search").on("change", function () {
    const match = countryByName.get(this.value.trim().toLowerCase());
    if (!match) return;
    if (!state.pinned.includes(match.code)) togglePin(match.code);
    this.value = "";
    state.country = "";
    highlight();
  });
  d3.select("#color-select").on("change", function () {
    state.colorBy = this.value;
    state.region = "all";
    fillHighlightOptions();
    buildLegend();
    update(0);
  });
  d3.select("#clear-trails-btn").on("click", () => { state.pinned = []; renderTrails(0); highlight(); });
  d3.select("#trend-toggle").property("checked", state.trend).on("change", function () {
    state.trend = this.checked;
    renderTrend(250);
  });
  playBtn.on("click", () => (state.timer ? stop() : play()));   // existing line
  playBtn.on("click", () => (state.timer ? stop() : play()));
  // Reset zoom sits over the chart and only shows while zoomed in.
  const resetBtn = d3.select("#reset-zoom-btn").on("click", () =>
    svg.transition().duration(400).call(zoom.transform, d3.zoomIdentity));

  function play() {
    if (state.year >= years[1]) state.year = years[0];
    playBtn.text("Pause").classed("playing", true);
    state.timer = d3.interval(() => {
      if (state.year >= years[1]) return stop();
      state.year += 1;
      slider.property("value", state.year);
      update(280);
    }, 300);
  }
  function stop() {
    state.timer?.stop();
    state.timer = null;
    playBtn.text("Play").classed("playing", false);
  }

  // --- chart ----------------------------------------------------------------
  let svg, g, x, y, zx, zy, zoom, r, dotsLayer, trendLayer, trailsLayer, yearLabel, width, height;
  let trendCurve = []; // last LOESS fit, reused when zooming so we don't refit
  let gridSel, xAxisSel, yAxisSel;

  function build() {
    const m = METRICS[state.metric];
    const valid = data.filter((d) => d.gdp_pc > 0 && d[state.metric] != null && (!m.log || d[state.metric] > 0)
      && d.year <= LATEST_YEAR);
    ({ svg, g, width, height } = frame("#proto .chart", { height: 500 }));

    x = d3.scaleLog().domain(d3.extent(valid, (d) => d.gdp_pc)).nice().range([0, width]);
    y = (m.log ? d3.scaleLog() : d3.scaleLinear())
      .domain(d3.extent(valid, (d) => d[state.metric])).nice().range([height, 0]);
    r = d3.scaleSqrt().domain([0, d3.max(valid, (d) => d.pop)]).range([2, 34]);
    zx = x.copy();
    zy = y.copy();

    g.append("clipPath").attr("id", "proto-clip").append("rect").attr("width", width).attr("height", height);

    yearLabel = g.append("text").attr("class", "year-watermark")
      .attr("x", width - 8).attr("y", height - 12).attr("text-anchor", "end");
    
    gridSel = g.append("g").attr("class", "grid").call(d3.axisLeft(zy).ticks(6, m.log ? "~g" : undefined).tickSize(-width).tickFormat(""));
    xAxisSel = g.append("g").attr("class", "axis x").attr("transform", `translate(0,${height})`).call(d3.axisBottom(zx).ticks(5, "$~s"));
    yAxisSel = g.append("g").attr("class", "axis y").call(d3.axisLeft(zy).ticks(6, m.log ? "~g" : undefined));
    g.append("text").attr("class", "axis-label").attr("x", width).attr("y", height + 40)
      .attr("text-anchor", "end").text("GDP per capita (constant 2010 US$, log)");
    g.append("text").attr("class", "axis-label").attr("y", -6).text(m.label + (m.log ? ", log" : ""));

    dotsLayer = g.append("g").attr("clip-path", "url(#proto-clip)");
    trendLayer = g.append("g").attr("class", "trend").attr("clip-path", "url(#proto-clip)");
    trailsLayer = g.append("g").attr("class", "trails").attr("clip-path", "url(#proto-clip)");

    zoom = d3.zoom()
      .scaleExtent([1, 12])
      .extent([[0, 0], [width, height]])
      .translateExtent([[0, 0], [width, height]])
      .on("zoom", ({ transform }) => {
        resetBtn.classed("visible", transform.k !== 1);
        zx = transform.rescaleX(x);
        zy = transform.rescaleY(y);
        gridSel.call(d3.axisLeft(zy).ticks(6, m.log ? "~g" : undefined).tickSize(-width).tickFormat(""));
        xAxisSel.call(d3.axisBottom(zx).ticks(5, "$~s"));
        yAxisSel.call(d3.axisLeft(zy).ticks(6, m.log ? "~g" : undefined));
        dotsLayer.selectAll("circle")
          .attr("cx", (d) => zx(d.gdp_pc))
          .attr("cy", (d) => zy(d[state.metric]));
        renderTrails(0);
        drawTrend(trendLayer, trendCurve, zx, zy, 0);
      });
    svg.call(zoom);
    resetBtn.classed("visible", false);

    buildSizeLegend();
    update(0);
  }

  // Nested reference circles for the population size scale.
  function buildSizeLegend() {
    const sizes = [[1e9, "1B"], [1e8, "100M"], [1e7, "10M"]];
    const R = r(sizes[0][0]);
    const base = 2 * R + 8; // circles sit on this baseline; the padding above keeps the top label unclipped
    const top = (d) => base - 2 * r(d[0]);
    const el = d3.select("#proto .size-legend").html("");
    el.append("span").attr("class", "size-legend-title").text("Population");
    const s = el.append("svg").attr("width", 2 * R + 48).attr("height", base + 2);
    const item = s.selectAll("g").data(sizes).join("g");
    item.append("circle")
      .attr("cx", R + 1).attr("cy", (d) => base - r(d[0])).attr("r", (d) => r(d[0]));
    item.append("line")
      .attr("x1", R + 1).attr("x2", 2 * R + 8).attr("y1", top).attr("y2", top);
    item.append("text")
      .attr("x", 2 * R + 11).attr("y", top).attr("dy", "0.35em").text((d) => d[1]);
  }

  function update(duration) {
    const m = METRICS[state.metric];
    yearOut.text(state.year);
    yearLabel.text(state.year);

    const rows = data
      .filter((d) => d.year === state.year && d.gdp_pc > 0 && d[state.metric] != null && (!m.log || d[state.metric] > 0))
      .sort((a, b) => b.pop - a.pop);

    dotsLayer.selectAll("circle")
      .data(rows, (d) => d.code) // key by country so bubbles move instead of re-binding
      .join(
        (enter) => enter.append("circle").attr("class", "dot")
          .attr("cx", (d) => zx(d.gdp_pc)).attr("cy", (d) => zy(d[state.metric])).attr("r", 0),
        (update) => update,
        (exit) => exit.transition().duration(duration).attr("r", 0).remove(),
      )
      .attr("fill", (d) => colorOf(d))
      .on("mouseenter", (e, d) => tooltip.show(e, `<strong>${d.country}</strong> <span class="muted">${d.year}</span><br>
        <span class="muted">${d.region} · ${d.income || "n/a"}</span><br>
        GDP / person: ${fmt.usd(d.gdp_pc)}<br>${m.label}: <b>${m.f(d[state.metric])}</b><br>Population: ${fmt.pop(d.pop)}`))
      .on("mousemove", tooltip.move)
      .on("mouseleave", tooltip.hide)
      .on("click", (e, d) => togglePin(d.code))
      .transition().duration(duration).ease(d3.easeLinear)
      .attr("cx", (d) => zx(d.gdp_pc))
      .attr("cy", (d) => zy(d[state.metric]))
      .attr("r", (d) => r(d.pop ?? 0));

    dotsLayer.selectAll("circle").order();
    renderTrend(duration, rows);
    renderTrails(duration);
    highlight();
  }

  // --- trend line -----------------------------------------------------------
  // Fitted to every country shown this year (each country counts once, regardless
  // of population). Highlighting a region doesn't change the fit.
  function renderTrend(duration, rows) {
    if (!trendLayer) return;
    const m = METRICS[state.metric];
    if (state.trend) {
      rows ??= data.filter((d) => d.year === state.year && d.gdp_pc > 0
        && d[state.metric] != null && (!m.log || d[state.metric] > 0));
      trendCurve = loessCurve(rows, state.metric, m.log);
    } else {
      trendCurve = [];
    }
    drawTrend(trendLayer, trendCurve, zx, zy, duration);
  }

  // --- trails ---------------------------------------------------------------
  function togglePin(code) {
    state.pinned = state.pinned.includes(code)
      ? state.pinned.filter((c) => c !== code)
      : [...state.pinned, code];
    renderTrails(0);
    highlight();
  }

  function renderTrails(duration) {
    if (!trailsLayer) return;
    const m = METRICS[state.metric];
    const series = state.pinned.map((code) => {
      const rows = trailRows(data, code, state.year, state.metric, m.log);
      const any = rows.at(-1) ?? data.find((d) => d.code === code);
      return { code, country: any.country, color: colorOf(any), rows };
    });
    drawTrails(trailsLayer, series, zx, zy, state.metric, duration);
    d3.select("#proto .trail-note").text(state.pinned.length
      ? `Trails: ${series.map((s) => s.country).join(", ")}. Click a bubble again to remove it.`
      : "Tip: click a bubble, or pick a country in Find, to draw its path over time.");
  }

  function highlight() {
    dotsLayer.selectAll("circle")
      .classed("faded", (d) =>
        (state.region !== "all" && groupOf(d) !== state.region) ||
        (state.country && !d.country.toLowerCase().includes(state.country))
      )
      .classed("pinned", (d) => state.pinned.includes(d.code));
    legendItems.classed("faded", (d) => state.region !== "all" && d !== state.region);
  }

  // Clicking a legend entry is a shortcut for the highlight dropdown.
  let legendItems;
  function buildLegend() {
    const colorFn = state.colorBy === "income" ? incomeColor : regionColor;
    legendItems = legend("#proto .legend", groupsFor(), colorFn)
      .style("cursor", "pointer")
      .on("click", (_, d) => {
        state.region = state.region === d ? "all" : d;
        d3.select("#region-select").property("value", state.region);
        highlight();
      });
  }
  buildLegend();

  build();
  window.addEventListener("resize", debounce(build, 200));
}

function debounce(fn, ms) {
  let t;
  return () => { clearTimeout(t); t = setTimeout(fn, ms); };
}
