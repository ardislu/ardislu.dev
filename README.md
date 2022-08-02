# ardislu.dev

This is the frontend for [my personal blog](https://ardislu.dev).

Also check out my [main website](https://ardis.lu)!

## Google Sheets and Google Docs as a Content Management System (CMS)

I'm using Google Sheets and Google Docs as the CMS for this website. A Google Sheet stores the content for the cards on the homepage. Then, each blog post is contained in its own separate Google Doc. Both the Google Sheet and the Google Docs are queried through a Cloudflare Worker proxy (`/functions/api`). The proxy inserts service account credentials so the Google Sheets/Docs APIs can be called (Google APIs require OAuth 2.0 authorization, even for publicly available documents).

## Google Doc -> markdown -> HTML

Once I fetch an article from the Google Docs API, the article is converted into markdown then converted into HTML using [marked](https://marked.js.org).

## Local development

Use the `wrangler` CLI to serve the static frontend and API at the same time.

1. Copy `.dev.vars.example` and rename it to `.dev.vars`. Provide an email and private key for a service account with access to the Google Docs and Google Sheet.

2. `npx wrangler pages dev .`
