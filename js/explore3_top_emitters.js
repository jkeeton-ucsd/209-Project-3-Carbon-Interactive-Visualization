// Exploratory 3: top 15 emitters — per person vs. in total. Toggle buttons switch the measure.
// The two rankings barely overlap, which is the point.
import { LATEST_YEAR, frame, tooltip, fmt, countryTip } from "./common.js";
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const MEASURES = {
  co2_pc: { label: "CO₂ per capita (tonnes)", format: (v) => d3.format(",.1f")(v) },
  co2_kt: { label: "Total CO₂ (million tonnes)", format: (v) => d3.format(",.0f")(v / 1000), scale: 1 / 1000 },
};

export function draw(data) {
  const rows = data.filter((d) => d.year === LATEST_YEAR && d.co2_pc != null);
  let measure = "co2_pc";

  d3.selectAll("#ex3 [data-measure]").on("click", function () {
    measure = this.dataset.measure;
    d3.selectAll("#ex3 [data-measure]").classed("active", (_, i, n) => n[i].dataset.measure === measure);
    render();
  });

  function render() {
    const m = MEASURES[measure];
    const top = [...rows].sort((a, b) => b[measure] - a[measure]).slice(0, 15);
    const { g, width, height } = frame("#ex3 .chart", { height: 440, margin: { top: 8, right: 56, bottom: 40, left: 150 } });

    const y = d3.scaleBand().domain(top.map((d) => d.country)).range([0, height]).padding(0.25);
    const x = d3.scaleLinear().domain([0, d3.max(top, (d) => d[measure])]).nice().range([0, width]);

    g.append("g").attr("class", "grid").attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(5).tickSize(-height).tickFormat(""));
    g.append("g").attr("class", "axis x").attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat((v) => m.format(v)));
    g.append("g").attr("class", "axis y").call(d3.axisLeft(y).tickSize(0)).select(".domain").remove();
    g.append("text").attr("class", "axis-label").attr("x", width).attr("y", height + 34)
      .attr("text-anchor", "end").text(m.label);

    g.selectAll(".bar").data(top).join("rect")
      .attr("class", "bar")
      .attr("y", (d) => y(d.country))
      .attr("height", y.bandwidth())
      .attr("x", 0)
      .attr("rx", 3)
      .attr("width", (d) => x(d[measure]))
      .on("mouseenter", (e, d) => tooltip.show(e, countryTip(d, `<br>Total CO₂: ${fmt.num(d.co2_kt / 1000)} Mt`)))
      .on("mousemove", tooltip.move)
      .on("mouseleave", tooltip.hide);

    g.selectAll(".val").data(top).join("text")
      .attr("class", "direct-label")
      .attr("x", (d) => x(d[measure]) + 6)
      .attr("y", (d) => y(d.country) + y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .text((d) => m.format(d[measure]));
  }

  render();
}
