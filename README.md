SaaS Notes Application (Multi-tenant)

Overview
- Backend: Node.js + Express + MongoDB (Mongoose).
- Frontend: React (Vite).
- Multi-tenancy approach: Shared schema with tenantId column (referenced ObjectId). All tenant-scoped collections include tenantId and all queries enforce tenantId filtering. JWT embeds tenantId for isolation and also includes tenantSlug for convenience.

Features
- Tenants: Acme and Globex.
- Roles: admin (invite users, upgrade plan), member (notes CRUD only).
- Auth: JWT login.
- Subscription: free (max 3 notes) vs pro (unlimited). Upgrade endpoint: POST /tenants/:slug/upgrade.
- Notes CRUD: POST /notes, GET /notes, GET /notes/:id, PUT /notes/:id, DELETE /notes/:id.
- Health: GET /health -> {"status":"ok"}.
- CORS: enabled on server.

Project structure
- server/ : Express API, Mongo models, seed script.
- client/ : React app with Login, Nav, Notes pages.

Setup
1) Prereqs: Node 18+, MongoDB running locally.
2) Backend
   - cd server
   - copy .env.example .env (Windows) or cp .env.example .env (mac/Linux)
   - npm install
   - npm run seed (or: node index.js --seed) to create tenants and users
   - npm run dev
3) Frontend
   - cd client
   - npm install
   - npm run dev
   - Open the URL shown (typically http://localhost:5173)

Test accounts (password: password)
- admin@acme.test (Admin, tenant Acme)
- user@acme.test (Member, tenant Acme)
- admin@globex.test (Admin, tenant Globex)
- user@globex.test (Member, tenant Globex)

API Quick Reference
- GET /health -> { status: "ok" }
- POST /auth/login { email, password } -> { token, role, tenant }
- POST /users/invite (admin only) -> create user in same tenant with default password "password"
- POST /tenants/:slug/upgrade (admin only)
- POST /notes { title, content }
- GET /notes
- GET /notes/:id
- PUT /notes/:id { title?, content? }
- DELETE /notes/:id

Notes
- Multi-tenancy: All notes and users include tenantId. Middleware loadTenant fetches the tenant for the JWT's tenantId and all notes queries filter by tenantId.
- Plan gating: On create note, if tenant plan is free and current count >= 3, respond with 402 and error: note_limit_reached.
- CORS: Enabled to allow external scripts/dashboards.

Deployment
- Ensure MONGO_URI, JWT_SECRET, and PORT are set via environment variables.
- Serve client separately or behind a reverse proxy; client dev server proxies "/api" to backend.
