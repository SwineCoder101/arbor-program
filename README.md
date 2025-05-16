# 🌳 Arbor Program

**On-chain router that escrows user margin, opens/maintains delta-neutral perp positions on Drift & Jupiter, and takes a single closing fee.**


Arbor is a Solana-native router that lets users open one-click, delta-neutral hedges: it escrows their USDC, goes long on one perp DEX and short on another, harvests the funding-rate spread, and charges a flat 1 % fee only when the position is closed—no custody, no price risk, fully on-chain.

---

| Cluster | Program ID | Explorer |
|---------|------------|----------|
| devnet  | `AAJosF3mpieT9UwnTv7B9B1mR7TVm37xSKPP87kppKoL` | [view](https://explorer.solana.com/address/AAJosF3mpieT9UwnTv7B9B1mR7TVm37xSKPP87kppKoL?cluster=devnet) |

---

## ✨  Why Arbor?

* **Escrow-first design** – Each order gets two PDA “vaults” (one per DEX) so user funds never mingle.  
* **Flat 1 % closing fee** – No management / performance skim; fee is moved to the **Treasury** only when the hedge is closed.  
* **Minimal surface** – Seven core instructions, single `GlobalConfig`, single `Treasury` ATA.

---

## 📚 Instruction Glossary

| Ix | Role | What it does |
|----|------|--------------|
| `initialize_config` | **Admin** | Create `GlobalConfig` + `ProgramAuthority` PDAs. |
| `withdraw_from_treasury` | **Admin** | Move USDC fees out of the Treasury vault. |
| `create_order` | **Trader** | Mints an `Order` PDA and deposits USDC into Drift & Jupiter vaults. |
| `create_protocol_vaults` | **Trader** | Lazily initialises the PDA token vaults for a given order. |
| `top_up_order` | **Trader** | Adds extra USDC to either DEX vault. |
| `claim_yield` | **Trader / Keeper** | Skims realised funding PnL from Drift & Jupiter into the user’s wallet. |
| `close_order` | **Trader** | Closes both perp legs, transfers 1 % of margin to Treasury, sends remainder to trader. |
| `keeper_withdraw` | **Keeper bot** | Emergency vault drain when DEX liquidates legs. |


---


### Key Folders

| Folder | Highlight |
|--------|-----------|
| **`programs/arbor_program/src/`** | `instructions.rs` (handlers) · `state.rs` (PDAs) |
| **`sdk/`** | `index.ts` exports `ArborClient` (create/top-up/close helpers) |
| **`simulate/`** | End-to-end TypeScript scripts numbered `1_*.ts` – create local keypairs, airdrop, create order, generate yield, top-up, claim, close, admin withdraw. |
| **`tests/`** | Anchor program-test with dummy Drift/Jupiter mocks; CI ensures accounts, bumps and fee logic are correct. |

---

## 🚀 Quick Start

```bash
# 1. Build & test
anchor test

# 2. Run devnet simulation (requires devnet RPC + airdrop)
cd simulate
yarn ts-node 1_initialize_environment.ts
yarn ts-node 2_create_order_trader.ts
...

# 3. Use the SDK
```
import { ArborClient } from '@arbor/sdk'
const arbor = await ArborClient.connect(devnetConnection, wallet)
await arbor.createOrder({ jupNotional: 5_000, driftNotional: 5_000, ... })
```
