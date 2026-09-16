# Server Actions + Forms - Next.js POC

Weather application demonstrating **Server Actions**, **React 19 form hooks** (`useActionState`, `useFormStatus`), **progressive enhancement**, and **type-safe server mutations** with Next.js 16 App Router.

## Overview

This POC explores Next.js Server Actions by replacing traditional API Routes with direct server-side functions. The application demonstrates modern form handling with React 19 hooks, progressive enhancement (works without JavaScript), and seamless integration between client and server.

**Key concepts:** Server Actions (`'use server'`), `useActionState`, `useFormStatus`, `revalidatePath`, FormData handling, progressive enhancement, and type-safe server mutations.

## Tech Stack

- **Next.js 16.3.4** - React framework with App Router
- **React 19.2.8** - Server Components & new form hooks
- **TypeScript** - Type safety across frontend and backend
- **Zod** - Runtime schema validation
- **Tailwind CSS v4** - Styling with CSS-based config
- **Turbopack** - Fast dev server (Rust-based)

## Key Features

### Server Actions
- `'use server'` directive - mark functions as server-side only
- Direct function calls from Client Components (no fetch/HTTP)
- Automatic serialization of FormData
- Type-safe with full TypeScript support
- No API Route boilerplate needed

### React 19 Form Hooks
- **useActionState** - form state management + pending state
- **useFormStatus** - access form submission status in child components
- Replaces old patterns: `useState` + `useEffect` + `fetch()`

### Progressive Enhancement
- Forms work without JavaScript enabled
- Server Actions execute even if JS fails to load
- Graceful degradation built-in
- Better accessibility and reliability

### Cache Revalidation
- `revalidatePath()` - invalidate cache after mutations
- Automatic re-rendering of affected routes
- No manual `router.refresh()` needed

### Form Data Handling
- Native FormData API
- Server-side validation with Zod
- Type-safe inputs/outputs
- Error handling built into useActionState

## Project Structure

```
app/
  layout.tsx                    # Root layout, fonts, metadata
  page.tsx                      # Homepage (landing page with form)
  error.tsx                     # Global error boundary
  globals.css                   # Tailwind + theme config
  _lib/
    citiesStore.ts              # Pure business logic (no framework dependencies)
  _components/
    CitySelector/
      CitySelector.tsx          # Client Component: form with Server Actions
      actions.ts                # Server Actions for CitySelector
    RecentSearches/
      RecentSearches.tsx        # Server Component: displays recent cities
      actions.ts                # Server Actions for RecentSearches
  weather/                      # Weather feature module
    _services/                  # Server-side services
      weatherService.ts         # Shared data fetching with Zod validation
    [city]/                     # Dynamic route segment
      page.tsx                  # Weather page (Server Component)
      loading.tsx               # Loading UI (automatic)
      not-found.tsx             # 404 page for invalid cities
types/
  weather.ts                    # Shared Zod schemas + TypeScript types
```

**Key changes from POC #3:**
- ✅ **Added:** Server Actions (collocated with components)
- ✅ **Added:** `_lib/citiesStore.ts` - Pure business logic layer
- ❌ **Removed:** `app/api/cities/recent/route.ts` - API Route (no longer needed)
- 🔄 **Updated:** `CitySelector` - now uses `useActionState` + `useFormStatus`
- 🔄 **Updated:** `RecentSearches` - now Server Component with Server Actions
- 📁 **Architecture:** Layered structure (store → actions → components)

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
3. **Server Action:** Form data sent to server (no API call!)
4. **Dynamic route:** Redirects to `/weather/london`
5. **Loading state:** Automatic pending state via `useFormStatus`
6. **Weather display:** Current weather with temperature, conditions, wind
7. **Recent searches:** Click any recent city (each is a form with Server Action)

### Test Progressive Enhancement

**Disable JavaScript in browser:**
```
Chrome DevTools → Cmd+Shift+P → "Disable JavaScript"
```

Submit the form → **it still works!** Server Action executes server-side.

## How It Works

### Server Actions - Layered Architecture

**Layer 1: Pure Business Logic (Store)**
```tsx
// app/_lib/citiesStore.ts
import { z } from 'zod';

export function saveCity(city: string): string {
  // Validation with Zod (with security regex)
  const result = schema.safeParse({ city: city.trim() });
  if (!result.success) {
    throw new Error('Invalid city name');
  }
  
  // Save to storage (in-memory Map)
  recentCities.set(result.data.city.toLowerCase(), { ... });
  
  return result.data.city;
}
```

