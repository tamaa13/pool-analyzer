# PancakeSwap Pool Analyzer

Full-stack toolkit that inspects PancakeSwap v3 liquidity, scores its health, and generates AI commentary. The mono-repo is split into:

- **apps/api** – Express server that pulls pool data, computes liquidity metrics, and calls the AI provider.
- **apps/web** – Next.js dashboard with search, filtering, and insight visualisations.
- **apps/indexer** – Ponder project for running a self-hosted PancakeSwap v3 indexer (optional).
- **packages/shared** – Shared TypeScript contracts/interfaces.

```
/pool-analyzer
├── apps
│   ├── api        # REST API + AI pipeline
│   ├── web        # Next.js UI
│   └── indexer    # Optional Ponder indexer
├── packages
│   └── shared     # Shared DTOs
└── …
```

## System overview

1. **Pool discovery** – By default the API queries the PancakeSwap v3 public subgraph (factory `0x1097053Fd2ea711dad45caCcc45EfF7548fCB362`). It normalises prices/TVL/volume, estimates depth (±1 % / ±5 %), and derives heuristics (APR, stability, concentration).
2. **AI analysis** – `/api/analyze/:token` enriches those metrics with rule-based scoring and, when `AI_API_KEY` is present, forwards the payload to OpenRouter for natural-language commentary.
3. **Frontend** – The Next.js dashboard consumes the API, offers token/pool lookup with suggestions, shows AI/risk factors, and lets users filter by fee tier, TVL, APR, depth, and stable/volatile pairs.
4. **Optional indexer** – A Ponder project is bundled for users who want up-to-date data. It consumes on-chain events directly, at the cost of longer bootstraps and the need for archive RPC access.

> ⚠️ **Data freshness caveat**  
> The hosted PancakeSwap subgraph can lag behind mainnet blocks. TVL/volume may differ from the official UI. Running the Ponder indexer yields fresher data, but note:
> - Initial sync replays every v3 factory event; expect long runtimes.
> - Premium/archival BSC RPC is required to avoid rate limits.
> - USD valuations for some pairs still need oracle pricing, so early indexer runs may show incomplete TVL/APR until oracle integration is added.

## AI metrics & scoring

The analyzer compiles a consistent feature set for both heuristic scoring and LLM prompts:

- **Total liquidity (TVL)** – aggregates USD liquidity across pools and applies tiered scoring (deep / adequate / thin).  
- **Liquidity concentration** – measures how much liquidity sits in the top pool to expose single-pool dependency.  
- **Depth ±1 % / ±5 %** – estimates slippage tolerance for small moves; shallow depth triggers risk flags.  
- **24 h volume & APR** – highlights active pools with fee generation, penalises idle liquidity.  
- **Stablecoin coverage** – rewards pools paired with stables; volatile-only pairs surface as higher risk.  
- **USD pricing availability** – checks whether each pool has a trustworthy USD quote; missing quotes reduce confidence.  
- **Pool diversity** – counts active fee tiers to gauge redundancy and fallback routing.

These metrics roll up into a 0–100 liquidity health score with labelled positive/negative factors. When AI is enabled, the same dataset is sent to the model to synthesize opportunities, risks, and per-pool sentiment.

## Quick start

```bash
cp .env.example .env
# edit .env to supply subgraph credentials, optional AI keys, and RPC details

npm install
npm run dev            # launches API on :4000 and web on :3000
```

The UI will preload recent pools. Use the search box to enter a token or pool address.

### Optional: run the Ponder indexer

```bash
# 1) Start Postgres (or use SQLite out of the box)
docker run -d --name ponder-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ponder \
  -p 5432:5432 postgres:15

# 2) Configure apps/indexer/.env.local
PONDER_RPC_URL=https://bsc-archive.rpcprovider.com  # not recomended using public rpc
PONDER_START_BLOCK=28269140                 # v3 factory deployment
PONDER_DATABASE_URL=postgres://postgres:postgres@localhost:5432/ponder # adjust with your db

# 3) Run the indexer
npm run dev:indexer
```

Switch the API to point at your local indexer by setting `PONDER_GRAPHQL_URL` and updating `PONDER_MODE=local` inside `apps/api/.env` (if you add that toggle). Remember: indexing from genesis may take hours and requires a robust RPC.

## Environment variables

| Variable | Scope | Description |
| --- | --- | --- |
| `PORT` | API | Express port (default `4000`) |
| `CHAIN_ID` | API | Chain id (`56` for BSC) |
| `RPC_URL_BSC` | API | RPC fallback for WBNB price lookups |
| `PANCAKE_V3_FACTORY` | API/Indexer | Factory address |
| `PANCAKE_V3_FEE_TIERS` | API | Fee tiers to inspect |
| `SUBGRAPH_URL` | API | PancakeSwap v3 subgraph endpoint |
| `SUBGRAPH_AUTH_HEADER`, `SUBGRAPH_AUTH_TOKEN` | API | Optional auth header + token when using the official gateway |
| `PRICE_WBNB_USD` | API | Manual WBNB price override (used when subgraph lacks pricing) |
| `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`, `OPENROUTER_BASE_URL` | API | AI provider configuration |
| `NEXT_PUBLIC_API_BASE_URL` | Web | URL used by the frontend to call the API |

Indexer-specific:

| Variable | Description |
| --- | --- |
| `PONDER_RPC_URL` | Archive RPC (required for full replay) |
| `PONDER_START_BLOCK` | Starting block number |
| `PONDER_DATABASE_URL` | Postgres/SQLite DSN |

## Useful scripts

- `npm run dev` – Start API + web app concurrently.
- `npm run dev:api`, `npm run dev:web` – Run API or web individually.
- `npm run dev:indexer` – Launch the Ponder indexer (optional).
- `npm run build` – Build every workspace.
- `npm run lint`, `npm run typecheck` – Static quality gates.
- `npm test` – Backend tests (if present).

## REST quick reference

```bash
# List recent pools (default fee tiers)
curl http://localhost:4000/api/pools

# Pools for a token address
curl http://localhost:4000/api/pools/0xe9e7cea3dedca5984780bafc599bd69add087d56

# AI/liquidity analysis for a token
curl http://localhost:4000/api/analyze/0xe9e7cea3dedca5984780bafc599bd69add087d56

# Search tokens / pools by symbol/name/address
curl "http://localhost:4000/api/tokens/search?q=wbnb"
```

## Known limitations

- **Subgraph staleness** – The public PancakeSwap subgraph may trail behind the chain; metrics might not be real-time.
- **Indexer completeness** – The bundled Ponder indexer improves freshness but needs a premium BSC archive RPC and additional oracle logic to produce perfect USD valuations for every pool. Initial sync replays millions of events and can take significant time.
- **Depth approximation** – Liquidity depth is estimated from proportional TVL. Concentrated liquidity can deviate from these simplified buckets.

## Deliverables checklist

- ✅ Express API with DEX integration & AI insights.
- ✅ Next.js frontend with search, filtering, and health dashboards.
- ✅ Optional Ponder indexer for fresher data (with caveats above).
- ✅ This README documents setup, caveats, and useful commands.
