# Dynamic Routes Weather Dashboard - Next.js POC

Weather application demonstrating **dynamic routes**, **loading states**, **error boundaries**, and **shared server-side services** with Next.js 16 App Router.

## Overview

This POC explores Next.js file-based routing patterns by building a weather dashboard with SEO-friendly URLs (`/weather/warsaw`), automatic loading UI, custom 404 pages, and proper error handling. Each city gets its own route with optimized metadata for search engines.

**Key concepts:** Dynamic route segments `[city]`, `loading.tsx`, `not-found.tsx`, `generateMetadata`, server-side service layer (NOT public API), Zod validation, and `basePath` configuration for subpath deployment.

## Tech Stack

- **Next.js 16.3.4** - React framework with App Router
- **React 19.2.8** - Server Components & Client Components
- **TypeScript** - Type safety across frontend and backend
- **Zod** - Runtime schema validation for external API
- **Tailwind CSS v4** - Styling with CSS-based config
- **Turbopack** - Fast dev server (Rust-based)

## Key Features

### Dynamic Routes with Route Parameters
- File-based routing: `app/weather/[city]/page.tsx`
- SEO-friendly URLs: `/weather/warsaw`, `/weather/london`
- Route params accessed via `params.city`
- Each city has its own shareable URL (no query params)

### Automatic Loading States
- `loading.tsx` - shown during SSR data fetching
- Automatic UI during async Server Component rendering
- No manual loading state management needed
- Streaming SSR with instant visual feedback

### Custom 404 Pages
- `not-found.tsx` - custom error page for invalid cities
- Triggered by `notFound()` function
- Route-specific (not global 404)
- Branded error experience

### SEO Optimization per Route
- `generateMetadata()` - dynamic metadata per city
- Unique title and description for each route
- Search engines index each city separately
- Social sharing with proper meta tags

### Server-Side Service Layer
- `weatherService.ts` - shared data fetching logic
- **NOT exposed as public API endpoint**
- Server-to-server only (no HTTP overhead)
- Reusable across multiple Server Components
- Zod validation for external API responses

### Error Handling Strategy
- **404 (City not found)** → `not-found.tsx` custom page
- **500 (Server error)** → `error.tsx` error boundary
- Runtime validation with Zod schemas
- Type-safe error responses

### Subpath Deployment Support
- `basePath` configuration in `next.config.ts`
- Deploy to subpath: `https://domain.com/weather-app/`
- All routes, assets, and links automatically prefixed
- No code changes needed when enabling

## Project Structure

```
app/
  layout.tsx                    # Root layout, fonts, metadata
  page.tsx                      # Homepage (landing page, no weather)
  error.tsx                     # Global error boundary
  globals.css                   # Tailwind + theme config
  _components/                  # Private components (not routes)
    CitySelector.tsx            # Client Component: city search form
    RecentSearches.tsx          # Client Component: recent cities list
  weather/                      # Weather feature module
    _services/                  # Server-side services (NOT public API)
      weatherService.ts         # Shared data fetching with Zod validation
    [city]/                     # Dynamic route segment
      page.tsx                  # Weather page (Server Component)
      loading.tsx               # Loading UI (automatic)
      not-found.tsx             # 404 page for invalid cities
  api/
    cities/
      recent/
        route.ts                # API Route: recent cities (in-memory)
types/
  weather.ts                    # Shared Zod schemas + TypeScript types
```

**Key patterns:**
- `[city]` - Dynamic route segment (folder name with brackets)
- `_services/` - Underscore prefix = not a route, server-side only
- `loading.tsx` - Special file, shown during async rendering
- `not-found.tsx` - Special file, shown when `notFound()` is called

## Getting Started

### Prerequisites
- Node.js 20+
- npm

### Installation

