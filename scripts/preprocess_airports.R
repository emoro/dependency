#!/usr/bin/env Rscript
# Preprocess airport closure simulation data for the web app.
# Outputs: public/airports_poi.json (closed POIs), public/airports_impact.json (POIs with impact)

library(readr)
library(jsonlite)

# Paths (run from project root)
poi_path   <- "data/airports_POI.csv.gz"
impact_path <- "data/airports_impact.csv.gz"
out_poi    <- "public/airports_poi.json"
out_impact <- "public/airports_impact.json"

message("Reading ", poi_path, " ...")
d_poi <- read_csv(poi_path, show_col_types = FALSE)

message("Reading ", impact_path, " ...")
d_impact <- read_csv(impact_path, show_col_types = FALSE)

# Closed POIs: id, position, category, taxonomy
closed <- lapply(seq_len(nrow(d_poi)), function(i) {
  list(
    id = d_poi$id[i],
    position = c(as.numeric(d_poi$poilon[i]), as.numeric(d_poi$poilat[i])),
    category = d_poi$cat[i],
    taxonomy = if ("Taxonomy" %in% names(d_poi)) d_poi$Taxonomy[i] else NA_character_
  )
})

# Impact POIs: id, position, category, taxonomy, impact (numeric)
impact_list <- lapply(seq_len(nrow(d_impact)), function(i) {
  list(
    id = d_impact$id[i],
    position = c(as.numeric(d_impact$poilon[i]), as.numeric(d_impact$poilat[i])),
    category = d_impact$cat[i],
    taxonomy = if ("Taxonomy" %in% names(d_impact)) d_impact$Taxonomy[i] else NA_character_,
    impact = as.numeric(d_impact$impact[i])
  )
})

message("Writing ", length(closed), " closed POIs to ", out_poi, " ...")
write_json(closed, out_poi, auto_unbox = TRUE, digits = 8)

message("Writing ", length(impact_list), " impact POIs to ", out_impact, " ...")
write_json(impact_list, out_impact, auto_unbox = TRUE, digits = 8)

message("Done.")
