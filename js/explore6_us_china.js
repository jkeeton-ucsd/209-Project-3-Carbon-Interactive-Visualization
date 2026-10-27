// Exploratory 6: United States vs China, CO₂ per person vs total, 1960 → latest year.
// Two small multiples with a shared x axis: China passes the U.S. in total emissions
// while the average American still emits about twice as much as the average Chinese resident.
import { LATEST_YEAR, frame, drawAxes, tooltip, fmt } from "./common.js";
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const COUNTRIES = [
  { code: "USA", label: "United States", color: "var(--series-1)" },
  { code: "CHN", label: "China", color: "var(--series-8)" },
];

const PANELS = [
  { key: "co2_pc", title: "Per person (tonnes)", value: (d) => d.co2_pc, f: fmt.tons },
  { key: "co2_gt", title: "Total (billion tonnes)", value: (d) => d.co2_kt / 1e6, f: (v) => `${d3.format(",.2f")(v)} Gt` },
];

export function draw(data) {
  const rows = data.filter((d) => COUNTRIES.some((c) => c.code === d.code)
    && d.year <= LATEST_YEAR && d.co2_pc != null && d.co2_kt != null);
  const byCode = d3.group(rows, (d) => d.code);
  const series = COUNTRIES.map((c) => ({ ...c, values: (byCode.get(c.code) ?? []).sort((a, b) => a.year - b.year) }));

  // Year China's total first exceeds the U.S. total (computed, not hard-coded).
  const usTotal = new Map(series[0].values.map((d) => [d.year, d.co2_kt]));
  const crossover = series[1].values.find((d) => usTotal.has(d.year) && d.co2_kt > usTotal.get(d.year))?.year;

  // Create both panel containers first so each is measured at its final grid width.
  const container = d3.select("#ex6 .chart").html("");
  for (const panel of PANELS) {
    const div = container.append("div").attr("class", "small-multiple").attr("id", `ex6-${panel.key}`);
    div.append("h4").text(panel.title);
    div.append("div").attr("class", "panel-chart");
  }
  for (const panel of PANELS) drawPanel(`#ex6-${panel.key}`, panel, series, crossover);

  d3.select("#ex6 .stat").text(crossover
    ? `China's total CO₂ first exceeded the U.S. total in ${crossover}.`
    : "");
}

function drawPanel(selector, panel, series, crossover) {
  const all = series.flatMap((s) => s.values);
  const { g, width, height } = frame(`${selector} .panel-chart`, { height: 300, margin: { top: 16, right: 96, bottom: 40, left: 52 } });

  const x = d3.scaleLinear().domain(d3.extent(all, (d) => d.year)).range([0, width]);
  const y = d3.scaleLinear().domain([0, d3.max(all, panel.value)]).nice().range([height, 0]);

  drawAxes(g, x, y, width, height, { xTicks: 6, yTicks: 5, xFormat: "d" });

  if (crossover && panel.key === "co2_gt") {
    g.append("line").attr("class", "crosshair")
      .attr("x1", x(crossover)).attr("x2", x(crossover)).attr("y1", 0).attr("y2", height);
    g.append("text").attr("class", "direct-label")
      .attr("x", x(crossover) - 6).attr("y", 12).attr("text-anchor", "end")
      .text(`China passes U.S. (${crossover})`);
  }

  const line = d3.line().x((d) => x(d.year)).y((d) => y(panel.value(d)));
  g.selectAll(".line").data(series).join("path")
    .attr("class", "line").attr("stroke", (s) => s.color).attr("d", (s) => line(s.values));

  g.selectAll(".end-label").data(series).join("text")
    .attr("class", "direct-label end-label")
    .attr("x", (s) => x(s.values.at(-1).year) + 6)
    .attr("y", (s) => y(panel.value(s.values.at(-1))))
    .attr("dy", "0.35em")
    .text((s) => s.label);

  // Hover: vertical guide + values for both countries in that year.
  const guide = g.append("line").attr("class", "crosshair").attr("y1", 0).attr("y2", height).style("opacity", 0);
  const dots = g.selectAll(".hover-dot").data(series).join("circle")
    .attr("class", "hover-dot").attr("r", 4).attr("fill", (s) => s.color).style("opacity", 0);

  g.append("rect").attr("width", width).attr("height", height).attr("fill", "transparent")
    .on("mousemove", (e) => {
      const year = Math.round(x.invert(d3.pointer(e)[0]));
      const points = series.map((s) => s.values.find((d) => d.year === year));
      if (points.some((p) => !p)) return;
      guide.attr("x1", x(year)).attr("x2", x(year)).style("opacity", 1);
      dots.attr("cx", x(year)).attr("cy", (_, i) => y(panel.value(points[i]))).style("opacity", 1);
      tooltip.show(e, `<strong>${year}</strong><br>` + series.map((s, i) =>
        `<span style="color:${s.color}">●</span> ${s.label}: <b>${panel.f(panel.value(points[i]))}</b>`).join("<br>"));
    })
    .on("mouseleave", () => { guide.style("opacity", 0); dots.style("opacity", 0); tooltip.hide(); });
}