```bash
# Install dependencies
npm install

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Usage

1. **Homepage:** Landing page with city search form
2. **Search city:** Type city name (e.g., "London") → Submit
3. **Dynamic route:** Redirects to `/weather/london`
4. **Loading state:** See loading UI for 2 seconds (artificial delay for testing)
5. **Weather display:** Current weather with temperature, conditions, wind
6. **Recent searches:** Click any recent city to view its weather

### Test Different Flows

**Normal flow (valid city):**
```
http://localhost:3000/weather/warsaw
→ Loading UI (2s) → Weather display
```

**404 flow (invalid city):**
```
http://localhost:3000/weather/invalidcity123
→ Loading UI (2s) → Custom "City Not Found" page
```

**500 flow (simulated server error):**
```
http://localhost:3000/weather/error500
→ Loading UI (2s) → Error page with "Try again" button
```

### Verify SEO Metadata

```bash
# Check unique metadata per city
curl -s http://localhost:3000/weather/warsaw | grep "<title>"
# Output: <title>Weather in Warsaw</title>

curl -s http://localhost:3000/weather/london | grep "<title>"
# Output: <title>Weather in London</title>
```

Each city has unique `<title>` and `<meta name="description">` for SEO.

### Verify SSR

```bash
# Weather data is in HTML before JS loads
curl -s http://localhost:3000/weather/warsaw | grep "°C"
# Output: HTML contains temperature (e.g., "15°C")
```

✅ Data is in HTML source = Server-Side Rendered!

## How It Works

### Dynamic Route with Params
```tsx
// app/weather/[city]/page.tsx
export default async function WeatherPage({
  params,
}: {
  params: Promise<{ city: string }>;  // Promise in Next.js 15+
}) {
  const { city } = await params;  // Access route parameter
  
  // Fetch weather using shared service
  const weather = await getWeather(city);
  
  if (!weather) {
    notFound();  // Triggers not-found.tsx
  }
  
  return <div>Weather for {city}: {weather.temp_C}°C</div>;
}
```

**URL mapping:**
- `/weather/warsaw` → `params.city = "warsaw"`
- `/weather/london` → `params.city = "london"`

### Server-Side Service (NOT API)
```tsx
// app/weather/_services/weatherService.ts
import { z } from 'zod';

const wttrApiResponseSchema = z.object({
  current_condition: z.array(z.object({
    temp_C: z.string(),
    weatherDesc: z.array(z.object({ value: z.string() })),
    weatherIconUrl: z.array(z.object({ value: z.string().url() })),
    windspeedKmph: z.string(),
  })).min(1),
});

export async function getWeather(city: string) {
  const res = await fetch(`https://wttr.in/${city}?format=j1`, {
    cache: 'no-store',
  });
  
  const text = await res.text();
  
  if (text.includes('location not found')) {
    return null;  // City not found
  }
  
  const data = JSON.parse(text);
  const result = wttrApiResponseSchema.safeParse(data);
  
  if (!result.success) {
    return null;  // Invalid data
  }
  
  return result.data.current_condition[0];
}
```

**Why NOT an API Route:**
- No public endpoint exposed
- No HTTP overhead (direct function call)
- Server-to-server only
- Can be reused by multiple Server Components

### Automatic Loading State
```tsx
// app/weather/[city]/loading.tsx
export default function Loading() {
  return <div>Loading weather...</div>;
}
```

Next.js automatically shows `loading.tsx` while `page.tsx` is rendering (async data fetching).

### Custom 404 Page
```tsx
// app/weather/[city]/not-found.tsx
export default function NotFound() {
  return (
    <div>
      <h1>City Not Found</h1>
      <Link href="/">Back to Home</Link>
    </div>
  );
}
```

Triggered in `page.tsx` with `notFound()` function when city doesn't exist.

### SEO Metadata per Route
```tsx
// app/weather/[city]/page.tsx
export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;
  const cityCapitalized = city.charAt(0).toUpperCase() + city.slice(1);
  
  return {
    title: `Weather in ${cityCapitalized}`,
    description: `Current weather conditions in ${cityCapitalized}`,
  };
}
```

Each city route has unique `<title>` and `<meta>` tags for search engines.

### Client Component Navigation
```tsx
// app/_components/CitySelector.tsx
'use client';

