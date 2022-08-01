import { marked } from 'https://cdn.jsdelivr.net/npm/marked@4.0.17/lib/marked.esm.min.js';
import hljs from 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.5.1/build/es/highlight.min.js';
import powershell from 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.5.1/build/es/languages/powershell.min.js';
hljs.registerLanguage('powershell', powershell);

/* Set up logic for stale-while-revalidate cache strategy */
navigator.serviceWorker.register('/sw.js');
const cacheChannel = new BroadcastChannel('cache');
cacheChannel.addEventListener('message', e => {
  // Ignore static assets like logo.svg, style.css, script.js, etc. 
  if (new URL(e.data.resource).pathname === '/api' && e.data.isUpdated) {
    toast.show();
  }
});

/* Global data store for posts */
const posts = new Map();
globalThis.POSTS = posts;

/* Define components from the initial HTML templates */
const components = new Map();
document.querySelectorAll('template').forEach(t => {
  components.set(t.id, t.content.firstElementChild);
  t.remove();
});
components.set('header', document.querySelector('header'));
components.set('toast', document.querySelector('dialog'));
globalThis.COMPONENTS = components;
const header = components.get('header');
const homeLoader = components.get('home-loader');
const homeMain = components.get('home-main');
const postLoader = components.get('post-loader');
const postMain = components.get('post-main');
document.querySelector('dialog > button').addEventListener('click', _ => location.reload());

/* Fetch important <head> elements for convenience */
const head = {
  description: document.querySelector('meta[name="description"]'),
  canonical: document.querySelector('link[rel="canonical"]'),
  ogTitle: document.querySelector('meta[property="og:title"]'),
  ogDescription: document.querySelector('meta[property="og:description"]'),
  ogUrl: document.querySelector('meta[property="og:url"]'),
};

/* Hydrate the loaders */
homeLoader.insertAdjacentHTML('beforeend',
  `<article class="card">
    ${'<div class="skeleton-line"></div>'.repeat(6)}
  </article>`.repeat(12));

postLoader.insertAdjacentHTML('beforeend',
  `<article class="post">
    ${'<div class="skeleton-line"></div>'.repeat(25)}
  </article>`);

/* Call the CMS controller to get all post metadata. Note: must call fetchPostContent to get content. */
async function fetchPostMetadata() {
  const proxyUrl = '/api';
  const controllerId = '1pfGF8yBu3D0GPTezygLuzu3Cif8SkjhtG98nL-czlhc';
  const range = 'B3:I';
  const url = `${proxyUrl}?https://sheets.googleapis.com/v4/spreadsheets/${controllerId}/values/${range}`;

  await fetch(url)
    .then(r => r.json())
    .then(googleSheet => {
      posts.clear();
      for (const article of googleSheet.values) {
        posts.set(article[4], {
          title: article[0],
          description: article[1],
          id: article[2],
          linkText: article[3],
          createdDate: article[5],
          updatedDate: article[6],
          tags: article[7]
        });
      }
    });
}

/* Get content for the given path */
async function fetchPostContent(path) {
  const post = posts.get(path);
  const proxyUrl = '/api';
  const url = `${proxyUrl}?https://docs.googleapis.com/v1/documents/${post.id}`;

  const mapping = {
    TITLE: '# ',
    SUBTITLE: '',
    HEADING_1: '## ',
    HEADING_2: '### ',
    HEADING_3: '#### ',
    NORMAL_TEXT: '',
  };

  await fetch(url)
    .then(r => r.json())
    .then(googleDoc => {
      let articleContent = '';
      for (const content of googleDoc.body.content) {
        const tag = mapping[content?.paragraph?.paragraphStyle?.namedStyleType];
        const bullet = content?.paragraph?.bullet ? '- ' : '';
        if (tag !== undefined) {
          articleContent += `${bullet}${tag}${content.paragraph.elements[0].textRun.content}`;
        }
      }
      post.content = articleContent;
    });
}