**Layer 2: Server Actions (Framework Integration)**
```tsx
// app/_components/CitySelector/actions.ts
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { saveCity } from '@/app/_lib/citiesStore';

export async function saveRecentCity(
  prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  try {
    // Pure business logic
    const normalizedCity = saveCity(formData.get('city'));
    
    // Framework side effects
    revalidatePath('/');
    redirect(`/weather/${normalizedCity.toLowerCase()}`);
    
    return {};
  } catch (error) {
    // NEXT_REDIRECT must be re-thrown!
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error;
    }
    return { error: 'Please enter a valid city name' };
  }
}
```

**Key points:**
- `'use server'` at top of file = all exports are Server Actions
- **Separation:** Pure logic (store) vs Framework logic (actions)
- **redirect()** throws NEXT_REDIRECT - must re-throw in try/catch!
- Returns serializable data only

### Client Component with useActionState

```tsx
// app/_components/CitySelector/CitySelector.tsx
'use client';

import { useActionState } from 'react';
import { saveRecentCity } from './actions';  // ← Collocated!

export function CitySelector() {
  const [state, formAction] = useActionState(saveRecentCity, null);
  
  return (
    <form action={formAction}>
      <input type="text" name="city" required />
      <SubmitButton />
      {state?.error && <p>{state.error}</p>}
    </form>
  );
}
```

**useActionState hook:**
- `saveRecentCity` - Server Action to execute
- `null` - initial state
- Returns: `[state, formAction]`
  - `state` - return value from Server Action
  - `formAction` - wrapped action to pass to `<form action={...}>`

### Submit Button with useFormStatus

```tsx
// app/_components/CitySelector.tsx
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();
  
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Loading...' : 'Search'}
    </button>
  );
}
```

**useFormStatus hook:**
- **Must be in a child component** (not the form itself)
- Provides: `{ pending, data, method, action }`
- `pending` - true while form is submitting
- Automatically updates when Server Action starts/finishes

### Server Component with Server Action

```tsx
// app/_components/RecentSearches/RecentSearches.tsx
import { getRecentCities, saveRecentCityFromFormData } from './actions';

export async function RecentSearches() {
  const cities = await getRecentCities();
  
  // Direct function assignment (no inline action needed)
  const handleCityClick = saveRecentCityFromFormData;
  
  return (
    <div>
      {cities.map((city) => (
        <form action={handleCityClick}>
          <input type="hidden" name="city" value={city.name} />
          <button type="submit">{city.name}</button>
        </form>
      ))}
    </div>
  );
}
```

**Server Actions collocated:**
```tsx
// app/_components/RecentSearches/actions.ts
'use server';

export async function getRecentCities(): Promise<RecentCity[]> {
  return getRecentCitiesFromStore();
}

export async function saveRecentCityFromFormData(formData: FormData) {
  const city = formData.get('city') as string;
  const normalizedCity = saveCity(city);
  revalidatePath('/');
  redirect(`/weather/${normalizedCity.toLowerCase()}`);
}
```

**Pattern:**
- Actions collocated with components (same folder)
- Exported functions, not inline
- Easier to test and reuse

### Cache Revalidation

```tsx
// app/_components/CitySelector/actions.ts
'use server';

import { revalidatePath } from 'next/cache';

export async function saveRecentCity(...) {
  // Pure business logic (store layer)
  const normalizedCity = saveCity(city);
  
  // Invalidate Router Cache for homepage (back button shows updated list)
  revalidatePath('/');
  
  // Redirect
  redirect(`/weather/${normalizedCity.toLowerCase()}`);
}
```

**revalidatePath:**
- Invalidates Router Cache (client-side) for a specific route
- Homepage shows updated recent searches after back button
- All components on that path re-render with fresh data
- No manual `router.refresh()` needed

### Security: Runtime Validation with Zod

**TypeScript ≠ Runtime Security!**

```typescript
// types/weather.ts
export const addCityRequestSchema = z.object({
  city: z
    .string()
    .trim()                                    // Sanitization
    .min(1, 'City name is required')
    .max(50, 'City name is too long')
    .regex(
      /^[a-zA-ZÀ-ſ\s.\-']+$/,                 // Security filter
      'City name can only contain letters, spaces, dots, hyphens, and apostrophes'
    ),
});
```

