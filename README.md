# eve.fit

A ship fitting simulator for EVE Online. Build and theorycraft fittings in the browser with real-time stats, skill support, and EVE SSO integration.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![React](https://img.shields.io/badge/React-19-61dafb)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Ship fitting** — Select any published ship and fit modules into high/mid/low/rig/subsystem slots
- **Module search** — Fuzzy search across all EVE modules, drones, and subsystems via an indexed ESI catalog
- **Fill slots** — Double-click a module to fill all empty slots of that type, respecting turret/launcher hardpoint limits
- **Real-time stats** — CPU, powergrid, capacitor simulation, EHP, DPS, navigation, and targeting stats update live as you fit
- **Skill bonuses** — Toggle between No Skills, All Level V, or your character's actual skills to see base vs. skilled stat deltas
- **EFT import/export** — Paste EFT format fittings to import; export your builds to EFT for sharing or importing in-game
- **EVE SSO login** — Authenticate with your EVE character to read skills and save/load fittings to your account
- **Local persistence** — Fittings auto-save to localStorage so nothing is lost between sessions
- **Dark EVE theme** — Purpose-built dark UI with EVE's slot color system (gold high, blue mid, green low, purple rig)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router, Turbopack) |
| UI | [React 19](https://react.dev/), [TypeScript 5](https://www.typescriptlang.org/) (strict) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) with CSS custom properties |
| State | [Zustand 5](https://zustand.docs.pmnd.rs/) |
| Data fetching | [TanStack React Query 5](https://tanstack.com/query) |
| Icons | [Lucide React](https://lucide.dev/) |
| Search | [Fuse.js](https://www.fusejs.io/) |
| Auth | EVE SSO OAuth2 + PKCE, JWT verification via [jose](https://github.com/panva/jose) |
| Data source | [EVE ESI API](https://esi.evetech.net/ui/) |

## Getting Started

### Prerequisites

- Node.js 18+
- An EVE Online developer application ([create one here](https://developers.eveonline.com/))

### EVE SSO App Setup

1. Go to [developers.eveonline.com](https://developers.eveonline.com/) and create a new application
2. Set the callback URL to `http://localhost:3000/api/auth/callback`
3. Add these scopes:
   - `esi-fittings.read_fittings.v1`
   - `esi-fittings.write_fittings.v1`
   - `esi-skills.read_skills.v1`
   - `esi-location.read_ship_type.v1`
   - `esi-search.search_structures.v1`

### Environment Variables

Create a `.env.local` file in the project root:

```env
EVE_SSO_CLIENT_ID=your-client-id
EVE_SSO_CLIENT_SECRET=your-client-secret
EVE_SSO_CALLBACK_URL=http://localhost:3000/api/auth/callback
AUTH_SESSION_SECRET=your-64-char-hex-string
```

Generate the session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Install and Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Run production server |
| `npm run lint` | ESLint check |

## Project Structure

```
app/
  page.tsx                          Main page (renders FittingPage)
  layout.tsx                        Root layout (QueryProvider, AuthProvider)
  globals.css                       Tailwind v4 theme + CSS custom properties
  api/
    auth/{login,callback,logout,session}/   EVE SSO OAuth2 routes
    esi/[...path]/                          Authenticated ESI proxy

components/
  fitting/
    FittingPage.tsx                  Main layout: ship selector, slots, stats
    ShipSelector.tsx                 Ship search + popular ships
    FittingHeader.tsx                Ship info, fit name, export/save buttons
    SlotRack.tsx                     Renders slot columns by type
    SlotItem.tsx                     Individual module slot with state toggle
    ModuleSearch.tsx                 Searchable module picker sidebar
    StatsPanel.tsx                   Ship stats display with skill deltas
    SkillModeToggle.tsx              No Skills / All V / My Skills toggle
    EFTImportModal.tsx               Paste EFT text to import fittings
  providers/
    QueryProvider.tsx                TanStack Query provider
    AuthProvider.tsx                 EVE SSO auth context

lib/
  esi.ts                Ship/module/type ESI client with in-memory cache
  stats.ts              Ship stats calculator (CPU, PG, EHP, cap, DPS, nav, targeting)
  skills.ts             Skill bonus application + delta calculation
  eft-parser.ts         EFT format parser and serializer
  auth.ts               EVE SSO: PKCE, JWT verification, AES-256-GCM cookie encryption
  constants.ts          Dogma attribute IDs, category/group IDs, slot effect IDs
  utils.ts              Formatters, slot helpers, cap simulation, localStorage CRUD
  hooks/
    useCharacterSkills.ts   TanStack Query hook for fetching character skills

store/
  fitting-store.ts      Zustand store: fitting state, module CRUD, skill mode, persistence

types/
  eve.ts                Core types (EveType, Fitting, ShipStats, SkillMap, etc.)
  auth.ts               Auth types (AuthSession, EveCharacter, ESISkillsResponse)
```

## Architecture

### State Management

A single Zustand store (`fitting-store.ts`) owns the fitting, ship type, computed stats, and skill state. All mutations clone the fitting via `JSON.parse(JSON.stringify())` and recompute stats through a `computeStatsWithSkills` pipeline:

```
calculateShipStats(base) -> applySkillBonuses(stats, skillMap) -> { stats, skillDeltas }
```

### ESI Integration

- **Public endpoints** (no auth): type lookups, group/category fetching, name resolution
- **Authenticated endpoints** (via proxy): character fittings, skills, search
- All ESI responses are cached in-memory with 1-hour TTL
- The ESI proxy (`/api/esi/[...path]`) validates session, auto-refreshes tokens, and allowlists specific paths

### Skill System

Three modes with live stat comparison:

| Mode | Behavior |
|------|----------|
| **No Skills** | Raw base stats from ship + modules |
| **All V** | All support skills at level 5 (default) |
| **My Skills** | Fetches your character's trained skill levels via ESI |

12 support skills are modeled: CPU Management, Power Grid Management, Capacitor Management, Cap Systems Operation, Shield Management, Hull Upgrades, Mechanics, Navigation, Evasive Maneuvering, Target Management, Long Range Targeting, and Signature Analysis.

### Module Search

The module search builds an in-memory index on first use by:
1. Fetching all groups from the Module, Drone, and Subsystem categories via ESI
2. Bulk-resolving type names via `POST /universe/names/`
3. Substring matching with starts-with priority

The index is cached for the session lifetime. First search takes a few seconds to build; subsequent searches are instant.

## Contributing

Contributions are welcome. Please open an issue first to discuss what you'd like to change.

## License

[MIT](LICENSE)

## Legal

EVE Online and all related trademarks are property of CCP hf. This project is not affiliated with or endorsed by CCP hf. All EVE data is sourced from the [EVE Swagger Interface (ESI)](https://esi.evetech.net/).
