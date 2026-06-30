# Deploying Community Hero to Google Cloud Run

This app is a Next.js 16 server app (it has API routes + middleware), so it must run
as a **container on Cloud Run** — not as a static site. Everything you need is in the
repo: `Dockerfile`, `.dockerignore`, `cloudbuild.yaml`, and `output: "standalone"` in
`next.config.ts`.

---

## 0. What each key is for

| Variable | Where it's used | When it's needed |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser (auth, data) | **build time** (baked into JS) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser | **build time** |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | browser (maps) | **build time** |
| `GEMINI_API_KEY` | server (AI routes) | **runtime** |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | server (uploads) | **runtime** |
| `AUTHORITY_PORTAL_PASSWORD` | server (authority login) | **runtime** (set to your `admin123` or stronger) |

> `NEXT_PUBLIC_*` are compiled into the client bundle, so they go in as **Docker build args**.
> Server secrets are set as **Cloud Run runtime env vars** (never baked into the image).

---

## 1. Get a Gemini key from Google AI Studio
1. Go to https://aistudio.google.com/ → **Get API key** → create key (use the same Google
   Cloud project you'll deploy to).
2. That value is your `GEMINI_API_KEY`. (AI Studio is only for the key — you still host the
   app on Cloud Run.)

## 2. One-time Google Cloud setup
```bash
# Install the gcloud CLI first: https://cloud.google.com/sdk/docs/install
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Enable the services
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com

# Create an Artifact Registry repo to hold the image (region must match cloudbuild.yaml)
gcloud artifacts repositories create community-hero \
  --repository-format=docker --location=us-central1
```

## 3. Build + deploy (one command)
```bash
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=\
_NEXT_PUBLIC_SUPABASE_URL=https://YOURREF.supabase.co,\
_NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY,\
_NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_MAPS_KEY
```
This builds the image with the public keys baked in, pushes it, and deploys the
`community-hero` service to Cloud Run.

## 4. Set the server-side secrets on the running service
```bash
gcloud run services update community-hero --region us-central1 \
  --set-env-vars \
GEMINI_API_KEY=YOUR_GEMINI_KEY,\
CLOUDINARY_CLOUD_NAME=YOUR_CLOUD,\
CLOUDINARY_API_KEY=YOUR_CLOUDINARY_KEY,\
CLOUDINARY_API_SECRET=YOUR_CLOUDINARY_SECRET,\
AUTHORITY_PORTAL_PASSWORD=admin123
```
(For real security use Secret Manager + `--set-secrets` instead of plain env vars.)

## 5. Wire up the live URL (important — do this once)
Cloud Run gives you a URL like `https://community-hero-xxxxx-uc.a.run.app`.

1. **Supabase → Authentication → URL Configuration**: add that URL to **Site URL** and
   **Redirect URLs** (so email-confirmation links work in production).
2. **Google Cloud → Credentials → your Maps API key → Application restrictions →
   HTTP referrers**: add `https://community-hero-*-uc.a.run.app/*` (and your custom
   domain if any) so the map loads in production.
3. **Supabase → Authentication → Providers → Email**: keep **Confirm email = ON**
   (your SMTP is configured), so new sign-ups get a verification email.

## 6. Redeploy after code changes
Just re-run the command in **Step 3**. (Runtime secrets from Step 4 persist.)

---

## Quick alternative: deploy from source (no cloudbuild.yaml)
```bash
gcloud run deploy community-hero --source . --region us-central1 --allow-unauthenticated
```
⚠️ This path does **not** pass the `NEXT_PUBLIC_*` build args, so Supabase/Maps in the
browser would be blank. Prefer the `cloudbuild.yaml` path above unless you bake those
values another way.

---

## Demo account for judges (since email confirmation is ON)
Create it once: **Sign Up** with `demo@communityhero.app` / `demohero123`, click the
confirmation email, and afterwards the **"Try the Demo Account"** button on `/login`
signs straight in. The **Authority console** is separate — `/login → Authority` with the
`AUTHORITY_PORTAL_PASSWORD` you set (`admin123`).

## Troubleshooting
- **White map / "Sign In" stuck** → the `NEXT_PUBLIC_*` build args weren't passed; rebuild via Step 3.
- **Email links point to localhost** → fix Supabase Site/Redirect URLs (Step 5.1).
- **AI features 500** → `GEMINI_API_KEY` not set on the service (Step 4).
- **Container won't start** → Cloud Run needs the app on `$PORT` (8080); the Dockerfile already handles this.
