# SEPTA Next Trains

Small static web app that shows the next 3 SEPTA Regional Rail trains between
any two stations on the Paoli/Thorndale, Manayunk/Norristown, West Trenton and
Trenton lines (default: Jefferson to Paoli).

### Station search

Each field (origin and destination) has a search box above its station
dropdown. Typing filters that dropdown to matching stations and selects the
best match: exact name first, then names starting with the text, then a word
starting with it. Matching ignores case and punctuation ("st davids" finds
St. Davids) and also checks SEPTA's API name ("market east" finds Jefferson).
Enter in a search box shows trains. Clearing it, swapping, or switching lines
brings back the full list. The dropdowns work as before.

### Cross-line trips

Origin and destination can be on different lines (e.g. Trenton to Paoli). The
line buttons pick the defaults and which line's stations are listed first; the
other lines' stations are listed below in their own groups. SEPTA's
`NextToArrive` API plans the connection itself and returns `isdirect: "false"`
with the second train (`term_train`, `term_depart_time`, `term_arrival_time`,
`Connection`, `term_delay`). Cards then show the final arrival time plus a
"Change at ..." section for the second train. Both proxies also add
`term_consist` / `term_car_count` for that second train.

It also has a "Regional Rail Alerts" page (`alerts.html`) that lists current
SEPTA advisories, alerts, and elevator outages for all 13 Regional Rail lines.

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
- The alerts page (`alerts.html`) calls a `/api/alerts` endpoint (served by both
  `server.py` locally and the Cloudflare Worker in production) that fetches
  SEPTA's `Alerts` endpoint, filters it down to `mode: "Regional Rail"`
  entries, and strips HTML out of the advisory/alert text before returning it.
