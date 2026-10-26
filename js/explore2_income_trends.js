// Exploratory 2: median CO2 per capita over time, by World Bank income group.
// Note: income group is the 2021 classification applied to all years.
import { INCOME_GROUPS, incomeColor, LATEST_YEAR, frame, drawAxes, legend, tooltip, fmt } from "./common.js";
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export function draw(data) {
  const rows = data.filter((d) => d.co2_pc != null && d.income && d.year <= LATEST_YEAR);
  const rolled = d3.rollups(rows, (v) => ({ median: d3.median(v, (d) => d.co2_pc), n: v.length }),
    (d) => d.income, (d) => d.year);
  const series = INCOME_GROUPS.map((g) => ({
    group: g,
    values: (rolled.find(([k]) => k === g)?.[1] ?? [])
      .map(([year, s]) => ({ year, ...s }))
      .sort((a, b) => a.year - b.year),
  }));

  const { g, width, height } = frame("#ex2 .chart", { margin: { top: 16, right: 150, bottom: 48, left: 56 } });
  const x = d3.scaleLinear().domain(d3.extent(rows, (d) => d.year)).range([0, width]);
  const y = d3.scaleLinear()
    .domain([0, d3.max(series, (s) => d3.max(s.values, (v) => v.median))]).nice()
    .range([height, 0]);

  drawAxes(g, x, y, width, height, { xLabel: "Year", yLabel: "Median CO₂ per capita (tonnes)", xFormat: "d" });

  const line = d3.line().x((d) => x(d.year)).y((d) => y(d.median));
  g.selectAll(".series").data(series).join("path")
    .attr("class", "line")
    .attr("stroke", (s) => incomeColor(s.group))
    .attr("d", (s) => line(s.values));

  // Direct labels at line ends.
  g.selectAll(".end-label").data(series).join("text")
    .attr("class", "direct-label")
    .attr("x", width + 8)
    .attr("y", (s) => y(s.values.at(-1).median))
    .attr("dy", "0.35em")
    .text((s) => s.group);

  // Crosshair + tooltip.
  const rule = g.append("line").attr("class", "crosshair").attr("y1", 0).attr("y2", height).style("opacity", 0);
  const dots = g.selectAll(".hover-dot").data(series).join("circle")
    .attr("class", "hover-dot").attr("r", 4).attr("fill", (s) => incomeColor(s.group)).style("opacity", 0);

  g.append("rect").attr("width", width).attr("height", height).attr("fill", "transparent")
    .on("mousemove", (e) => {
      const yr = Math.round(x.invert(d3.pointer(e)[0]));
      rule.attr("x1", x(yr)).attr("x2", x(yr)).style("opacity", 1);
      dots.each(function (s) {
        const v = s.values.find((p) => p.year === yr);
        d3.select(this).style("opacity", v ? 1 : 0).attr("cx", x(yr)).attr("cy", v ? y(v.median) : 0);
      });
      const lines = [...series].reverse().map((s) => {
        const v = s.values.find((p) => p.year === yr);
        return `<i class="swatch" style="background:${incomeColor(s.group)}"></i>${s.group}: <b>${v ? fmt.tons(v.median) : "n/a"}</b> <span class="muted">(n=${v?.n ?? 0})</span>`;
      });
      tooltip.show(e, `<strong>${yr}</strong><br>${lines.join("<br>")}`);
    })
    .on("mouseleave", () => { rule.style("opacity", 0); dots.style("opacity", 0); tooltip.hide(); });

  legend("#ex2 .legend", INCOME_GROUPS, incomeColor);
}