export function CitySelector() {
  const router = useRouter();
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Save to API
    await fetch('/api/cities/recent', {
      method: 'POST',
      body: JSON.stringify({ city }),
    });
    
    // Navigate to dynamic route
    router.push(`/weather/${city.toLowerCase()}`);
  };
  
  return <form onSubmit={handleSubmit}>...</form>;
}
```

Before: `router.push('/?city=warsaw')`  
After: `router.push('/weather/warsaw')`

## What I Learned

### Dynamic Routes (File-Based Routing)
| Pattern | File | URL | Route Param |
|---------|------|-----|-------------|
| **Dynamic segment** | `[city]/page.tsx` | `/weather/warsaw` | `params.city = "warsaw"` |
| **Catch-all** | `[...slug]/page.tsx` | `/docs/a/b/c` | `params.slug = ["a","b","c"]` |
| **Optional catch-all** | `[[...slug]]/page.tsx` | `/docs` or `/docs/a` | `params.slug = [] or ["a"]` |

**This POC uses:** `[city]` - single dynamic segment

### Special File Conventions
| File | Purpose | When Shown |
|------|---------|------------|
| `page.tsx` | Route UI | Always (the actual page) |
| `loading.tsx` | Loading UI | During async page rendering |
| `not-found.tsx` | 404 page | When `notFound()` is called |
| `error.tsx` | Error boundary | When error is thrown in page |
| `layout.tsx` | Shared UI | Wraps page + children |

### Server-Side Services vs API Routes
| Pattern | File Location | Exposed Publicly | Use Case |
|---------|---------------|------------------|----------|
| **Service** | `app/*/\_services/` | ❌ No | Server Components → shared logic |
| **API Route** | `app/api/*/route.ts` | ✅ Yes | Client Components → HTTP endpoint |

**Rule:** If only Server Components use it → service (NOT API Route)

### Error Handling Strategy
```tsx
// app/weather/[city]/page.tsx
const weather = await getWeather(city);

if (!weather) {
  notFound();  // → shows not-found.tsx (404)
}

if (error) {
  throw new Error('Server error');  // → shows error.tsx (500)
}
```

**404 vs 500:**
- 404 (Client error) → `notFound()` → custom `not-found.tsx`
- 500 (Server error) → `throw Error` → error boundary `error.tsx`

### Zod for External API Validation
```tsx
const schema = z.object({
  current_condition: z.array(...).min(1),
});

const result = schema.safeParse(apiResponse);

if (!result.success) {
  console.error(result.error.format());
  return null;
}

