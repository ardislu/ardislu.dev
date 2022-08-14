import { marked } from 'https://cdn.jsdelivr.net/npm/marked@4.0.18/lib/marked.esm.min.js';
import hljs from 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.6.0/build/es/highlight.min.js';
import powershell from 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.6.0/build/es/languages/powershell.min.js';
hljs.registerLanguage('powershell', powershell);

/* Set up stale-while-revalidate cache strategy: if there's anything in the cache, return that immediately.
  Wait for the origin server's response in parallel and show the refresh toast if the cache changed. */
navigator.serviceWorker?.register('/sw.js'); // serviceWorker is disabled on Firefox Private Browsing
const cacheChannel = new BroadcastChannel('cache');
cacheChannel.addEventListener('message', e => {
  // Ignore static assets like logo.svg, style.css, script.js, etc. 
  if (new URL(e.data.resource).pathname === '/api' && e.data.isUpdated) {
    globalThis.components.get('toast').show();
  }
});
document.querySelector('dialog > button').addEventListener('click', _ => location.reload());

/* Global store for homepage metadata and HTML components. */
globalThis.metadata = new Map();
globalThis.components = new Map();

/* Call the CMS controller via Google Sheets API to get all post metadata. Returns a new Map object containing
  the metadata, using the post's path as the key. */
async function fetchPostMetadata() {
  const proxyUrl = '/api';
  const controllerId = '1pfGF8yBu3D0GPTezygLuzu3Cif8SkjhtG98nL-czlhc';
  const range = 'B3:I';
  const url = `${proxyUrl}?https://sheets.googleapis.com/v4/spreadsheets/${controllerId}/values/${range}`;
  const googleSheet = await fetch(url).then(r => r.json());

  const metadata = new Map();
  for (const row of googleSheet.values) {
    metadata.set(row[4], {
      title: row[0],
      description: row[1],
      id: row[2],
      linkText: row[3],
      createdDate: row[5],
      updatedDate: row[6],
      tags: row[7]
    });
  }

  return metadata;
}

/* Constructs the <main> element used on the homepage from the CMS metadata Map object. */
function buildHomeComponent(metadata) {
  const home = document.createElement('main');
  home.classList.add('card-container');

  for (const [path, post] of metadata) {
    home.insertAdjacentHTML('beforeend',
      `<article class="card">
        <h2>${post.title}</h2><p>${post.description}</p><p><a href="${path}">${post.linkText}</a></p>
      </article>`);
  }

  // Sets grid-row-end for each card when the homepage is resized. Required to implement masonry layout.
  new ResizeObserver(_ => {
    const halfRemHeight = parseFloat(getComputedStyle(document.documentElement).fontSize) / 2;
    for (let card of home.children) {
      let contentHeight = 0;
      for (let child of card.children) {
        contentHeight += child.clientHeight;
      }
      card.style.gridRowEnd = `span ${Math.ceil(contentHeight / halfRemHeight)}`;
    }
  }).observe(home);

  return home;
}

/* Calls the Google Docs API to get content for a given Doc ID. Stringifies the Google Doc and converts it to
  markdown, which is then ready to be converted into an HTML component. */
async function fetchPostContent(id) {
  const proxyUrl = '/api';
  const url = `${proxyUrl}?https://docs.googleapis.com/v1/documents/${id}`;
  const googleDoc = await fetch(url).then(r => r.json());

  const mapping = {
    TITLE: '# ',
    SUBTITLE: '',
    HEADING_1: '## ',
    HEADING_2: '### ',
    HEADING_3: '#### ',
    NORMAL_TEXT: '',
  };

  let articleContent = '';
  for (const content of googleDoc.body.content) {
    const tag = mapping[content?.paragraph?.paragraphStyle?.namedStyleType];
    const bullet = content?.paragraph?.bullet ? '- ' : '';
    if (tag !== undefined) {
      articleContent += `${bullet}${tag}${content.paragraph.elements[0].textRun.content}`;
    }
  }

  return articleContent;
}

/* Constructs the <main> element used on a post from the post's content. */
function buildPostComponent(articleContent) {
  const post = document.createElement('main');

  post.insertAdjacentHTML('beforeend',
    `<article class="post">
    ${marked(articleContent)}
  </article>`);

  return post;
}

/* Update document title, <head> tags, and the edit pencil icon for a page. */
function setPageMetadata(values) {
  document.title = values.title;
  document.querySelector('meta[name="description"]').content = values.description;
  document.querySelector('link[rel="canonical"]').href = `https://ardislu.dev${values.path}`;
  document.querySelector('meta[property="og:title"]').content = values.title;
  document.querySelector('meta[property="og:description"]').content = values.description;
  document.querySelector('meta[property="og:url"]').content = `https://ardislu.dev${values.path}`;
  globalThis.components.get('header').querySelector('#edit').href = values.editUrl;
}

