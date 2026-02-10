# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Social media content publisher — a React 19 + TypeScript + Vite web application. Early stage, scaffolded with a comprehensive shadcn/ui component library.

## Commands

```bash
bun run dev        # Start dev server with HMR
bun run build      # TypeScript check + Vite production build
bun run lint       # ESLint
bun run preview    # Preview production build locally
```

Package manager is **Bun** (not npm/yarn).

No test framework is configured yet.

## Architecture

- **Entry**: `index.html` → `src/main.tsx` → `src/App.tsx`
- **UI components**: `src/components/ui/` — shadcn/ui (new-york style, Radix UI primitives, CVA variants)
- **Hooks**: `src/hooks/` (e.g., `use-mobile.ts` for 768px breakpoint detection)
- **Utilities**: `src/lib/utils.ts` — `cn()` helper (clsx + tailwind-merge)
- **Routing**: TanStack React Router
- **Forms**: React Hook Form + Zod validation via `@hookform/resolvers`
- **Theming**: CSS variables (oklch color space) with dark mode support via `next-themes`; Tailwind CSS 4 with `@tailwindcss/vite` plugin
- **Charts**: Recharts
- **Notifications**: Sonner toasts

## Key Conventions

- Path alias: `@/*` → `./src/*`
- TypeScript strict mode with `noUnusedLocals` and `noUnusedParameters`
- React Compiler enabled via Babel plugin
- Components use `data-slot` attributes for styling hooks
- shadcn/ui config in `components.json` — add new components with `bunx shadcn@latest add <component>`