return result.data;  // Type-safe!
```

**Why Zod:**
- Runtime validation (don't trust external APIs)
- Type inference (schema → TypeScript types)
- Detailed error messages (`error.format()`)

### basePath for Subpath Deployment
```tsx
// next.config.ts
const nextConfig = {
  basePath: '/my-app',  // Deployed to: https://domain.com/my-app/
};
```

**Automatic prefixing:**
- `/weather/warsaw` → `/my-app/weather/warsaw`
- `/_next/static/*` → `/my-app/_next/static/*`
- `router.push()`, `<Link>`, `<Image>` all work automatically

### Next.js 15+ Changes
- `params` is now a **Promise** (async Dynamic API)
- Must use `await params` to access route parameters
- Enables better Streaming SSR performance

## Build for Production

```bash
npm run build
npm start
```

## Docker Build

Multi-stage Dockerfile optimized for Cloud Run:

```bash
# Build locally
docker build -t nextjs-interactive-weather:latest .

# Run locally
docker run -p 3000:3000 nextjs-interactive-weather:latest
```

**Features:**
- Multi-stage build (deps → builder → runner)
- `output: 'standalone'` for minimal image size
- node:20-alpine base (small footprint)
- Non-root user for security
- Optimized layer caching

**Note:** In-memory storage (recentCities Map) resets when container restarts - this is expected for POC. Phase 3+ will add persistent storage.

## Cloud Run Deployment

### Prerequisites

**GCP Setup (one-time for all Next.js POCs):**
```bash
# Artifact Registry repository already exists
# Service Account already exists
# See POC #1 or #2 documentation for initial setup
```

### Deploy to Cloud Run

```bash
# Set variables
PROJECT_ID=native-dev-506112
REGION=europe-central2
SERVICE_NAME=nextjs-dynamic-routes

# 1. Build Docker image with Cloud Build
gcloud builds submit \
  --account=paweljanus.gcp@gmail.com \
  --project=${PROJECT_ID} \
  --tag ${REGION}-docker.pkg.dev/${PROJECT_ID}/nextjs-apps/${SERVICE_NAME}:latest

# 2. Deploy to Cloud Run
gcloud run deploy ${SERVICE_NAME} \
  --account=paweljanus.gcp@gmail.com \
  --project=${PROJECT_ID} \
  --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/nextjs-apps/${SERVICE_NAME}:latest \
  --platform=managed \
  --region=${REGION} \
  --service-account=nextjs-apps-sa@${PROJECT_ID}.iam.gserviceaccount.com \
  --allow-unauthenticated \
  --port=3000 \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10
```

### Get Service URL

```bash
gcloud run services describe ${SERVICE_NAME} \
  --account=paweljanus.gcp@gmail.com \
  --project=${PROJECT_ID} \
  --region=${REGION} \
  --format='value(status.url)'
```

### Verify in Production

```bash
# Get the service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
  --account=paweljanus.gcp@gmail.com \
  --project=${PROJECT_ID} \
  --region=${REGION} \
  --format='value(status.url)')

# Test dynamic routes
curl -s ${SERVICE_URL}/weather/warsaw | grep "°C"
curl -s ${SERVICE_URL}/weather/london | grep "<title>"

# Test 404 handling
curl -s ${SERVICE_URL}/weather/invalidcity | grep "City Not Found"

# Test recent cities API
curl -s ${SERVICE_URL}/api/cities/recent | jq .
```

If you see weather data, unique titles, and 404 pages → deployment works! ✅

**Note:** In-memory storage (recent cities) resets on Cloud Run cold start - expected for POC.

## How It Works - Full Flow

1. **User visits homepage** (`/`)
   - Server Component renders landing page
   - CitySelector (Client Component) and RecentSearches visible
   - No weather data shown (clean landing page)

2. **User types city** (e.g., "London") in CitySelector
   - Client Component with `useState` for form input
   - Submit → POST to `/api/cities/recent` (save to in-memory)
   - `router.push('/weather/london')` → navigate to dynamic route

3. **Browser navigates to `/weather/london`**
   - Next.js matches route pattern: `app/weather/[city]/page.tsx`
   - Passes `params = { city: "london" }` to page
   - Shows `loading.tsx` (instant visual feedback)

4. **Server Component renders** (SSR)
   - `await params` → get city from URL
   - Call `getWeather(city)` → shared service fetches data
   - Zod validates external API response
   - If invalid city → `notFound()` → shows `not-found.tsx`
   - If server error → `throw Error` → shows `error.tsx`

5. **HTML streams to browser**
   - Loading UI disappears
   - Weather data displays (temp, conditions, wind)
   - `generateMetadata()` sets `<title>Weather in London</title>`
   - SEO-friendly, shareable URL

6. **User clicks recent city**
   - POST to `/api/cities/recent` (update timestamp)
   - `router.push('/weather/warsaw')` → new dynamic route
   - Cycle repeats from step 3

## Development Progress

### Phase 1: Project Setup ✅
- Forked from POC #2 (nextjs-interactive-weather)
- Removed `.git`, `.next`, `node_modules`
- Updated `package.json` name to `nextjs-dynamic-routes`
- Initialized fresh git repo with personal GitHub config
- Created initial commit

### Phase 2: Dynamic Routes ✅
- Created `app/weather/[city]/page.tsx` (dynamic route)
- Implemented route params: `params.city`
- Added `generateMetadata()` for SEO per city
- Updated routing: `/?city=warsaw` → `/weather/warsaw`

### Phase 3: File Conventions ✅
- Added `app/weather/[city]/loading.tsx` (automatic loading UI)
- Added `app/weather/[city]/not-found.tsx` (custom 404 page)
- Implemented `notFound()` trigger for invalid cities
- Tested loading states (2s artificial delay)

### Phase 4: Service Layer Architecture ✅
- Created `app/weather/_services/weatherService.ts`
- Moved data fetching logic to shared service
- Implemented Zod validation for external API
- Proper error handling: 404 vs 500 distinction

### Phase 5: Component Updates ✅
- Updated `CitySelector.tsx`: `router.push('/weather/${city}')`
- Updated `RecentSearches.tsx`: same routing pattern
- Homepage now landing page (no weather display)
- Clean separation: landing page vs weather routes

### Phase 6: Configuration ✅
- Added `basePath` config (commented, ready for subpath deployment)
- Documented testing features (delay, error simulation)
- Updated README.md for POC #3
- All code tested locally

## Commits

Clean git history:
1. `Initial commit - forked from POC #2 (nextjs-interactive-weather)`
2. `Add dynamic routes with loading and error states`

Each commit represents a complete working state.

**GitHub:** TBD (will be created after deployment)

## Key Learnings

### Dynamic Routes Best Practices
- Use `[param]` for single segment (e.g., `/blog/[slug]`)
- Use `[...param]` for catch-all (e.g., `/docs/[...path]`)
- Use `[[...param]]` for optional catch-all
- Always `await params` in Next.js 15+ (params is a Promise)

### File Convention Hierarchy
```
app/weather/[city]/
  layout.tsx        ← Wraps all (shown always)
  loading.tsx       ← During page async rendering
  error.tsx         ← Error boundary (500)
  not-found.tsx     ← 404 page
  page.tsx          ← Actual route content
```

Next.js shows these in order: layout → loading → page (or error/not-found).

### Server-Side Service Pattern
**Don't create API Routes for server-to-server logic!**

❌ **Bad:** `app/api/weather/route.ts` (public endpoint, HTTP overhead)  
✅ **Good:** `app/weather/_services/weatherService.ts` (server-only function)

**When to use each:**
- Service: Server Component → Server Component (direct function call)
- API Route: Client Component → Server (HTTP endpoint)

### Zod Validation Strategy
- **API boundary:** Validate user input (forms, API requests)
- **External APIs:** Validate third-party responses (don't trust!)
- **Type inference:** `z.infer<typeof schema>` → TypeScript types
- **Error handling:** `safeParse()` → check `success` boolean

### SEO with Dynamic Routes
```tsx
// Each route has unique metadata
export async function generateMetadata({ params }) {
  return {
    title: `Page for ${params.city}`,
    description: `...`,
  };
}
```

Google indexes each route separately → better search visibility.

## Part of Next.js POC Series

This is POC #3 in a series exploring Next.js App Router patterns:
1. ✅ **Next.js SSR Basics** - Server-Side Rendering fundamentals
2. ✅ **Interactive Weather Dashboard** - Client Components + API Routes
3. ✅ **Dynamic Routes Weather Dashboard** ← You are here
4. 🔄 **Server Actions + Forms** - Progressive enhancement
5. 🔄 **ISR/SSG Strategies** - Static generation + revalidation
6. 🔄 **Route Groups** - Organizing routes without URL changes
7. 🔄 **Optimizations** - Image, Script, Bundle analysis
8. 🔄 **Advanced Routing** - Parallel + Intercepting Routes
9. 🔄 **Auth + Middleware** - NextAuth.js + protected routes
10. 🔄 **Database Integration** - Firestore + Server Components

---

**Learning focus:** Dynamic routes, loading states, error handling, SEO, service layer  
**Status:** ✅ Complete (local development)  
**Production URL:** TBD (deployment in progress)  
**Repository:** TBD (GitHub push pending)  
**Next POC:** #4 - Server Actions + Forms
