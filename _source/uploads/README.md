# Claude Project Context Pack

Safe, non-secret context for redesigning Selorg frontends (and understanding the backend) with Claude.

## Contents

| Path | Source project |
|------|----------------|
| [MASTER_ARCHITECTURE.md](./MASTER_ARCHITECTURE.md) | System-wide relationships |
| [customer-app/](./customer-app/) | `Customer-App-v2` |
| [rider-app/](./rider-app/) | `Rider-app-v2` |
| [picker-app/](./picker-app/) | `picker-app-v2` |
| [hhd-app/](./hhd-app/) | `HHD-App-v2` |
| [admin-dashboard/](./admin-dashboard/) | `selorg-dashboard-frontend-v1.2` |
| [backend/](./backend/) | `selorg-backend-v1.2` (docs only — no source) |

Each project folder contains:

- `README.md`
- `PROJECT_ARCHITECTURE.md`
- `package.json` (**exact copy** from source)
- `.env.example` (variable names + placeholders only)

## How to use with Claude

1. Attach the **app source** you want redesigned (exclude real `.env`, keystores, private keys).
2. Attach the matching folder under `claude-project-context/`.
3. Attach `MASTER_ARCHITECTURE.md`.
4. Prefer also attaching `backend-frontend-documentation/` for API/workflow contracts.
5. Do **not** attach backend source if the task is frontend-only.

## Safety

- No real secrets
- No backend application source in this pack
- No invented endpoints or package IDs