/* Implement client-side routing. Handles view logic for /home and /:post routes. */
async function showPage(path) {
  // Determine which placeholders to show
  if (path === '/home' || path === '/') {
    document.querySelector('main').replaceWith(globalThis.components.get('cards-skeleton'));
  }
  else {
    document.querySelector('main').replaceWith(globalThis.components.get('article-skeleton'));
  }

  // Load all post metadata if it hasn't been loaded yet
  if (globalThis.metadata.size === 0) {
    globalThis.metadata = await fetchPostMetadata();
  }

  if (path === '/home' || path === '/') {
    setPageMetadata({
      title: 'ardislu.dev',
      description: 'Notes on web development, crypto, self-hosting, and tech in general.',
      path: path,
      editUrl: 'https://docs.google.com/spreadsheets/d/1pfGF8yBu3D0GPTezygLuzu3Cif8SkjhtG98nL-czlhc/edit'
    });

    const homeComponent = buildHomeComponent(globalThis.metadata);
    globalThis.components.set('home', homeComponent);
    document.querySelector('main').replaceWith(homeComponent);
  }
  else if (globalThis.metadata.has(path)) {
    const post = globalThis.metadata.get(path);

    setPageMetadata({
      title: post.title,
      description: post.description,
      path: path,
      editUrl: `https://docs.google.com/document/d/${post.id}/edit`
    });

    if (!globalThis.components.has(path)) {
      const articleContent = await fetchPostContent(post.id);
      const postComponent = buildPostComponent(articleContent);
      globalThis.components.set(path, postComponent);
      document.querySelector('main').replaceWith(postComponent);
      hljs.highlightAll(); // Should only be called once per page component
    }
    else {
      document.querySelector('main').replaceWith(globalThis.components.get(path));
    }
  }
  else {
    // MUST redirect to a page where the web server serves an actual 404 error (i.e. not just 
    // index.html again) otherwise this triggers an infinite loop
    document.title = '404: Not Found';
    location.replace(`${location.origin}/errors/NotFound`);
  }
}

/* Implement client-side routing. Handles redirect logic. */
function route(href) {
  const url = new URL(href);

  // If the new page is equal to the current page, don't do anything
  if (location.href === url.href) {
    return;
  }
  // Redirect as expected for outside hosts or Atom feed
  else if (location.host !== url.host || href === 'https://ardislu.dev/atom.xml') {
    location.href = href;
    return;
  }
  // For all other routes, use client-side routing 
  else {
    history.pushState({}, '', url);
    showPage(url.pathname);
  }
}

/* Set event handlers for client-side routing. */
globalThis.addEventListener('popstate', _ => showPage(location.pathname));
document.addEventListener('click', e => {
  const anchor = e.target.closest('a');
  if (anchor) {
    e.preventDefault();
    route(anchor.href);
  }
});

/* DevTools console help message. */
const ascii =
`                   _       _            _                 
                   | (_)   | |          | |                
       ____ ____ __| |_ ___| |_   _   __| | _____  __      
      / _  |  __/ _  | | __| | | | | / _  |/ __| |/ /      
     | |_| | | | |_| | |__ | | |_| || |_| |  __| V /       
     |_____|_| |_____|_|___|_|_____(_)____|____|__/        
                                                           
Poking around? Here are some globals that might be helpful:`;

function help() {
  console.log(`%c ${ascii}`, 'font-weight: bold')
  console.table({
    'help()': 'Print this message.',
    'metadata': 'Map object containing all blog post metadata and content.',
    'components': 'Map object containing live HTML elements of all the components used for the site.'
  });
}
globalThis.help = help;

/* Capture the existing <header> and <dialog> elements from the HTML. */
globalThis.components.set('header', document.querySelector('header'));
globalThis.components.set('toast', document.querySelector('dialog'));

/* Create the skeleton loaders. */
const cardsSkeleton = document.createElement('main');
cardsSkeleton.classList.add('card-container');
cardsSkeleton.insertAdjacentHTML('beforeend',
  `<article class="card">
    ${'<div class="skeleton-line"></div>'.repeat(5)}
  </article>`.repeat(30));
globalThis.components.set('cards-skeleton', cardsSkeleton);

const articleSkeleton = document.createElement('main');
articleSkeleton.insertAdjacentHTML('beforeend',
  `<article class="post">
    ${'<div class="skeleton-line"></div>'.repeat(25)}
  </article>`);
globalThis.components.set('article-skeleton', articleSkeleton);

help();
showPage(location.pathname); // To support direct links to articles
