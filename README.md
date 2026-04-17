# Ebunker × Lido stVaults Integration

This repository contains the **complete source code for the Ebunker × stVaults
integration** — the part of the Ebunker platform that lets users create and
manage Lido V3 Staking Vaults.

It has been carved out from the wider (closed-source) Ebunker codebase and
published here for transparency and review. Other parts of Ebunker — native
validator staking, pool dashboards, operator tooling, internal services — are
**not** included.

## What is a stVault?

A [Lido V3 Staking Vault](https://docs.lido.fi/) is a user-owned smart contract
that runs Ethereum validators under a node operator. The owner deposits ETH,
optionally mints stETH against the vault's value, and can withdraw subject to
health-factor constraints. Ebunker acts as the node operator, so users get
Ebunker's infrastructure while retaining custody of their vault.

## Repository layout

```
.
├── app/        Next.js frontend — user-facing stVault UI (stake, mint,
│               repay, withdraw, create-vault flow)
└── server/     Django backend — auth, transaction construction, contract
                calls, scheduled on-chain syncing
```

Each subdirectory has its own README with setup instructions.

## Architecture

```
┌──────────────────┐   signed tx   ┌─────────────────┐
│ Next.js frontend │──────────────▶│  User's wallet  │
│  (app/)          │               │  (RainbowKit)   │
└──────┬───────────┘               └────────┬────────┘
       │ REST                               │ broadcast
       ▼                                    ▼
┌──────────────────┐  web3 read/  ┌────────────────────────┐
│ Django backend   │──────────────▶│  Ethereum + Lido stVault│
│ (server/)        │    contract  │   contracts (Dashboard, │
│                  │    calls     │   Vault, VaultHub, PDG, │
│                  │              │   LazyOracle, stETH)    │
└──────────────────┘              └────────────────────────┘
```

- **Frontend** connects the user's wallet, shows vault state, builds the
  payloads the user signs, and submits the resulting transaction.
- **Backend** holds auth (wallet signature + JWT), builds transaction payloads
  from user requests, reads on-chain state, and runs scheduled jobs that keep
  vault metadata in sync.
- **User keys never leave the wallet.** The backend only constructs unsigned
  transaction data and returns it for the frontend to have the user sign.

Core contract services live under
[`server/validators/contract/stvault/`](server/validators/contract/stvault/):

| Module | Responsibility |
|---|---|
| `create.py` | Deploy new vault + dashboard |
| `dashboard.py` | Fund, withdraw, mint stETH, repay, request exits |
| `vault.py` | Read vault state (withdrawal credentials, owner, etc.) |
| `vaulthub.py` | VaultHub view calls |
| `pdg.py` | Predeposit Guarantee flow (operator-side) |
| `lazyoracle.py` | Oracle report fetching |
| `steth.py` | stETH share / pooled-ETH conversions, allowance |
| `stvault.py` | Higher-level orchestration + refresh |
| `task.py` | Scheduled jobs (event scan, APR update, health checks) |

## Getting started

- Frontend: see [`app/README.md`](app/README.md)
- Backend: see [`server/README.md`](server/README.md) and
  [`server/.env.example`](server/.env.example) for required env vars

> ⚠️ This repo is published for **review and reference**.

## Networks

The backend supports multiple networks via the `BACKEND_NETWORK` env var.
Contract addresses per network are defined in
[`server/validators/contract/stvault/config.py`](server/validators/contract/stvault/config.py).
Currently wired up:

- **mainnet** — Ethereum mainnet
- **hoodi** — Hoodi testnet (Lido V3 staging)
