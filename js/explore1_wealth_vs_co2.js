// Exploratory 1: GDP per capita vs CO2 per capita, one year (static snapshot).
// Log–log axes because both variables span ~3 orders of magnitude.
import { LATEST_YEAR, REGIONS, regionColor, frame, drawAxes, legend, tooltip, countryTip } from "./common.js";

export function draw(data) {
  const rows = data.filter((d) => d.year === LATEST_YEAR && d.gdp_pc > 0 && d.co2_pc > 0);
  const { g, width, height } = frame("#ex1 .chart");

  const x = d3.scaleLog().domain(d3.extent(rows, (d) => d.gdp_pc)).nice().range([0, width]);
  const y = d3.scaleLog().domain(d3.extent(rows, (d) => d.co2_pc)).nice().range([height, 0]);
  const r = d3.scaleSqrt().domain([0, d3.max(rows, (d) => d.pop)]).range([2, 28]);

  drawAxes(g, x, y, width, height, {
    xLabel: "GDP per capita (constant 2010 US$, log)",
    yLabel: "CO₂ per capita (tonnes, log)",
    xTicks: 5, yTicks: 5, xFormat: "$~s", yFormat: "~g",
  });

  g.append("g").selectAll("circle")
    .data(rows.sort((a, b) => b.pop - a.pop)) // big bubbles underneath
    .join("circle")
    .attr("class", "dot")
    .attr("cx", (d) => x(d.gdp_pc))
    .attr("cy", (d) => y(d.co2_pc))
    .attr("r", (d) => r(d.pop))
    .attr("fill", (d) => regionColor(d.region))
    .on("mouseenter", (e, d) => tooltip.show(e, countryTip(d)))
    .on("mousemove", tooltip.move)
    .on("mouseleave", tooltip.hide);

  // Correlation on the log scale — a number to quote in the video.
  const lx = rows.map((d) => Math.log10(d.gdp_pc)), ly = rows.map((d) => Math.log10(d.co2_pc));
  const mx = d3.mean(lx), my = d3.mean(ly);
  const cov = d3.sum(lx, (v, i) => (v - mx) * (ly[i] - my));
  const rr = cov / Math.sqrt(d3.sum(lx, (v) => (v - mx) ** 2) * d3.sum(ly, (v) => (v - my) ** 2));
  d3.select("#ex1 .stat").text(`${rows.length} countries · correlation of log values r = ${rr.toFixed(2)}`);

  legend("#ex1 .legend", REGIONS, regionColor);
}
