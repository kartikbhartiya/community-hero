# Community Hero - one-command deploy to Google Cloud Run (PowerShell).
# Run in the SAME PowerShell where you did `gcloud auth login`:
#     powershell -ExecutionPolicy Bypass -File .\deploy.ps1
$ErrorActionPreference = 'Continue'

$REGION  = 'us-central1'
$SERVICE = 'community-hero'
$REPO    = 'community-hero'

if (-not (Test-Path .env)) { Write-Host 'X  .env not found in this folder'; exit 1 }

# --- load .env into a hashtable ---
$envVars = @{}
Get-Content .env | ForEach-Object {
  $line = $_.Trim()
  if ($line -and -not $line.StartsWith('#') -and $line.Contains('=')) {
    $i = $line.IndexOf('=')
    $k = $line.Substring(0, $i).Trim()
    $v = $line.Substring($i + 1).Trim().Trim('"').Trim("'")
    $envVars[$k] = $v
  }
}

# --- project ---
$PROJECT_ID = (gcloud config get-value project 2>$null)
if (-not $PROJECT_ID -or $PROJECT_ID -eq '(unset)') {
  $PROJECT_ID = Read-Host 'Enter your Google Cloud project ID'
  gcloud config set project $PROJECT_ID | Out-Null
}
Write-Host ">> Project: $PROJECT_ID   Region: $REGION"

# --- required keys ---
foreach ($v in 'NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','NEXT_PUBLIC_GOOGLE_MAPS_API_KEY','GEMINI_API_KEY') {
  if (-not $envVars[$v]) { Write-Host "X  Missing $v in .env"; exit 1 }
}

Write-Host '>> Enabling APIs (first run only, ~1 min)...'
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
if ($LASTEXITCODE -ne 0) { Write-Host 'X  Could not enable APIs (check billing is enabled on the project).'; exit 1 }

Write-Host '>> Ensuring Artifact Registry repo (the "already exists" note is fine)...'
gcloud artifacts repositories create $REPO --repository-format=docker --location=$REGION

Write-Host '>> Building image and deploying to Cloud Run (a few minutes)...'
$subs = "_REGION=$REGION,_SERVICE=$SERVICE,_REPO=$REPO," +
        "_NEXT_PUBLIC_SUPABASE_URL=$($envVars['NEXT_PUBLIC_SUPABASE_URL'])," +
        "_NEXT_PUBLIC_SUPABASE_ANON_KEY=$($envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'])," +
        "_NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$($envVars['NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'])"
gcloud builds submit --config cloudbuild.yaml --substitutions=$subs
if ($LASTEXITCODE -ne 0) { Write-Host 'X  Build/deploy step failed - see the output above.'; exit 1 }

Write-Host '>> Setting server-side secrets on the service...'
$pwd2 = if ($envVars['AUTHORITY_PORTAL_PASSWORD']) { $envVars['AUTHORITY_PORTAL_PASSWORD'] } else { 'admin123' }
$secrets = "^@^GEMINI_API_KEY=$($envVars['GEMINI_API_KEY'])" +
           "@CLOUDINARY_CLOUD_NAME=$($envVars['CLOUDINARY_CLOUD_NAME'])" +
           "@CLOUDINARY_API_KEY=$($envVars['CLOUDINARY_API_KEY'])" +
           "@CLOUDINARY_API_SECRET=$($envVars['CLOUDINARY_API_SECRET'])" +
           "@AUTHORITY_PORTAL_PASSWORD=$pwd2"
gcloud run services update $SERVICE --region $REGION --set-env-vars $secrets

$URL = (gcloud run services describe $SERVICE --region $REGION --format='value(status.url)')
Write-Host ''
Write-Host '==================================================================='
Write-Host " DEPLOYED:  $URL"
Write-Host '==================================================================='
Write-Host ' One-time, so prod auth + maps work:'
Write-Host "  1) Supabase -> Authentication -> URL Configuration:"
Write-Host "     add  $URL  to Site URL AND Redirect URLs"
Write-Host "  2) Google Cloud -> your Maps API key -> HTTP referrers:"
Write-Host "     add  $URL/*"
Write-Host '  3) Run schema_update.sql in the Supabase SQL editor (if not done).'
