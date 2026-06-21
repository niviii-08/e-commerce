# Multi-Vendor Ecommerce Platform — Frontend + Backend

```
.
├── frontend/      ← your original UI, unchanged (HTML/CSS/Bootstrap)
└── backend/       ← Supabase backend: schema, security, and JS wiring examples
```

**Start here:** [`backend/README.md`](./backend/README.md) — 10-minute setup, ER diagram, and
how to connect the frontend to it.

Quick summary: paste `backend/sql/schema.sql` into your Supabase project's SQL Editor, drop your
Project URL + anon key into `backend/integration-examples/supabase-client.js`, then copy the
example scripts into `frontend/` and wire them into the relevant pages (each file says exactly
which page/button it's for).
