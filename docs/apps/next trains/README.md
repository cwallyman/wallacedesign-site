# SEPTA Next Trains

Small static web app that shows the next 3 SEPTA Regional Rail trains between:

- Market East (`Jefferson Station (Market East)`)
- Paoli

## Run locally

Start the local server:

```bash
cd "docs/apps/next trains"
python3 server.py
```

Then open `http://127.0.0.1:8000`.

## Publish on wallacedesign.org

`wallacedesign.org` is hosted as a static GitHub Pages site, so the live SEPTA lookup needs a separate proxy.

This repo now includes a Cloudflare Worker proxy at:

`cloudflare/septa-next-trains-proxy`

The public app is configured to call:

`https://api.wallacedesign.org/api/next-trains`

### Deploy the proxy

1. Install Wrangler if needed:

```bash
npm install -g wrangler
```

2. Log in to Cloudflare:

```bash
wrangler login
```

3. Deploy from the worker folder:

```bash
cd "cloudflare/septa-next-trains-proxy"
wrangler deploy
```

4. In Cloudflare DNS, make sure `api.wallacedesign.org` is routed through Cloudflare and points at the Worker route.

5. Push the `docs/` changes to GitHub Pages.

## Notes

- The app uses SEPTA's official `Next To Arrive` endpoint.
- A tiny Python proxy avoids browser issues reaching the older SEPTA API directly.
- The page now also falls back to the local proxy if it is opened from another local site or directly from disk.
- On `wallacedesign.org`, the app uses the Cloudflare Worker proxy at `api.wallacedesign.org`.
- It requests 3 results and supports swapping the route direction.
- Auto-refresh runs every 30 seconds by default.
