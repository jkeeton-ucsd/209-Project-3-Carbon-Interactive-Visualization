"""
Build data/wb_clean.csv from the light-and-salt/World-Bank-Data-by-Indicators repo.

Usage:
    git clone --depth 1 https://github.com/light-and-salt/World-Bank-Data-by-Indicators.git wb-raw
    python scripts/prepare_data.py wb-raw

Transformations (also described on the web page):
  * Keep only real countries (rows whose code has a Region in the World Bank
    country metadata) -- drops aggregates like "World", "High income", "EU".
  * Join indicators from several topic files on (Country Code, Year).
  * Life expectancy = mean of the female and male life expectancy at birth
    (the repo does not ship the "total" series).
  * Drop country-years where both GDP per capita and CO2 per capita are missing.
"""
import sys, os, glob
import pandas as pd

root = sys.argv[1] if len(sys.argv) > 1 else "wb-raw"
P = "average_value_"

SOURCES = {
    "economy-and-growth/economy-and-growth.csv": {
        "GDP per capita (constant 2010 US$)": "gdp_pc",
    },
    "climate-change/climate-change.csv": {
        "CO2 emissions (metric tons per capita)": "co2_pc",
        "CO2 emissions (kt)": "co2_kt",
        "Population, total": "pop",
    },
    "social-development/social-development.csv": {
        "Life expectancy at birth, female (years)": "life_f",
        "Life expectancy at birth, male (years)": "life_m",
    },
    "engergy-and-mining/energy-and-mining.csv": {
        "Renewable energy consumption (% of total final energy consumption)": "renew_pct",
        "Fossil fuel energy consumption (% of total)": "fossil_pct",
        "Energy use (kg of oil equivalent per capita)": "energy_pc",
    },
    "urban-development/urban-development.csv": {
        "Urban population (% of total population)": "urban_pct",
    },
}

merged = None
for rel, cols in SOURCES.items():
    usecols = ["Country Name", "Country Code", "Year"] + [P + c for c in cols]
    df = pd.read_csv(os.path.join(root, rel), usecols=usecols)
    df = df.rename(columns={P + k: v for k, v in cols.items()})
    if merged is None:
        merged = df
    else:
        merged = merged.merge(df.drop(columns=["Country Name"]),
                              on=["Country Code", "Year"], how="outer")

meta_path = glob.glob(os.path.join(root, "climate-change", "Metadata_Country_*.csv"))[0]
meta = pd.read_csv(meta_path, encoding="utf-8-sig")[["Country Code", "Region", "IncomeGroup", "TableName"]]
meta = meta[meta["Region"].notna()]          # real countries only

df = merged.merge(meta, on="Country Code", how="inner")
df["Country Name"] = df["Country Name"].fillna(df["TableName"])
df["life_exp"] = df[["life_f", "life_m"]].mean(axis=1, skipna=False)
df = df[df["gdp_pc"].notna() | df["co2_pc"].notna()]

out = df.rename(columns={"Country Name": "country", "Country Code": "code",
                         "Year": "year", "Region": "region", "IncomeGroup": "income"})
out = out[["country", "code", "region", "income", "year", "gdp_pc", "co2_pc",
           "co2_kt", "pop", "life_exp", "renew_pct", "fossil_pct",
           "energy_pc", "urban_pct"]].sort_values(["code", "year"])

for c in ["gdp_pc", "energy_pc"]:
    out[c] = out[c].round(1)
for c in ["co2_pc", "life_exp", "renew_pct", "fossil_pct", "urban_pct"]:
    out[c] = out[c].round(3)
out["co2_kt"] = out["co2_kt"].round(0)
out["pop"] = out["pop"].round(0).astype("Int64")

dest = os.path.join(os.path.dirname(__file__), "..", "data", "wb_clean.csv")
out.to_csv(dest, index=False)
print(f"wrote {len(out):,} rows, {out['code'].nunique()} countries, "
      f"years {out['year'].min()}-{out['year'].max()} -> {os.path.abspath(dest)}")
print(out.notna().groupby(out["year"]).sum()[["gdp_pc", "co2_pc", "life_exp"]].iloc[::5])
