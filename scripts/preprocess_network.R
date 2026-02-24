#!/usr/bin/env Rscript
# Preprocess Boston POI dependency network for the web app.
# Outputs:
# - public/boston_network.json (array of arcs for full deck.gl views)
# - public/boston_network_landing.json (short-distance arcs for landing view)

library(tidyverse)
library(jsonlite)

# Paths (run from project root)
data_path        <- "data/boston_network_pruned.csv.gz"
out_path_full    <- "public/boston_network.json"
out_path_landing <- "public/boston_network_landing.json"

# Optional: cap number of arcs for faster load (set to Inf to use all)
max_arcs <- 100000L

message("Reading ", data_path, " ...")
d <- read_csv(data_path, show_col_types = FALSE)

if (nrow(d) > max_arcs) {
  set.seed(42)
  d <- d[sample(nrow(d), max_arcs), ]
  message("Sampled ", max_arcs, " arcs.")
}

# Build arc records for deck.gl: [lon, lat] for source/target, plus metadata
build_arc_records <- function(df) {
  lapply(seq_len(nrow(df)), function(i) {
    list(
      sourcePosition = c(df$poilon_a[i], df$poilat_a[i]),
      targetPosition = c(df$poilon_b[i], df$poilat_b[i]),
      dep = as.numeric(df$dep[i]),
      q_dep = as.integer(df$q_dep[i]),
      distance = as.numeric(df$distance[i]),
      cat_a = df$cat_a[i],
      cat_b = df$cat_b[i],
      taxonomy_a = if ("Taxonomy_a" %in% names(df)) df$Taxonomy_a[i] else NA_character_,
      taxonomy_b = if ("Taxonomy_b" %in% names(df)) df$Taxonomy_b[i] else NA_character_,
      poi_a = df$poi_a[i],
      poi_b = df$poi_b[i]
    )
  })
}

# Full network arcs (for main dashboard views)
arcs_full <- build_arc_records(d)

# Short-distance arcs for the landing view (keep only distance < 2km)
landing_max_distance_km <- 2
d_landing <- d[!is.na(d$distance) & as.numeric(d$distance) < landing_max_distance_km, ]
d_landing <- d_landing |> sample_n(10000)
arcs_landing <- build_arc_records(d_landing)

message("Writing ", length(arcs_full), " arcs to ", out_path_full, " ...")
write_json(arcs_full, out_path_full, auto_unbox = TRUE, digits = 6)

message("Writing ", length(arcs_landing), " landing arcs (distance < ", landing_max_distance_km, "km) to ", out_path_landing, " ...")
write_json(arcs_landing, out_path_landing, auto_unbox = TRUE, digits = 6)

message("Done.")
