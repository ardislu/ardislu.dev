import { marked } from 'https://cdn.jsdelivr.net/npm/marked@4.0.12/lib/marked.esm.min.js';
import hljs from 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.4.0/build/es/highlight.min.js';
import powershell from 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.4.0/build/es/languages/powershell.min.js';
hljs.registerLanguage('powershell', powershell);

navigator.serviceWorker.register('/sw.js');

/* Global data store for posts */
const posts = new Map();
window.POSTS = posts;

/* Define components from the initial HTML templates */
const components = new Map();
document.querySelectorAll('template').forEach(t => {
  components.set(t.id, t.content.firstElementChild);
  t.remove();
});
window.COMPONENTS = components;
const homeHeader = components.get('home-header');
const homeLoader = components.get('home-loader');
const homeMain = components.get('home-main');
const postHeader = components.get('post-header');
const postLoader = components.get('post-loader');
const postMain = components.get('post-main');

/* Fetch important <head> elements for convenience */
const head = {
  description: document.querySelector('meta[name="description"]'),
  canonical: document.querySelector('link[rel="canonical"]'),
  ogTitle: document.querySelector('meta[property="og:title"]'),
  ogDescription: document.querySelector('meta[property="og:description"]'),
  ogUrl: document.querySelector('meta[property="og:url"]'),
  ogImage: document.querySelector('meta[property="og:image"]'),
  ogImageAlt: document.querySelector('meta[property="og:image:alt"]')
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
  document.body.innerHTML = '';

  // Determine which placeholders to show
  if (path === '/home' || path === '/') {
    document.body.appendChild(homeHeader);
    document.body.appendChild(homeLoader);
  }
  else {
    document.body.appendChild(postHeader);
    document.body.appendChild(postLoader);
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
    head.ogImage.content = 'https://og-image.ardislu.dev/Notes%20on%20**web%20development**%2C%20**crypto**%2C%20**self-hosting**%2C%20and%20**tech**%20in%20general..png';
    head.ogImageAlt.content = "Website logo above the text 'notes on web development, crypto, self-hosting, and tech in general.'";
    homeMain.innerHTML = '';
    for (const [path, post] of posts) {
      homeMain.insertAdjacentHTML('beforeend',
        `<article class="card">
          <h2>${post.title}</h2><p>${post.description}</p><p><a href="${path}">${post.linkText}</a></p>
        </article>`);
    }
    homeLoader.remove();
    document.body.appendChild(homeMain);
  }
  else if (posts.has(path)) {
    const post = posts.get(path);

    document.title = post.title;
    head.description.content = post.description;
    head.canonical.href = `https://ardislu.dev${path}`;
    head.ogTitle.content = post.title;
    head.ogDescription.content = post.description;
    head.ogUrl.content = `https://ardislu.dev${path}`;
    head.ogImage.content = `https://og-image.ardislu.dev/${encodeURIComponent(post.title)}.png`;
    head.ogImageAlt.content = `Website logo above the text '${post.title}'`;
    postHeader.querySelector('#edit').href = `https://docs.google.com/document/d/${post.id}/edit`;

    if (post.content === undefined) {
      await fetchPostContent(path);
    }

    postMain.innerHTML = '';
    postMain.insertAdjacentHTML('beforeend',
      `<article class="post">
        ${marked(post.content)}
      </article>`);
    postLoader.remove();
    document.body.appendChild(postMain);
    hljs.highlightAll();
  }
  else {
    // MUST redirect to a page where the web server serves an actual 404 error (i.e. not just 
    // index.html again) otherwise this triggers an infinite loop
    document.title = '404: Not Found';
    window.location.replace(`${window.location.protocol}//${window.location.host}/errors/NotFound`);
  }
}

function route(href) {
  const url = new URL(href);

  // If the new page is equal to the current page, don't do anything
  if (window.location.href === url.href) {
    return;
  }
  // If the new page is on a different host, redirect as expected
  if (window.location.host !== url.host) {
    window.location.href = href;
    return;
  }

  window.history.pushState({}, '', url);
  showPage(url.pathname);
}

/* Set event handlers for client-side routing */
window.addEventListener('popstate', _ => showPage(window.location.pathname));
document.addEventListener('click', e => {
  e.preventDefault();
  const anchor = e.target.closest('a');
  if (!anchor) {
    return;
  }
  route(anchor.href);
});

// Show the current URL (to support direct linking aka deep links)
showPage(window.location.pathname);

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
window.help = help;
