// Prototype of the final graphic: animated bubble scatter.
//   x = GDP per capita (log), y = selectable metric, size = population, color = region
//   Interactions: year slider + play, y-metric dropdown, region highlight dropdown, tooltips.
// Axis domains are fixed across ALL years so motion over time is honest.
import { LATEST_YEAR, REGIONS, regionColor, frame, legend, tooltip, fmt } from "./common.js";

const METRICS = {
  co2_pc:    { label: "CO₂ per capita (tonnes)",                 log: true,  f: fmt.tons },
  life_exp:  { label: "Life expectancy at birth (years)",        log: false, f: (v) => `${fmt.num(v)} yrs` },
  energy_pc: { label: "Energy use per capita (kg oil eq.)",      log: true,  f: (v) => `${d3.format(",.0f")(v)} kg` },
  renew_pct: { label: "Renewable share of energy use (%)",       log: false, f: fmt.pct },
};

export function draw(data) {
  const state = { year: 2000, metric: "co2_pc", region: "all", timer: null };
  const years = [1960, LATEST_YEAR];

  // --- controls -------------------------------------------------------------
  const slider = d3.select("#year-slider").attr("min", years[0]).attr("max", years[1]).property("value", state.year);
  const yearOut = d3.select("#year-value");
  const playBtn = d3.select("#play-btn");

  d3.select("#metric-select").selectAll("option").data(Object.entries(METRICS)).join("option")
    .attr("value", ([k]) => k).text(([, m]) => m.label);
  d3.select("#region-select").selectAll("option").data(["all", ...REGIONS]).join("option")
    .attr("value", (d) => d).text((d) => (d === "all" ? "All regions" : d));

  slider.on("input", function () { stop(); state.year = +this.value; update(250); });
  d3.select("#metric-select").on("change", function () { state.metric = this.value; build(); });
  d3.select("#region-select").on("change", function () { state.region = this.value; highlight(); });
  playBtn.on("click", () => (state.timer ? stop() : play()));

  function play() {
    if (state.year >= years[1]) state.year = years[0];
    playBtn.text("Pause");
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
    playBtn.text("Play");
  }

  // --- chart ----------------------------------------------------------------
  let g, x, y, r, dotsLayer, yearLabel, width, height;

  function build() {
    const m = METRICS[state.metric];
    const valid = data.filter((d) => d.gdp_pc > 0 && d[state.metric] != null && (!m.log || d[state.metric] > 0)
      && d.year <= LATEST_YEAR);
    ({ g, width, height } = frame("#proto .chart", { height: 500 }));

    x = d3.scaleLog().domain(d3.extent(valid, (d) => d.gdp_pc)).nice().range([0, width]);
    y = (m.log ? d3.scaleLog() : d3.scaleLinear())
      .domain(d3.extent(valid, (d) => d[state.metric])).nice().range([height, 0]);
    r = d3.scaleSqrt().domain([0, d3.max(valid, (d) => d.pop)]).range([2, 34]);

    yearLabel = g.append("text").attr("class", "year-watermark")
      .attr("x", width - 8).attr("y", height - 12).attr("text-anchor", "end");

    g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(6, m.log ? "~g" : undefined).tickSize(-width).tickFormat(""));
    g.append("g").attr("class", "axis x").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).ticks(5, "$~s"));
    g.append("g").attr("class", "axis y").call(d3.axisLeft(y).ticks(6, m.log ? "~g" : undefined));
    g.append("text").attr("class", "axis-label").attr("x", width).attr("y", height + 40)
      .attr("text-anchor", "end").text("GDP per capita (constant 2010 US$, log)");
    g.append("text").attr("class", "axis-label").attr("y", -6).text(m.label + (m.log ? ", log" : ""));

    dotsLayer = g.append("g");
    update(0);
  }

  function update(duration) {
    const m = METRICS[state.metric];
    yearOut.text(state.year);
    yearLabel.text(state.year);

    const rows = data
      .filter((d) => d.year === state.year && d.gdp_pc > 0 && d[state.metric] != null && (!m.log || d[state.metric] > 0))
      .sort((a, b) => b.pop - a.pop);

    d3.select("#proto .stat").text(`${state.year}: ${rows.length} countries with data`);

    dotsLayer.selectAll("circle")
      .data(rows, (d) => d.code) // key by country so bubbles move instead of re-binding
      .join(
        (enter) => enter.append("circle").attr("class", "dot")
          .attr("cx", (d) => x(d.gdp_pc)).attr("cy", (d) => y(d[state.metric])).attr("r", 0),
        (update) => update,
        (exit) => exit.transition().duration(duration).attr("r", 0).remove(),
      )
      .attr("fill", (d) => regionColor(d.region))
      .on("mouseenter", (e, d) => tooltip.show(e, `<strong>${d.country}</strong> <span class="muted">${d.year}</span><br>
        <span class="muted">${d.region} · ${d.income || "n/a"}</span><br>
        GDP / person: ${fmt.usd(d.gdp_pc)}<br>${m.label}: <b>${m.f(d[state.metric])}</b><br>Population: ${fmt.pop(d.pop)}`))
      .on("mousemove", tooltip.move)
      .on("mouseleave", tooltip.hide)
      .transition().duration(duration).ease(d3.easeLinear)
      .attr("cx", (d) => x(d.gdp_pc))
      .attr("cy", (d) => y(d[state.metric]))
      .attr("r", (d) => r(d.pop ?? 0));

    dotsLayer.selectAll("circle").order();
    highlight();
  }

  function highlight() {
    dotsLayer.selectAll("circle")
      .classed("faded", (d) => state.region !== "all" && d.region !== state.region);
    legendItems.classed("faded", (d) => state.region !== "all" && d !== state.region);
  }

  // Clicking a legend entry is a shortcut for the region dropdown.
  const legendItems = legend("#proto .legend", REGIONS, regionColor)
    .style("cursor", "pointer")
    .on("click", (_, d) => {
      state.region = state.region === d ? "all" : d;
      d3.select("#region-select").property("value", state.region);
      highlight();
    });

  build();
  window.addEventListener("resize", debounce(build, 200));
}

function debounce(fn, ms) {
  let t;
  return () => { clearTimeout(t); t = setTimeout(fn, ms); };
}
