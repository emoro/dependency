# Boston POI Dependency Network

Web visualization of a POI-to-POI dependency network for Boston using **React**, **deck.gl**, and **MapLibre GL**.

## Setup

1. **Preprocess network data** (R; run from project root):

   ```bash
   Rscript scripts/preprocess_network.R
   ```

   Requires R packages: `readr`, `jsonlite`.  
   Reads `data/boston_network_pruned.csv.gz` and writes `public/boston_network.json`.

2. **Preprocess simulation data** (optional, R; run from project root):

   - **Airports scenario**:

     ```bash
     Rscript scripts/preprocess_airports.R
     ```

     Reads `data/airports_POI.csv.gz` and `data/airports_impact.csv.gz`, writes:

     - `public/airports_poi.json`
     - `public/airports_impact.json`

   - **Colleges scenario**:

     ```bash
     Rscript scripts/preprocess_colleges.R
     ```

     Reads `data/colleges_POI.csv.gz` and `data/colleges_impact.csv.gz`, writes:

     - `public/colleges_poi.json`
     - `public/colleges_impact.json`

3. **Install and run the app**:

   ```bash
   npm install
   npm run dev
   ```

   Open the URL shown (e.g. http://localhost:5173).

## Stack

- **React** + **Vite** – UI and build
- **deck.gl** – ArcLayer for dependency links; MapboxOverlay for MapLibre
- **MapLibre GL** – base map (CARTO Positron)

## Scripts

- **`scripts/preprocess_network.R`** – Converts the gzipped CSV to JSON for the dependency network (optional sampling via `max_arcs`).
- **`scripts/preprocess_airports.R`** – Builds JSON inputs for the **airports** simulation.
- **`scripts/preprocess_colleges.R`** – Builds JSON inputs for the **colleges** simulation.

## Data

### Network

- **Source**: `data/boston_network_pruned.csv.gz`  
  Columns: `poi_a`, `poi_b`, `poilon_a`, `poilat_a`, `cat_a`, `poilon_b`, `poilat_b`, `cat_b`, `dep`, `q_dep`, `distance`.

- **Preprocessed**: `public/boston_network.json` – array of arcs with `sourcePosition`, `targetPosition`, `dep`, `cat_a`, `cat_b`, etc.

### Simulations

The **Simulations** tab exposes different disruption scenarios. Each scenario requires its own pair of JSON files in `public/`:

- **Airports**  
  - Closed POIs: `public/airports_poi.json`  
  - Impacted POIs: `public/airports_impact.json`

- **Colleges**  
  - Closed POIs: `public/colleges_poi.json`  
  - Impacted POIs: `public/colleges_impact.json`

If a simulation JSON is missing or outdated, the UI will show an error with the exact `Rscript` command to regenerate it (see the messages in the Simulations view).
