#!/usr/bin/env Rscript
# Preprocess Boston POI dependency network for the web app.
# Output: public/boston_network.json (array of arcs for deck.gl ArcLayer)

library(readr)
library(jsonlite)

# Paths (run from project root)
data_path <- "data/boston_network_pruned.csv.gz"
out_path  <- "public/boston_network.json"

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
arcs <- lapply(seq_len(nrow(d)), function(i) {
  list(
    sourcePosition = c(d$poilon_a[i], d$poilat_a[i]),
    targetPosition = c(d$poilon_b[i], d$poilat_b[i]),
    dep = as.numeric(d$dep[i]),
    q_dep = as.integer(d$q_dep[i]),
    distance = as.numeric(d$distance[i]),
    cat_a = d$cat_a[i],
    cat_b = d$cat_b[i],
    taxonomy_a = if ("Taxonomy_a" %in% names(d)) d$Taxonomy_a[i] else NA_character_,
    taxonomy_b = if ("Taxonomy_b" %in% names(d)) d$Taxonomy_b[i] else NA_character_,
    poi_a = d$poi_a[i],
    poi_b = d$poi_b[i]
  )
})

message("Writing ", length(arcs), " arcs to ", out_path, " ...")
write_json(arcs, out_path, auto_unbox = TRUE, digits = 6)

message("Done.")
