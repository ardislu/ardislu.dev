# ardislu.dev

This is the frontend for [my personal blog](https://ardislu.dev).

Also check out my [main website](https://ardis.lu)!

## Google Sheets and Google Docs as a Content Management System (CMS)

I'm using Google Sheets and Google Docs as the CMS for this website. A Google Sheet stores the content for the cards on the homepage. Then, each blog post is contained in its own separate Google Doc. Both the Google Sheet and the Google Docs are queried through a Google Apps Script proxy web server ([google-api-proxy](https://github.com/ardislu/google-api-proxy)). The proxy allows anonymous queries to the Google Sheets/Docs APIs (which normally require OAuth 2.0 authorization, even for publicly available documents).

## Google Doc -> markdown -> HTML

Once I fetch an article from the Google Docs API, the article is converted into markdown then converted into HTML using [marked](https://marked.js.org).

## Serving actual 404 errors for invalid routes while still being a SPA 

Cloudflare Pages automatically redirects any invalid routes in a directory to `404.html` if there is a `404.html` that exists in that directory. Since there's no `404.html` in the root, Cloudflare Pages will redirect all routes to `index.html`.

I do a client-side redirect to `/errors/NotFound` for any routes that should have actually been a `404`, which Cloudflare Pages then serves a `404` with `/errors/404.html`.

Here's how to replicate this behavior locally:
1. Install Node.js (this is ONLY used for the web server; the website itself does not use Node.js)
2. `npm i -g local-web-server`
3. `ws --spa index.html --rewrite '/errors/(.*) -> /errors/404.html'`

## Local development

**Update March 2022**: the following will work locally, but does not work when deployed to Cloudflare Pages (https://github.com/cloudflare/wrangler2/issues/710). I'm providing the steps below for future reference once the issue is resolved.

Use the `wrangler` CLI to serve the static frontend and API at the same time. Provide credentials for a service account with access to the Google Docs as environment variables.

From the [Cloudflare Pages documentation](https://developers.cloudflare.com/pages/platform/functions/#develop-and-preview-locally):

1. `npm i wrangler@beta`

2. `npx wrangler pages dev . --binding EMAIL="example@example.com" PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...EXAMPLE...\n-----END PRIVATE KEY-----\n" SCOPES="https://example.com/auth/scope1 https://example.com/auth/scope2"`
