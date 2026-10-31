# AgriBridge V3 D1 migrations

Apply numbered SQL migration files in order. V3 currently starts with:

- `0001_ngo_secure.sql`: organisations/users, aggregate NGO metrics, anonymous follow-up references and audit events.

Cloudflare Pages requires a D1 binding named `NGO_DB` in **Workers & Pages → indian-agri-loans → Settings → Bindings**. The binding must be added to Production and Preview as appropriate, then the Pages project must be redeployed.

Do not seed real email addresses or organisation names in this repository. Insert the approved organisation users directly into your private D1 database after configuring Cloudflare Access.
