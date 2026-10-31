// Trend line for the prototype: a LOESS smoother (locally weighted regression).
// LOESS fits a small weighted straight line around each point along the x axis,
// so the curve can be straight where the data are straight and bend where they bend.
// Robustness passes down-weight extreme outliers (e.g. Gulf states on CO₂).
//
// The fit runs in the same space the chart draws in: log10(x) always, and log10(y)
// when the y axis is log. Otherwise a straight line on screen would not be a
// straight fit.
// prototype.js owns the state and scales; this module only fits and draws.
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const tricube = (u) => (u >= 1 ? 0 : (1 - u ** 3) ** 3);
const bisquare = (u) => (u >= 1 ? 0 : (1 - u ** 2) ** 2);

// Local weighted linear fit at x0. xs must be sorted ascending.
function localFit(xs, ys, robust, x0, k) {
  const n = xs.length;
  // The k nearest neighbours of x0 set the window width.
  let lo = 0, hi = n - 1;
  while (hi - lo + 1 > k) {
    if (x0 - xs[lo] > xs[hi] - x0) lo++;
    else hi--;
  }
  const h = Math.max(x0 - xs[lo], xs[hi] - x0) * 1.0001 || 1e-9;

  let sw = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = lo; i <= hi; i++) {
    const w = tricube(Math.abs(xs[i] - x0) / h) * robust[i];
    sw += w; sx += w * xs[i]; sy += w * ys[i];
    sxx += w * xs[i] * xs[i]; sxy += w * xs[i] * ys[i];
  }
  if (sw === 0) return NaN;
  const mx = sx / sw, my = sy / sw;
  const vx = sxx / sw - mx * mx;
  const slope = vx > 1e-12 ? (sxy / sw - mx * my) / vx : 0;
  return my + slope * (x0 - mx);
}

// Fit LOESS and return { x, y } points in DATA units (not log), ready for the scales.
//   rows:   the countries shown this year
//   metric: the y column
//   logY:   whether the y axis is logarithmic
//   span:   fraction of countries in each local window (bigger = smoother)
export function loessCurve(rows, metric, logY, { span = 0.6, iterations = 2, samples = 60 } = {}) {
  const pts = rows
    .map((d) => [Math.log10(d.gdp_pc), logY ? Math.log10(d[metric]) : d[metric]])
    .sort((a, b) => a[0] - b[0]);
  const n = pts.length;
  if (n < 10) return []; // too few countries to say anything about the trend

  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const k = Math.max(3, Math.min(n, Math.round(span * n)));
  let robust = new Array(n).fill(1);

  // Robustness passes: fit, look at residuals, down-weight the big misses, refit.
  for (let it = 0; it < iterations; it++) {
    const resid = xs.map((x0, i) => Math.abs(ys[i] - localFit(xs, ys, robust, x0, k)));
    const s = 6 * d3.median(resid);
    if (!(s > 0)) break;
    robust = resid.map((r) => bisquare(r / s));
  }

  const [x0, x1] = [xs[0], xs[n - 1]];
  // Local lines can overshoot at the edges (e.g. above 100%); keep the curve
  // within the range the countries actually span.
  const [yMin, yMax] = d3.extent(ys);
  const out = [];
  for (let i = 0; i < samples; i++) {
    const lx = x0 + ((x1 - x0) * i) / (samples - 1);
    const ly = Math.min(yMax, Math.max(yMin, localFit(xs, ys, robust, lx, k)));
    if (!Number.isFinite(ly)) continue;
    out.push({ x: 10 ** lx, y: logY ? 10 ** ly : ly });
  }
  return out;
}

// Draw (or redraw) the trend line into `layer`.
//   curve: output of loessCurve (empty array or null hides the line)
//   x, y:  the current (possibly zoomed) scales
export function drawTrend(layer, curve, x, y, duration = 0) {
  const pts = curve ?? [];
  const line = d3.line()
    .defined((d) => Number.isFinite(y(d.y)))
    .x((d) => x(d.x))
    .y((d) => y(d.y))
    .curve(d3.curveBasis);

  // Styling lives here (not in style.css) so the module drops in on its own.
  // Thin, dashed, muted ink at partial opacity: present but quieter than the bubbles.
  const path = layer.selectAll("path.trend-line")
    .data(pts.length ? [pts] : [])
    .join(
      (enter) => enter.append("path").attr("class", "trend-line")
        .attr("fill", "none")
        .attr("stroke", "var(--text-secondary)")
        .attr("stroke-width", 1.75)
        .attr("stroke-dasharray", "6 4")
        .attr("stroke-linecap", "round")
        .attr("opacity", 0)
        .style("pointer-events", "none")
        .attr("d", line),
      (update) => update,
      (exit) => exit.transition().duration(200).attr("opacity", 0).remove(),
    );
  path.transition().duration(duration).ease(d3.easeLinear)
    .attr("opacity", 0.6)
    .attr("d", line);

  // Small label at the right end so the line is named, not just a mystery dash.
  const last = pts.at(-1);
  layer.selectAll("text.trend-label")
    .data(last ? [last] : [])
    .join(
      (enter) => enter.append("text").attr("class", "trend-label")
        .attr("text-anchor", "end").attr("dy", "-0.6em")
        .attr("fill", "var(--text-muted)")
        .attr("font-size", 11)
        .style("pointer-events", "none")
        .text("trend")
        .attr("x", (d) => x(d.x)).attr("y", (d) => y(d.y)),
      (update) => update,
      (exit) => exit.remove(),
    )
    .transition().duration(duration).ease(d3.easeLinear)
    .attr("x", (d) => x(d.x))
    .attr("y", (d) => y(d.y));
}
