// Exploratory 5: connected-scatter trajectories, 1960 → latest year, for a few big economies.
// This is the chart that suggests animating the full scatter over time:
// rich countries rise then bend back (decoupling); developing ones are still climbing.
import { LATEST_YEAR, frame, drawAxes, tooltip, countryTip } from "./common.js";
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

// Edit this list freely — keep it short so lines stay readable.
const CODES = ["USA", "GBR", "DEU", "CHN", "IND", "BRA"];
const COLORS = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-5)", "var(--series-6)", "var(--series-7)"];

export function draw(data) {
  const byCode = d3.group(
    data.filter((d) => CODES.includes(d.code) && d.gdp_pc > 0 && d.co2_pc > 0 && d.year <= LATEST_YEAR),
    (d) => d.code);
  const series = CODES.filter((c) => byCode.has(c))
    .map((c, i) => ({ code: c, color: COLORS[i], values: byCode.get(c).sort((a, b) => a.year - b.year) }));
  const all = series.flatMap((s) => s.values);

  const { g, width, height } = frame("#ex5 .chart", { height: 460, margin: { top: 16, right: 100, bottom: 48, left: 64 } });
  const x = d3.scaleLog().domain(d3.extent(all, (d) => d.gdp_pc)).nice().range([0, width]);
  const y = d3.scaleLog().domain(d3.extent(all, (d) => d.co2_pc)).nice().range([height, 0]);

  drawAxes(g, x, y, width, height, {
    xLabel: "GDP per capita (constant 2010 US$, log)",
    yLabel: "CO₂ per capita (tonnes, log)",
    xTicks: 5, yTicks: 5, xFormat: "$~s", yFormat: "~g",
  });

  const line = d3.line().x((d) => x(d.gdp_pc)).y((d) => y(d.co2_pc)).curve(d3.curveCatmullRom);
  const groups = g.selectAll(".traj").data(series).join("g").attr("class", "traj");

  groups.append("path").attr("class", "line").attr("stroke", (s) => s.color).attr("d", (s) => line(s.values));
  groups.selectAll("circle").data((s) => s.values.map((v) => ({ ...v, color: s.color })))
    .join("circle")
    .attr("class", "dot small")
    .attr("cx", (d) => x(d.gdp_pc)).attr("cy", (d) => y(d.co2_pc))
    .attr("r", (d) => (d.year % 10 === 0 ? 4 : 2))
    .attr("fill", (d) => d.color)
    .on("mouseenter", (e, d) => tooltip.show(e, countryTip(d)))
    .on("mousemove", tooltip.move)
    .on("mouseleave", tooltip.hide);

  // Label each line at its last point (identity not by color alone).
  groups.append("text").attr("class", "direct-label")
    .attr("x", (s) => x(s.values.at(-1).gdp_pc) + 8)
    .attr("y", (s) => y(s.values.at(-1).co2_pc))
    .attr("dy", "0.35em")
    .text((s) => `${s.values[0].country} ${s.values.at(-1).year}`);

  // Hovering a line dims the others.
  groups.on("mouseenter", function () { groups.classed("dim", (_, i, n) => n[i] !== this); })
    .on("mouseleave", () => groups.classed("dim", false));
}
