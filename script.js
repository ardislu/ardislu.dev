const main = document.getElementsByTagName("main")[0];
const initialColumns = Math.max(1, Math.floor(main.clientWidth / 240) - 1);

/* Generic element builders */
const createColumnElement = () => {
  const el = document.createElement("div");
  el.classList.add("column");
  return el;
};

const createSkeletonElement = () => {
  const el = document.createElement("article");
  el.innerHTML = '<div class="skeleton-line"></div>'.repeat(6);
  return el;
};

const createArticleElement = (article) => {
  const el = document.createElement("article");
  el.innerHTML = `<h2>${article.title}</h2><p>${article.body}</p><p><a href="#">Read More</a></p>`;
  return el;
};

/* Inject placeholder skeleton loaders */
for (let i = 0; i < initialColumns; i++) {
  const col = createColumnElement();
  for (let j = 0; j < 12; j++) {
    const a = createSkeletonElement();
    col.insertAdjacentElement("beforeend", a);
  }
  main.insertAdjacentElement("beforeend", col);
}

/* Callback to inject content from API */
const inject = (resp) => {
  main.innerHTML = "";
  const chunkSize = Math.ceil(resp.length / initialColumns);
  for (let i = 0; i < initialColumns; i++) {
    const col = createColumnElement();
    const chunk = resp.splice(0, chunkSize);
    for (let a of chunk) {
      col.insertAdjacentElement("beforeend", createArticleElement(a));
    }
    main.insertAdjacentElement("beforeend", col);
  }
};

fetch("https://jsonplaceholder.typicode.com/posts").then((httpResponse) =>
  httpResponse.json().then((jsonResponse) => inject(jsonResponse))
);
