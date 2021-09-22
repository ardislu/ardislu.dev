if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}

const main = document.getElementsByTagName('main')[0];
const initialColumns = Math.max(1, Math.floor(main.clientWidth / 320) - 1);

/* Generic element builders */
const createColumnElement = () => {
  const el = document.createElement('div');
  el.classList.add('column');
  return el;
};

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

/* Inject placeholder skeleton loaders */
for (let i = 0; i < initialColumns; i++) {
  const col = createColumnElement();
  for (let j = 0; j < 12; j++) {
    const a = createSkeletonElement();
    col.insertAdjacentElement('beforeend', a);
  }
  main.insertAdjacentElement('beforeend', col);
}

/* Callback to inject content from API */
const inject = (resp) => {
  main.innerHTML = '';
  const chunkSize = Math.ceil(resp.length / initialColumns);
  for (let i = 0; i < initialColumns; i++) {
    const col = createColumnElement();
    const chunk = resp.splice(0, chunkSize);
    for (let a of chunk) {
      col.insertAdjacentElement('beforeend', createArticleElement(a));
    }
    main.insertAdjacentElement('beforeend', col);
  }
};

/* Query Google Sheet for the card content */
(async () => {
  const proxyUrl =
    'https://script.google.com/macros/s/AKfycbzMHxwypbwsccBq6RH8LDCAOpM02C4gbkljbcKHKFsoQTRE-f4XTIyswiaO0vshs-Kr/exec';
  const controllerId = '1pfGF8yBu3D0GPTezygLuzu3Cif8SkjhtG98nL-czlhc';
  const range = 'B3:E';
  const url = `${proxyUrl}?https://sheets.googleapis.com/v4/spreadsheets/${controllerId}/values/${range}`;

  await fetch(url)
    .then((httpResponse) => httpResponse.json())
    .then((googleSheetsRange) => inject(googleSheetsRange.values));
})();
