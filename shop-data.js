import { auth, db } from "./firebase-config.js";
import {
  collection, getDocs, query, where, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const form = document.getElementById("f");
const grid = document.getElementById("grid");
const productState = { all: [], loaded: false, error: false };


function addCatalogStyles() {
  if (document.getElementById("catalogStyles")) return;
  const style = document.createElement("style");
  style.id = "catalogStyles";
  style.textContent = `
    .catalog-tools{display:grid;grid-template-columns:repeat(5,minmax(130px,1fr));gap:12px;margin:16px 0}
    .catalog-tools label{display:grid;gap:6px;color:var(--muted,#64748b);font-size:.84rem;font-weight:600}
    .catalog-tools input,.catalog-tools select{width:100%;min-width:0;box-sizing:border-box;padding:10px 12px;border:1px solid var(--line,#d9e0ea);border-radius:10px;background:var(--card,#fff);color:var(--text,#172033);font:inherit}
    .catalog-summary{color:var(--muted,#64748b);margin:10px 0 14px}
    .product-stock{display:inline-flex;align-items:center;gap:6px;margin:8px 0;color:var(--muted,#64748b);font-size:.84rem}
    .product-stock:before{content:"";width:8px;height:8px;border-radius:50%;background:#c2413b}
    .product-stock.available:before{background:#16845b}
    .product-card{display:flex;flex-direction:column}
    .product-card .btn{margin-top:auto}
    .catalog-empty{grid-column:1/-1;padding:24px;text-align:center;color:var(--muted,#64748b);background:var(--card,#fff);border:1px solid var(--border,#d9e0ea);border-radius:14px}
    @media(max-width:850px){.catalog-tools{grid-template-columns:repeat(3,minmax(130px,1fr))}}
    @media(max-width:560px){.catalog-tools{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.catalog-tools label:first-child{grid-column:1/-1}}
  `;
  document.head.append(style);
}

function ensureCatalogTools() {
  if (!grid) return;
  addCatalogStyles();
  if (document.getElementById("catalogTools")) return;
  const tools = document.createElement("div");
  tools.id = "catalogTools";
  tools.className = "catalog-tools";
  tools.innerHTML = `
    <label>Brand
      <select id="catalogBrand"><option value="">All brands</option></select>
    </label>
    <label>Category
      <select id="catalogCategory"><option value="">All categories</option></select>
    </label>
    <label>Minimum price (Ks)
      <input id="catalogMinPrice" type="number" min="0" step="1" inputmode="numeric" placeholder="No minimum">
    </label>
    <label>Maximum price (Ks)
      <input id="catalogMaxPrice" type="number" min="0" step="1" inputmode="numeric" placeholder="No maximum">
    </label>
    <label>Sort by
      <select id="catalogSort">
        <option value="newest">Newest first</option>
        <option value="price-asc">Price: low to high</option>
        <option value="price-desc">Price: high to low</option>
        <option value="name-asc">Name: A to Z</option>
      </select>
    </label>
    <label>Stock status
      <select id="catalogStock">
        <option value="all">All products</option>
        <option value="in">In stock</option>
        <option value="out">Out of stock</option>
      </select>
    </label>`;
  const summary = document.createElement("p");
  summary.id = "catalogSummary";
  summary.className = "catalog-summary";
  summary.setAttribute("aria-live", "polite");
  const chips = document.getElementById("chips");
  if (chips) chips.insertAdjacentElement("afterend", tools);
  else grid.before(tools);
  tools.insertAdjacentElement("afterend", summary);

  tools.addEventListener("input", renderCatalog);
  tools.addEventListener("change", renderCatalog);
}

function setOptions(id, values, allLabel) {
  const select = document.getElementById(id);
  if (!select) return;
  const current = select.value;
  const options = [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  select.replaceChildren(new Option(allLabel, ""));
  options.forEach(value => select.add(new Option(value, value)));
  if (options.includes(current)) select.value = current;
}

function safeText(value) {
  return String(value ?? "");
}

function renderCatalog() {
  if (!grid || !productState.loaded) return;
  ensureCatalogTools();

  const brandSelect = document.getElementById("catalogBrand");
  const categorySelect = document.getElementById("catalogCategory");
  const brand = brandSelect?.value || "";
  const category = categorySelect?.value || "";
  const minValue = document.getElementById("catalogMinPrice")?.value;
  const maxValue = document.getElementById("catalogMaxPrice")?.value;
  const min = minValue === "" || minValue == null ? null : Number(minValue);
  const max = maxValue === "" || maxValue == null ? null : Number(maxValue);
  const stock = document.getElementById("catalogStock")?.value || "all";
  const sort = document.getElementById("catalogSort")?.value || "newest";
  const term = String(window.searchQuery || "").trim().toLocaleLowerCase();

  let products = productState.all.filter(product => {
    const searchable = [product.n, product.brand, product.category, product.t].join(" ").toLocaleLowerCase();
    return (!brand || product.brand === brand)
      && (!category || product.category === category)
      && (min === null || product.p >= min)
      && (max === null || product.p <= max)
      && (stock === "all" || (stock === "in" ? product.stock > 0 : product.stock <= 0))
      && (!term || searchable.includes(term));
  });

  if (sort === "price-asc") products.sort((a, b) => a.p - b.p);
  else if (sort === "price-desc") products.sort((a, b) => b.p - a.p);
  else if (sort === "name-asc") products.sort((a, b) => a.n.localeCompare(b.n));
  else products.sort((a, b) => b.createdAt - a.createdAt);

  const summary = document.getElementById("catalogSummary");
  if (summary) summary.textContent = productState.error
    ? "Showing available products. Firestore could not be refreshed."
    : products.length + (products.length === 1 ? " product" : " products");

  if (!productState.all.length) {
    grid.innerHTML = productState.error
      ? '<div class="catalog-empty">Products could not be loaded. Please check your connection and try again.</div>'
      : '<div class="catalog-empty">No active products are available yet. Please check back soon.</div>';
    return;
  }
  if (!products.length) {
    grid.innerHTML = '<div class="catalog-empty">No products match these filters. Try changing your search or filters.</div>';
    return;
  }

  grid.replaceChildren(...products.map(product => {
    const card = document.createElement("article");
    card.className = "card product-card";

    const photo = document.createElement("div");
    photo.className = "ph";
    if (product.i) {
      const image = document.createElement("img");
      image.src = product.i;
      image.alt = product.n;
      image.loading = "lazy";
      photo.append(image);
    } else {
      photo.textContent = "📱";
    }

    const title = document.createElement("b");
    title.textContent = product.n;
    const meta = document.createElement("div");
    meta.className = "tag";
    meta.textContent = [product.brand, product.category].filter(Boolean).join(" · ");
    const description = document.createElement("p");
    description.className = "sub";
    description.textContent = product.t;
    const price = document.createElement("div");
    price.className = "price";
    price.textContent = "Ks" + product.p.toLocaleString("en-US");
    const stockLabel = document.createElement("div");
    stockLabel.className = "product-stock" + (product.stock > 0 ? " available" : "");
    stockLabel.textContent = product.stock > 0 ? "In stock · " + product.stock : "Out of stock";

    const add = document.createElement("button");
    add.className = "btn";
    add.type = "button";
    add.dataset.add = product.id;
    add.textContent = product.stock > 0 ? "Add to cart" : "Out of stock";
    add.disabled = product.stock <= 0;

    card.append(photo, title);
    if (meta.textContent) card.append(meta);
    if (product.t) card.append(description);
    card.append(price, stockLabel, add);
    return card;
  }));
}

window.render = renderCatalog;

async function loadProducts() {
  if (!grid) return;
  ensureCatalogTools();
  const chips = document.getElementById("chips");
  if (chips) { chips.replaceChildren(); chips.hidden = true; }
  grid.innerHTML = '<div class="catalog-empty">Loading products…</div>';
  try {
    const snap = await getDocs(query(collection(db, "products"), where("active", "==", true)));
    productState.all = snap.docs.map(docSnap => {
      const p = docSnap.data();
      const stock = Number(p.stock ?? 0);
      const createdAt = p.createdAt?.toMillis?.() ?? (p.createdAt?.seconds ? p.createdAt.seconds * 1000 : 0);
      const category = safeText(p.category || "Other");
      // Legacy records use category values such as Apple or Samsung for their brand.
      const brand = safeText(p.brand || category);
      return {
        id: docSnap.id,
        n: safeText(p.name || "Unnamed product"),
        p: Number(p.price ?? 0),
        brand,
        category,
        stock: Number.isFinite(stock) ? stock : 0,
        t: safeText(p.description || ""),
        i: safeText(p.imageUrl || ""),
        createdAt
      };
    });
    productState.loaded = true;
    window.PHONES = productState.all;
    const brands = productState.all.map(product => product.brand);
    const categories = productState.all.map(product => product.category);
    setOptions("catalogBrand", brands, "All brands");
    setOptions("catalogCategory", categories, "All categories");
    // Retain the existing category chips as quick shortcuts.
    window.cats = ["All"].concat([...new Set(categories)]);
    window.cur = "All";
    renderCatalog();
  } catch (error) {
    console.error("Could not load Firestore products:", error);
    productState.loaded = true;
    productState.error = true;
    productState.all = [];
    window.PHONES = [];
    renderCatalog();
  }
}

// Save phone reservations and repair bookings to Firestore.
if (form) {
  form.addEventListener("submit", async event => {
    event.preventDefault();
    event.stopImmediatePropagation();

    const user = auth.currentUser;
    const output = document.getElementById("out");
    const value = id => document.getElementById(id)?.value?.trim() || "";
    if (!user) {
      output.style.display = "block";
      output.textContent = "Please log in before submitting a reservation or repair booking.";
      return;
    }

    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    submit.textContent = "Saving…";

    try {
      const isRepair = document.querySelector(".tabs .chip.on")?.dataset.t === "repair";
      const record = {
        userId: user.uid,
        customerName: value("n"),
        phone: value("p"),
        type: isRepair ? "repair" : "reservation",
        item: value("s"),
        preferredAt: value("d") || null,
        notes: value("m"),
        status: "pending",
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, "bookings"), record);
      output.style.display = "block";
      output.textContent = "Your request has been saved successfully. WH Mobile will contact you to confirm it.";
      form.reset();
    } catch (error) {
      console.error("Booking save failed:", error);
      output.style.display = "block";
      output.textContent = "We couldn't save your request. Please check your connection or try again later.";
    } finally {
      submit.disabled = false;
      submit.textContent = "Submit request";
    }
  }, true);
}

onAuthStateChanged(auth, user => {
  if (!user && form && !form.querySelector("[data-login-note]")) {
    const note = document.createElement("p");
    note.dataset.loginNote = "true";
    note.className = "sub";
    note.textContent = "Log in to submit a reservation or repair booking.";
    form.prepend(note);
  }
});

loadProducts();