**What this blocks:**
- ✅ XSS attacks: `<script>alert('XSS')</script>` → BLOCKED
- ✅ SQL injection: `'; DROP TABLE cities; --` → BLOCKED  
- ✅ Command injection: `London; rm -rf /` → BLOCKED
- ✅ DoS: 10MB string → BLOCKED (max 50 chars)
- ✅ Empty input: `"   "` → BLOCKED (trim + min 1)

**Defense in Depth:**
1. **Zod validation** (server-side) - CRITICAL for security
2. **React auto-escape** (rendering) - XSS protection in JSX
3. **CSP headers** (optional) - Additional layer

**Rule:** Always validate user input server-side with Zod, even if TypeScript types look safe!

## What I Learned

### Server Actions vs API Routes

| Feature | Server Actions | API Routes |
|---------|---------------|------------|
| **File location** | `app/actions.ts` or inline | `app/api/*/route.ts` |
| **How to call** | `<form action={...}>` or direct call | `fetch('/api/endpoint')` |
| **Type safety** | ✅ Full TypeScript support | ⚠️ Manual typing needed |
| **Boilerplate** | Minimal (just function) | More (NextRequest, NextResponse) |
| **Progressive enhancement** | ✅ Works without JS | ❌ Requires JS |
| **Use case** | Forms, mutations | Third-party webhooks, REST API |

**Rule:** Use Server Actions for forms and mutations. Use API Routes only when you need a public HTTP endpoint.

### React 19 Form Hooks

#### useActionState
```tsx
const [state, formAction, isPending] = useActionState(action, initialState);
```

- **Replaces:** `useState` + `useEffect` + `fetch()` pattern
- **state:** Return value from Server Action
- **formAction:** Wrapped action to pass to `<form action={...}>`
- **isPending:** Boolean (true during submission)

#### useFormStatus
```tsx
const { pending, data, method, action } = useFormStatus();
```

- **Must be in child component** (inside `<form>`)
- **pending:** Boolean (true during submission)
- **data:** FormData being submitted
- **method:** HTTP method ('GET', 'POST', etc.)
- **action:** Server Action being executed

### Progressive Enhancement

**Traditional approach (requires JS):**
```tsx
<form onSubmit={async (e) => {
  e.preventDefault();
  await fetch('/api/submit', { method: 'POST', body: ... });
  router.push('/success');
}}>
```

**Server Actions approach (works without JS):**
```tsx
<form action={serverAction}>
  {/* No JavaScript needed - form submits to server */}
</form>
```

If JavaScript loads:
- Form submits via Server Action (fast, no page reload)
- `useFormStatus` shows pending state
- Client-side navigation with `redirect()`

If JavaScript fails:
- Form submits as traditional POST
- Server Action still executes
- Browser follows redirect

### FormData Handling

```tsx
export async function saveRecentCity(prevState, formData: FormData) {
  const city = formData.get('city') as string;
  const file = formData.get('file') as File;
  
  // Validate with Zod
  const result = schema.safeParse({ city });
  
  if (!result.success) {
    return { error: 'Invalid input' };
  }
  
  // Process...
}
```

**FormData API:**
- `formData.get('name')` - single value
- `formData.getAll('name')` - all values (checkboxes, multi-select)
- Works with files, text inputs, hidden fields

### Error Handling

```tsx
export async function saveRecentCity(prevState, formData) {
  try {
    // Validate
    const result = schema.safeParse({ ... });
    if (!result.success) {
      return { error: 'Validation failed' };  // Show in UI
    }
    
    // Save to DB
    await db.save(...);
    
    // Success - redirect
    redirect('/success');
  } catch (error) {
    // Don't catch redirect errors!
    if (error.message === 'NEXT_REDIRECT') {
      throw error;
    }
    
    return { error: 'Server error' };
  }
}
```

**Important:** `redirect()` throws `NEXT_REDIRECT` error - re-throw it!

## Build for Production

```bash
npm run build
npm start
```

## Docker Build

Multi-stage Dockerfile optimized for Cloud Run:

```bash
# Build locally
docker build -t nextjs-server-actions:latest .

# Run locally
docker run -p 3000:3000 nextjs-server-actions:latest
```

**Note:** In-memory storage (recentCities Map) resets when container restarts - this is expected for POC.

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
SERVICE_NAME=nextjs-server-actions

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

