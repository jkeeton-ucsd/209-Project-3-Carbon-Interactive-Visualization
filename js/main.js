// Entry point: load the data once, then hand it to each chart.
// To work on one chart in isolation, comment the others out here.
import { loadData } from "./common.js";
import * as ex1 from "./explore1_wealth_vs_co2.js";
import * as ex2 from "./explore2_income_trends.js";
import * as ex3 from "./explore3_top_emitters.js";
import * as ex4 from "./explore4_wealth_vs_life.js";
import * as ex5 from "./explore5_trajectories.js";
import * as proto from "./prototype.js";

loadData().then((data) => {
  for (const chart of [proto, ex1, ex2, ex3, ex4, ex5]) {
    try {
      chart.draw(data);
    } catch (err) {
      console.error(err); // one broken chart shouldn't take down the page
    }
  }
}).catch((err) => {
  document.querySelector("main").insertAdjacentHTML("afterbegin",
    `<p class="error">Couldn't load data/wb_clean.csv (${err.message}). If you opened index.html directly from disk, run a local server instead — see README.</p>`);
});