/* Client-side routing */
async function showPage(path) {
  // Determine which placeholders to show
  if (path === '/home' || path === '/') {
    document.querySelector('main').replaceWith(homeLoader);
  }
  else {
    document.querySelector('main').replaceWith(postLoader);
  }

  // Load all post metadata if it hasn't been loaded yet
  if (posts.size === 0) {
    await fetchPostMetadata();
  }

  if (path === '/home' || path === '/') {
    document.title = 'ardislu.dev';
    head.description.content = 'Notes on web development, crypto, self-hosting, and tech in general.';
    head.canonical.href = 'https://ardislu.dev';
    head.ogTitle.content = 'ardislu.dev';
    head.ogDescription.content = 'Notes on web development, crypto, self-hosting, and tech in general.';
    head.ogUrl.content = 'https://ardislu.dev';
    header.querySelector('#edit').href = `https://docs.google.com/spreadsheets/d/1pfGF8yBu3D0GPTezygLuzu3Cif8SkjhtG98nL-czlhc/edit`;
    homeMain.innerHTML = '';
    for (const [path, post] of posts) {
      homeMain.insertAdjacentHTML('beforeend',
        `<article class="card">
          <h2>${post.title}</h2><p>${post.description}</p><p><a href="${path}">${post.linkText}</a></p>
        </article>`);
    }
    document.querySelector('main').replaceWith(homeMain);
  }
  else if (posts.has(path)) {
    const post = posts.get(path);

    document.title = post.title;
    head.description.content = post.description;
    head.canonical.href = `https://ardislu.dev${path}`;
    head.ogTitle.content = post.title;
    head.ogDescription.content = post.description;
    head.ogUrl.content = `https://ardislu.dev${path}`;
    header.querySelector('#edit').href = `https://docs.google.com/document/d/${post.id}/edit`;

    if (post.content === undefined) {
      await fetchPostContent(path);
    }

    postMain.innerHTML = '';
    postMain.insertAdjacentHTML('beforeend',
      `<article class="post">
        ${marked(post.content)}
      </article>`);
    document.querySelector('main').replaceWith(postMain);
    hljs.highlightAll();
  }
  else {
    // MUST redirect to a page where the web server serves an actual 404 error (i.e. not just 
    // index.html again) otherwise this triggers an infinite loop
    document.title = '404: Not Found';
    location.replace(`${location.protocol}//${location.host}/errors/NotFound`);
  }
}

function route(href) {
  const url = new URL(href);

  // If the new page is equal to the current page, don't do anything
  if (location.href === url.href) {
    return;
  }
  // If the new page is on a different host, redirect as expected
  if (location.host !== url.host) {
    location.href = href;
    return;
  }

  history.pushState({}, '', url);
  showPage(url.pathname);
}

/* Set event handlers for client-side routing */
globalThis.addEventListener('popstate', _ => showPage(location.pathname));
document.addEventListener('click', e => {
  e.preventDefault();
  const anchor = e.target.closest('a');
  if (!anchor) {
    return;
  }
  route(anchor.href);
});

// Show the current URL (to support direct linking aka deep links)
showPage(location.pathname);

/* Set grid-row-end for each card on homeMain resize. Required to implement masonry layout. */
new ResizeObserver(_ => {
  const halfRemHeight = parseFloat(getComputedStyle(document.documentElement).fontSize) / 2;
  for (let card of homeMain.children) {
    let contentHeight = 0;
    for (let child of card.children) {
      contentHeight += child.clientHeight;
    }
    card.style.gridRowEnd = `span ${Math.ceil(contentHeight / halfRemHeight)}`;
  }
}).observe(homeMain);

/* DevTools console help message */
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
    'POSTS': 'Map object containing all blog post metadata and content.',
    'COMPONENTS': 'Map object containing live HTML elements of all the components used for the site.',
    'help()': 'Print this message.'
  });
}
help();
globalThis.help = help;
