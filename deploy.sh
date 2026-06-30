#!/usr/bin/env bash
# Community Hero — one-command deploy to Google Cloud Run.
# Reads all keys from your local .env (never uploaded). Run after `gcloud auth login`.
set -euo pipefail

REGION="${REGION:-us-central1}"
SERVICE="community-hero"
REPO="community-hero"

# --- load .env ---
if [ ! -f .env ]; then echo "X  .env not found in $(pwd)"; exit 1; fi
set -a; . ./.env; set +a

# --- project ---
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
if [ -z "${PROJECT_ID:-}" ] || [ "$PROJECT_ID" = "(unset)" ]; then
  read -rp "Enter your Google Cloud project ID: " PROJECT_ID
fi
gcloud config set project "$PROJECT_ID" >/dev/null
echo ">> Project: $PROJECT_ID   Region: $REGION"

# --- required keys check ---
for v in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY NEXT_PUBLIC_GOOGLE_MAPS_API_KEY GEMINI_API_KEY; do
  if [ -z "${!v:-}" ]; then echo "X  Missing $v in .env"; exit 1; fi
done

# --- enable services + artifact repo (idempotent) ---
echo ">> Enabling APIs (first run only, ~1 min)..."
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com >/dev/null
echo ">> Ensuring Artifact Registry repo..."
gcloud artifacts repositories create "$REPO" --repository-format=docker --location="$REGION" >/dev/null 2>&1 || true

# --- build + deploy (public keys baked at build time) ---
echo ">> Building image and deploying to Cloud Run (a few minutes)..."
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_REGION="$REGION",_SERVICE="$SERVICE",_REPO="$REPO",_NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL",_NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY",_NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"

# --- runtime secrets (server-only; ^@^ delimiter lets values contain commas) ---
echo ">> Setting server-side secrets on the service..."
gcloud run services update "$SERVICE" --region "$REGION" \
  --set-env-vars "^@^GEMINI_API_KEY=${GEMINI_API_KEY}@CLOUDINARY_CLOUD_NAME=${CLOUDINARY_CLOUD_NAME:-}@CLOUDINARY_API_KEY=${CLOUDINARY_API_KEY:-}@CLOUDINARY_API_SECRET=${CLOUDINARY_API_SECRET:-}@AUTHORITY_PORTAL_PASSWORD=${AUTHORITY_PORTAL_PASSWORD:-admin123}" >/dev/null

URL=$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')
echo ""
echo "==================================================================="
echo " DEPLOYED:  $URL"
echo "==================================================================="
echo " One-time, so prod auth + maps work:"
echo "  1) Supabase -> Authentication -> URL Configuration:"
echo "     add  $URL  to Site URL AND Redirect URLs"
echo "  2) Google Cloud -> your Maps API key -> HTTP referrers:"
echo "     add  ${URL}/*"
echo "  3) Run schema_update.sql in the Supabase SQL editor (if not done)."
echo "==================================================================="
