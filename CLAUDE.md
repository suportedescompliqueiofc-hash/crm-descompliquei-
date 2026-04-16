# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start development server (Vite)
npm run build      # Production build
npm run build:dev  # Development build
npm run lint       # Run ESLint
npm run preview    # Preview production build locally
```

There are no automated tests configured in this project.

## Architecture Overview

This is a **multi-tenant WhatsApp CRM** (SaaS white-label) built on React + Vite + TypeScript + Supabase.

### Multi-tenancy

Every user belongs to an `organization_id` stored in their profile (`perfis` table). All data queries **must** be scoped by `organization_id`. The `useProfile` hook (`src/hooks/useProfile.ts`) is the source of `organization_id` — it auto-creates an org and profile on first login.

### Data Layer

All Supabase interactions go through **TanStack Query custom hooks** in `src/hooks/`. Never query Supabase directly from components. Pattern:
- Queries use `useQuery` with `['key', orgId]` cache keys
- Mutations use `useMutation` with `queryClient.invalidateQueries` on success
- Global QueryClient is configured with `staleTime: 5min` and `refetchOnWindowFocus: false` (see `App.tsx`)

### Realtime

Several hooks subscribe to Supabase Realtime (`postgres_changes`) and update the query cache directly via `queryClient.setQueryData` to avoid unnecessary re-fetches. See `useConversations.ts` for the pattern.

### Backend (Edge Functions)

Supabase Edge Functions (Deno, TypeScript) live in `supabase/functions/`. Key functions:
- `receive-message` — webhook endpoint for UaZAPI (WhatsApp) incoming messages
- `whatsapp-ai-agent` — AI auto-reply agent
- `process-cadences` — scheduled cadence message dispatcher
- `process-scheduled-messages` — cron for timed messages
- `send-quick-message` — sends WhatsApp messages via UaZAPI
- `manage-whatsapp` — WhatsApp connection management

### White-label Branding

`BrandingContext` (`src/contexts/BrandingContext.tsx`) loads per-org branding from `organization_branding` table and applies it to CSS variables on the DOM root. This controls colors, logo, favicon, and app title at runtime.

### Routing

All routes are defined in `src/App.tsx`. Every route is wrapped in `<ProtectedRoute>` + `<AppLayout>`. The `/conversas` page is special — it has no padding (full-bleed layout) and is detected via `location.pathname.startsWith('/conversas')`.

### UI Rules (from AI_RULES.md)

- **Components**: Always use `shadcn/ui` from `@/components/ui`. No custom CSS files or inline styles.
- **Styling**: Only Tailwind CSS utility classes.
- **Icons**: Only `lucide-react`.
- **Notifications**: Only `sonner` — `import { toast } from 'sonner'`.
- **Charts**: Only `recharts`.
- **Drag & drop**: Only `@dnd-kit`.
- **Forms**: `react-hook-form` + `zod`.
- **Client state**: `useState`/`useContext` only — no Redux, Zustand, etc.

### Key Tables (Portuguese naming convention)

- `perfis` — user profiles (linked to `auth.users`)
- `organizations` — tenants
- `leads` — contacts/leads
- `mensagens` — WhatsApp messages
- `estagios` — pipeline stages
- `cadencias` — message cadence sequences
- `organization_branding` — white-label settings per org
- `usuarios_papeis` — user roles (`admin`, `atendente`)
