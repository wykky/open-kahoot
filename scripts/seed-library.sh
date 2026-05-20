#!/usr/bin/env bash
#
# Seed the curated quiz library on the VPS.
#
# Run from the repo root on the VPS *after* the latest commit is pulled
# and the container is up. It copies every TSV from quizzes/library-seed/
# into the container's /tmp/library-seed/ and runs the JS import script
# once per quiz, with the human-readable metadata for that file.
#
# Idempotent: import-library-quiz.cjs is keyed by slug, so re-running will
# update existing rows in place (preserves created_at, refreshes questions).
#
# Usage on VPS:
#   cd /opt/stack/atenu-live
#   bash scripts/seed-library.sh
#
# Usage locally (for testing against a local DB):
#   ATENU_DB_PATH=./data/atenu.db CONTAINER= bash scripts/seed-library.sh
#

set -euo pipefail

CONTAINER="${CONTAINER-atenu-live}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SEED_DIR="$REPO_ROOT/quizzes/library-seed"

if [[ ! -d "$SEED_DIR" ]]; then
  echo "Seed directory not found: $SEED_DIR" >&2
  exit 1
fi

# When CONTAINER is set, run everything inside the container via docker.
# When empty, run locally (assumes node + better-sqlite3 + ATENU_DB_PATH in scope).
run_node() {
  if [[ -n "$CONTAINER" ]]; then
    docker exec "$CONTAINER" node /app/scripts/import-library-quiz.cjs "$@"
  else
    node "$SCRIPT_DIR/import-library-quiz.cjs" "$@"
  fi
}

# Copy TSVs into the container (skipped in local mode).
if [[ -n "$CONTAINER" ]]; then
  echo "→ Copying TSVs into $CONTAINER:/tmp/library-seed/ ..."
  docker exec "$CONTAINER" rm -rf /tmp/library-seed
  docker cp "$SEED_DIR" "$CONTAINER:/tmp/library-seed"
fi

tsv_path() {
  local name="$1"
  if [[ -n "$CONTAINER" ]]; then
    echo "/tmp/library-seed/$name"
  else
    echo "$SEED_DIR/$name"
  fi
}

# One block per quiz: filename → slug + title + subject/grade + description.
# Add new entries here when more TSVs land in quizzes/library-seed/.

run_node \
  --tsv "$(tsv_path mathematics-g9.tsv)" \
  --slug mathematics-g9-algebra-foundations \
  --title "Mathematics Grade 9 — Algebra Foundations" \
  --subject Mathematics --grade 9 --language en \
  --think 5 --answer 25 \
  --description "Linear equations, expressions, exponents, slopes, and sets — core Grade 9 algebra you'll see throughout ESSLCE."

run_node \
  --tsv "$(tsv_path mathematics-g10.tsv)" \
  --slug mathematics-g10-geometry-basics \
  --title "Mathematics Grade 10 — Geometry Basics" \
  --subject Mathematics --grade 10 --language en \
  --think 5 --answer 25 \
  --description "Angles, triangles, circles, and area — the Grade 10 geometry essentials."

run_node \
  --tsv "$(tsv_path biology-g9.tsv)" \
  --slug biology-g9-intro \
  --title "Biology Grade 9 — Introduction to Life Science" \
  --subject Biology --grade 9 --language en \
  --think 5 --answer 20 \
  --description "Cells, organisms, photosynthesis, respiration, classification — the foundation of all biology."

run_node \
  --tsv "$(tsv_path biology-g11.tsv)" \
  --slug biology-g11-cells-transport \
  --title "Biology Grade 11 — Cells & Transport" \
  --subject Biology --grade 11 --language en \
  --think 5 --answer 25 \
  --description "Cell membrane structure, diffusion, osmosis, active transport, and the major organelles."

run_node \
  --tsv "$(tsv_path chemistry-g10.tsv)" \
  --slug chemistry-g10-atomic-structure \
  --title "Chemistry Grade 10 — Atomic Structure" \
  --subject Chemistry --grade 10 --language en \
  --think 5 --answer 25 \
  --description "Subatomic particles, isotopes, ions, the periodic table, and electron shells."

run_node \
  --tsv "$(tsv_path physics-g10.tsv)" \
  --slug physics-g10-motion-forces \
  --title "Physics Grade 10 — Motion & Forces" \
  --subject Physics --grade 10 --language en \
  --think 5 --answer 25 \
  --description "Speed, velocity, acceleration, Newton's laws, weight, and friction — the mechanics foundation."

run_node \
  --tsv "$(tsv_path geography-g9.tsv)" \
  --slug geography-g9-world-geography \
  --title "Geography Grade 9 — World Geography" \
  --subject Geography --grade 9 --language en \
  --think 5 --answer 20 \
  --description "Continents, oceans, latitude and longitude, atmosphere, and Ethiopia's place in the world."

run_node \
  --tsv "$(tsv_path history-g10.tsv)" \
  --slug history-g10-ethiopian-history \
  --title "History Grade 10 — Ethiopian History" \
  --subject History --grade 10 --language en \
  --think 5 --answer 25 \
  --description "Aksum, the Zagwe dynasty, Lalibela, the Solomonic line, Adwa, and the Italian invasion."

run_node \
  --tsv "$(tsv_path economics-g11.tsv)" \
  --slug economics-g11-basic-economics \
  --title "Economics Grade 11 — Basic Economics" \
  --subject Economics --grade 11 --language en \
  --think 5 --answer 25 \
  --description "Scarcity, demand and supply, equilibrium, opportunity cost, market structures, GDP, and inflation."

run_node \
  --tsv "$(tsv_path english-g10.tsv)" \
  --slug english-g10-grammar-essentials \
  --title "English Grade 10 — Grammar Essentials" \
  --subject English --grade 10 --language en \
  --think 5 --answer 20 \
  --description "Tenses, parts of speech, prepositions, subject-verb agreement, active vs passive voice."

echo
echo "✓ Library seeded. Visit https://live.atenu.org/library to verify."
