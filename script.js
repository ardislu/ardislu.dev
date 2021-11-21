if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}

const main = document.getElementsByTagName('main')[0];
const halfRemHeight = parseFloat(getComputedStyle(document.documentElement).fontSize) / 2;

/* Generic element builders */
const createSkeletonElement = () => {
  const el = document.createElement('article');
  el.classList.add('card');
  el.innerHTML = '<div class="skeleton-line"></div>'.repeat(6);
  return el;
};

const createArticleElement = (article) => {
  const el = document.createElement('article');
  el.classList.add('card');
  el.innerHTML = `<h2>${article[0]}</h2><p>${article[1]}</p><p><a href="/posts/${article[2]}">${article[3]}</a></p>`;
  return el;
};

const setRowSpan = (card) => {
  let contentHeight = 0;
  for (let child of card.children) {
    contentHeight += child.clientHeight;
  }
  card.style.gridRowEnd = `span ${Math.ceil(contentHeight / halfRemHeight)}` // Fit the card's row span to the height of the card's content
  console.log(contentHeight, Math.ceil(contentHeight / halfRemHeight));
}

/* Inject placeholder skeleton loaders */
for (let i = 0; i < 12; i++) {
  const a = createSkeletonElement();
  main.insertAdjacentElement('beforeend', a);
};

/* Callback to inject content from API */
const inject = (resp) => {
  main.innerHTML = '';
  for (let a of resp) {
    const card = createArticleElement(a);
    main.insertAdjacentElement('beforeend', card); // Must insert the element first because contentHeight is dynamic on card width
    setRowSpan(card);
  }
};

/* Query Google Sheet for the card content */
(async () => {
  const proxyUrl = 'https://script.google.com/macros/s/AKfycbzMHxwypbwsccBq6RH8LDCAOpM02C4gbkljbcKHKFsoQTRE-f4XTIyswiaO0vshs-Kr/exec';
  const controllerId = '1pfGF8yBu3D0GPTezygLuzu3Cif8SkjhtG98nL-czlhc';
  const range = 'B3:E';
  const url = `${proxyUrl}?https://sheets.googleapis.com/v4/spreadsheets/${controllerId}/values/${range}`;

  await fetch(url)
    .then((httpResponse) => httpResponse.json())
    .then((googleSheetsRange) => inject(googleSheetsRange.values));
})();
