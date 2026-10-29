// Trails for the prototype: pin one or more countries to draw their path
// through the scatter from 1960 up to the year currently shown.
// prototype.js owns the state and scales; this module only draws.
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

// Rows for one country, in year order, up to `year`, with valid x and y values.
export function trailRows(data, code, year, metric, logY) {
  return data
    .filter((d) => d.code === code && d.year <= year && d.gdp_pc > 0
      && d[metric] != null && (!logY || d[metric] > 0))
    .sort((a, b) => a.year - b.year);
}

// Draw (or redraw) every pinned trail into `layer`.
//   series: [{ code, country, color, rows }]
//   x, y:   the current (possibly zoomed) scales
export function drawTrails(layer, series, x, y, metric, duration = 0) {
  const line = d3.line()
    .x((d) => x(d.gdp_pc))
    .y((d) => y(d[metric]));

  const groups = layer.selectAll("g.trail")
    .data(series.filter((s) => s.rows.length), (s) => s.code)
    .join((enter) => {
      const g = enter.append("g").attr("class", "trail");
      g.append("path").attr("class", "trail-line");
      g.append("text").attr("class", "trail-label").attr("dy", "-0.7em");
      return g;
    });

  groups.select(".trail-line")
    .attr("stroke", (s) => s.color)
    .transition().duration(duration).ease(d3.easeLinear)
    .attr("d", (s) => line(s.rows));

  groups.selectAll("circle.trail-dot")
    .data((s) => s.rows.map((r) => ({ ...r, color: s.color })), (d) => d.year)
    .join("circle")
    .attr("class", "trail-dot")
    .attr("r", (d) => (d.year % 10 === 0 ? 3 : 1.6))
    .attr("fill", (d) => d.color)
    .attr("cx", (d) => x(d.gdp_pc))
    .attr("cy", (d) => y(d[metric]));

  groups.select(".trail-label")
    .attr("fill", (s) => s.color)
    .attr("text-anchor", "middle")
    .text((s) => `${s.country} ${s.rows[0].year}–${s.rows.at(-1).year}`)
    .transition().duration(duration).ease(d3.easeLinear)
    .attr("x", (s) => x(s.rows.at(-1).gdp_pc))
    .attr("y", (s) => y(s.rows.at(-1)[metric]));
}
