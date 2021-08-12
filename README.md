# ardislu.dev

This is the frontend for [my personal blog](https://ardislu.dev).

Also check out my [main website](https://ardis.lu)!

## Google Sheets and Google Docs as a Content Management System (CMS)

I'm using Google Sheets and Google Docs as the CMS for this website. A Google Sheet stores the content for the cards on the homepage. Then, each blog post is contained in its own separate Google Doc. Both the Google Sheet and the Google Docs are queried through a Google Apps Script proxy web server ([google-api-proxy](https://github.com/ardislu/google-api-proxy)). The proxy allows anonymous queries to the Google Sheets/Docs APIs (which normally require OAuth 2.0 authorization, even for publicly available documents).

## Google Doc -> markdown -> HTML

Once I fetch an article from the Google Docs API, the article is converted into markdown then converted into HTML using [marked](https://marked.js.org).

## 404.html as a router

Cloudflare Pages automatically redirects any `HTTP 404 Not Found` to `404.html` if it exists. I'm using `404.html` as a router for the blog posts dynamically fetched from the Google Sheet. Here's how to replicate Cloudflare Pages' treatment of `404.html` on a local development server:

1. Install Node.js (this is ONLY used for the web server; the website itself does not use Node.js)

2. `npm i -g local-web-server`

3. `ws --rewrite '/posts/:id -> 404.html'`