# Test progressive enhancement (form works without JS)
curl -X POST ${SERVICE_URL}/ -d "city=London" -L
```

## Development Progress

### Phase 1: Project Setup ✅
- Forked from POC #3 (nextjs-dynamic-routes)
- Removed `.git`, `.next`, `node_modules`
- Updated `package.json` name to `nextjs-server-actions`
- Initialized fresh git repo with personal GitHub config
- Created initial commit

### Phase 2: Server Actions ✅
- Created `app/actions.ts` with Server Actions
- `saveRecentCity()` - form submission + redirect
- `getRecentCities()` - fetch recent cities
- `saveRecentCityWithoutRedirect()` - for click handlers
- Implemented `revalidatePath()` for cache invalidation

### Phase 3: Client Component with useActionState ✅
- Updated `CitySelector.tsx` to use `useActionState`
- Created `SubmitButton` component with `useFormStatus`
- Removed `useState`, `useEffect`, `fetch()` patterns
- Progressive enhancement: works without JavaScript

### Phase 4: Server Component with Inline Actions ✅
- Converted `RecentSearches.tsx` to Server Component
- Added inline Server Action for city clicks
- Each city button is a form (progressive enhancement)
- Removed client-side state management

### Phase 5: Cleanup ✅
- Removed `app/api/cities/recent/route.ts` (API Route)
- Removed entire `app/api/` directory
- Updated README.md for POC #4
- All code tested locally

## Commits

Clean git history:
1. `Initial commit - forked from POC #3 (nextjs-dynamic-routes)`
2. `Add Server Actions with React 19 form hooks`

Each commit represents a complete working state.

**GitHub:** TBD (will be created after deployment)

## Key Learnings

### When to Use Server Actions

✅ **Use Server Actions for:**
- Form submissions
- Data mutations (create, update, delete)
- Actions triggered by user interaction
- When you want progressive enhancement

❌ **Don't use Server Actions for:**
- Third-party webhooks (use API Routes)
- Public REST API (use API Routes)
- Real-time data fetching (use React Query/SWR)

### Server Action Patterns

**Pattern 1: Separate file with 'use server'**
```tsx
// app/actions.ts
'use server';

export async function myAction() {
  // All exports are Server Actions
}
```

**Pattern 2: Inline in Server Component**
```tsx
// app/page.tsx (Server Component)
export default function Page() {
  async function handleSubmit(formData: FormData) {
    'use server';
    // Inline Server Action
  }
  
  return <form action={handleSubmit}>...</form>;
}
```

**Pattern 3: Called from Client Component**
```tsx
// app/actions.ts
'use server';
export async function myAction() { ... }

// app/component.tsx
'use client';
import { myAction } from './actions';

export function Component() {
  const [state, formAction] = useActionState(myAction, null);
  return <form action={formAction}>...</form>;
}
```

### Progressive Enhancement Checklist

- ✅ Use `<form action={serverAction}>` (not `onSubmit`)
- ✅ Use native `<button type="submit">` (not `onClick`)
- ✅ Add `name` attributes to all inputs
- ✅ Use `required` for required fields (HTML5 validation)
- ✅ Server Action handles FormData (not JSON)
- ✅ Test with JavaScript disabled

## Part of Next.js POC Series

This is POC #4 in a series exploring Next.js App Router patterns:
1. ✅ **Next.js SSR Basics** - Server-Side Rendering fundamentals
2. ✅ **Interactive Weather Dashboard** - Client Components + API Routes
3. ✅ **Dynamic Routes Weather Dashboard** - File-based routing patterns
4. ✅ **Server Actions + Forms** ← You are here
5. 🔄 **ISR/SSG Strategies** - Static generation + revalidation
6. 🔄 **Route Groups** - Organizing routes without URL changes
7. 🔄 **Optimizations** - Image, Script, Bundle analysis
8. 🔄 **Advanced Routing** - Parallel + Intercepting Routes
9. 🔄 **Auth + Middleware** - NextAuth.js + protected routes
10. 🔄 **Database Integration** - Firestore + Server Components

---

**Learning focus:** Server Actions, React 19 form hooks, progressive enhancement, type-safe mutations  
**Status:** ✅ Complete (local development)  
**Production URL:** TBD (deployment pending)  
**Repository:** TBD (GitHub push pending)  
**Next POC:** #5 - ISR/SSG Strategies
