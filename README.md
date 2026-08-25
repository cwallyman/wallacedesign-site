# wallacedesign-site

Scaffold for hosting multiple static webapps on GitHub Pages.

Structure:
- `docs/` - published root for GitHub Pages
- `docs/apps/<app>/` - static app folders
- `docs/CNAME` - your custom domain (`wallacedesign.org`)
- `cloudflare/septa-next-trains-proxy/` - Worker for the Next Trains live API proxy

How to use:
1. Initialize a Git repo in this folder and push to GitHub.
2. In GitHub repository settings -> Pages, select `docs/` as the publish source.
3. Ensure `docs/CNAME` contains `wallacedesign.org` and add the DNS records described in `docs/DNS-INSTRUCTIONS.md`.

to update to github
cd into the repo root
git status
git add docs/index.html docs/assets "docs/apps/next trains"
git commit -m "Update homepage styling and app icons"
git push

Cloudflare Worker deploy for Next Trains
cd into `cloudflare/septa-next-trains-proxy`
wrangler deploy
