// Entry point: load the data once, then hand it to each chart.
// To work on one chart in isolation, comment the others out here.
import { loadData } from "./common.js";
import * as ex1 from "./explore1_wealth_vs_co2.js";
import * as ex2 from "./explore2_income_trends.js";
import * as ex3 from "./explore3_top_emitters.js";
import * as ex4 from "./explore4_wealth_vs_life.js";
import * as ex5 from "./explore5_trajectories.js";
import * as ex6 from "./explore6_us_china.js";
import * as proto from "./prototype.js";

function drawAll(charts, data) {
  for (const chart of charts) {
    try {
      chart.draw(data);
    } catch (err) {
      console.error(err); // one broken chart shouldn't take down the page
    }
  }
}

loadData().then((data) => {
  drawAll([proto], data);

  // Exploratory graphs live in a collapsed <details>. Charts size to their container,
  // so draw them the first time it's opened rather than while hidden.
  const explore = document.querySelector("#explore");
  let drawn = false;
  explore.addEventListener("toggle", () => {
    if (explore.open && !drawn) { drawn = true; drawAll([ex1, ex2, ex3, ex4, ex5, ex6], data); }
  });
  // Nav links into a collapsed section (or to the section itself) open it first.
  const openFor = (hash) => {
    const target = hash && document.querySelector(hash);
    const section = target && target.closest("details");
    if (section && !section.open) {
      section.open = true;
      target.scrollIntoView();
    }
  };
  window.addEventListener("hashchange", () => openFor(location.hash));
  openFor(location.hash);
}).catch((err) => {
  document.querySelector("main").insertAdjacentHTML("afterbegin",
    `<p class="error">Couldn't load data/wb_clean.csv (${err.message}). If you opened index.html directly from disk, run a local server instead — see README.</p>`);
});
