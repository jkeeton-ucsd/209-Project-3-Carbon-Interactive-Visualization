// Exploratory 4: GDP per capita vs life expectancy (the "Preston curve").
// Shows the alternative y-metric we might offer in the final dropdown.
import { LATEST_YEAR, REGIONS, regionColor, frame, drawAxes, legend, tooltip, countryTip, fmt } from "./common.js";

export function draw(data) {
  const rows = data.filter((d) => d.year === LATEST_YEAR && d.gdp_pc > 0 && d.life_exp != null);
  const { g, width, height } = frame("#ex4 .chart");

  const x = d3.scaleLog().domain(d3.extent(rows, (d) => d.gdp_pc)).nice().range([0, width]);
  const y = d3.scaleLinear().domain(d3.extent(rows, (d) => d.life_exp)).nice().range([height, 0]);

  drawAxes(g, x, y, width, height, {
    xLabel: "GDP per capita (constant 2010 US$, log)",
    yLabel: "Life expectancy at birth (years)",
    xTicks: 5, xFormat: "$~s",
  });

  g.append("g").selectAll("circle").data(rows).join("circle")
    .attr("class", "dot")
    .attr("cx", (d) => x(d.gdp_pc))
    .attr("cy", (d) => y(d.life_exp))
    .attr("r", 5)
    .attr("fill", (d) => regionColor(d.region))
    .on("mouseenter", (e, d) => tooltip.show(e, countryTip(d, `<br>Life expectancy: ${fmt.num(d.life_exp)} yrs`)))
    .on("mousemove", tooltip.move)
    .on("mouseleave", tooltip.hide);

  legend("#ex4 .legend", REGIONS, regionColor);
}
