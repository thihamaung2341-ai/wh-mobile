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
    .catalog-layout{display:grid!important;grid-template-columns:250px minmax(0,1fr)!important;gap:22px!important;align-items:start!important;margin:18px 0!important;width:100%}
    .catalog-layout > #catalogTools{display:flex!important;flex-direction:column!important;grid-column:1!important;grid-row:1!important;width:100%!important;min-width:0!important;box-sizing:border-box!important}
    .catalog-layout > .catalog-results{display:block!important;grid-column:2!important;grid-row:1!important;width:100%!important;min-width:0!important}
    .catalog-layout #catalogTools label{width:100%;box-sizing:border-box}
    .catalog-layout #catalogTools select,.catalog-layout #catalogTools input{width:100%!important}
    .catalog-layout #grid{grid-template-columns:repeat(auto-fill,minmax(190px,1fr))}

    .catalog-tools{display:flex!important;flex-direction:column!important;gap:0!important;margin:0;padding:16px;background:var(--card,#fff);border:1px solid var(--line,#d9e0ea);border-radius:14px;align-self:start}
    .catalog-filter-title{font-size:1.05rem;margin:0 0 12px}
    .catalog-filter-group{padding:12px 0;border-bottom:1px solid var(--line,#d9e0ea)}
    .catalog-filter-group h4{font-size:.78rem;text-transform:uppercase;letter-spacing:.04em;margin:0 0 10px;color:var(--muted,#64748b)}
    .catalog-filter-group label{display:grid;gap:6px;color:var(--muted,#64748b);font-size:.84rem;font-weight:500;margin:8px 0}
    .catalog-filter-group .catalog-check{display:flex;align-items:center;gap:8px;color:var(--text,#172033);cursor:pointer}
    .catalog-filter-group input[type=checkbox],.catalog-filter-group input[type=radio]{accent-color:var(--accent,#2563eb);width:16px;height:16px}
    .catalog-filter-group input[type=number]{width:100%;min-width:0;box-sizing:border-box;padding:9px 10px;border:1px solid var(--line,#d9e0ea);border-radius:9px;background:var(--card,#fff);color:var(--text,#172033);font:inherit}
    .catalog-option{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:7px 0;font-size:.86rem}
    .catalog-option label{display:flex;align-items:center;gap:8px;margin:0;cursor:pointer;color:var(--text,#172033)}
    .catalog-option small{color:var(--muted,#64748b)}
    .catalog-reset{margin-top:14px;padding:9px;border:1px solid var(--line,#d9e0ea);border-radius:9px;background:transparent;color:var(--text,#172033);cursor:pointer}
    .catalog-sortbar{display:flex;justify-content:flex-end;align-items:center;gap:8px;margin-bottom:12px}
    .catalog-sortbar select{padding:9px 12px;border:1px solid var(--line,#d9e0ea);border-radius:9px;background:var(--card,#fff);color:var(--text,#172033)}
    .catalog-results{min-width:0}
    .catalog-summary{color:var(--muted,#64748b);margin:0 0 14px}
    .product-stock{display:inline-flex;align-items:center;gap:6px;margin:8px 0;color:var(--muted,#64748b);font-size:.84rem}
    .product-stock:before{content:"";width:8px;height:8px;border-radius:50%;background:#c2413b}
    .product-stock.available:before{background:#16845b}
    .product-specs{display:flex;flex-wrap:wrap;gap:6px;margin:5px 0 10px}
    .product-specs span{padding:4px 8px;border-radius:999px;background:var(--surface,#f1f5fb);color:var(--muted,#64748b);font-size:.76rem}
    .product-card{display:flex;flex-direction:column}
    .product-card .btn{margin-top:auto}
    .catalog-empty{grid-column:1/-1;padding:24px;text-align:center;color:var(--muted,#64748b);background:var(--card,#fff);border:1px solid var(--border,#d9e0ea);border-radius:14px}
    @media(max-width:850px){.catalog-layout{grid-template-columns:220px minmax(0,1fr)!important;gap:14px!important}}
    @media(max-width:650px){.catalog-layout{grid-template-columns:1fr!important}.catalog-layout > #catalogTools,.catalog-layout > .catalog-results{grid-column:1!important;grid-row:auto!important}.catalog-layout #catalogTools{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:9px}.catalog-layout #catalogTools label:first-child,.catalog-layout #catalogTools label:last-child{grid-column:1/-1}}
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
    <h3 class="catalog-filter-title">Filter products</h3>
    <section class="catalog-filter-group"><h4>Stock status</h4>
      <label class="catalog-check"><input type="radio" name="catalogStock" value="all" checked> View all</label>
      <label class="catalog-check"><input type="radio" name="catalogStock" value="in"> In stock only</label>
      <label class="catalog-check"><input type="radio" name="catalogStock" value="out"> Out of stock</label>
    </section>
    <section class="catalog-filter-group"><h4>Brand</h4><div id="catalogBrandOptions"></div></section>
    <section class="catalog-filter-group"><h4>Category</h4><div id="catalogCategoryOptions"></div></section>
    <section class="catalog-filter-group"><h4>Price range (Ks)</h4>
      <label>Minimum<input id="catalogMinPrice" type="number" min="0" step="1" inputmode="numeric" placeholder="No minimum"></label>
      <label>Maximum<input id="catalogMaxPrice" type="number" min="0" step="1" inputmode="numeric" placeholder="No maximum"></label>
    </section>
    <button type="button" class="catalog-reset" id="catalogReset">Reset filters</button>`;
  const summary = document.createElement("p");
  summary.id = "catalogSummary";
  summary.className = "catalog-summary";
  summary.setAttribute("aria-live", "polite");
  const chips = document.getElementById("chips");
  const layout = document.createElement("div");
  layout.className = "catalog-layout";
  const results = document.createElement("div");
  results.className = "catalog-results";
  const sortbar = document.createElement("div");
  sortbar.className = "catalog-sortbar";
  sortbar.innerHTML = '<label for="catalogSort">Sort by</label><select id="catalogSort"><option value="newest">Newest first</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name-asc">Name: A to Z</option></select>';
  if (chips) chips.insertAdjacentElement("afterend", layout);
  else grid.before(layout);
  layout.append(tools, results);
  results.append(sortbar, summary, grid);

  tools.addEventListener("input", renderCatalog);
  tools.addEventListener("change", renderCatalog);
  document.getElementById("catalogSort").addEventListener("change", renderCatalog);
  document.getElementById("catalogReset").addEventListener("click", () => {
    tools.querySelectorAll('input[type="checkbox"]').forEach(input => input.checked = false);
    tools.querySelector('input[name="catalogStock"][value="all"]').checked = true;
    tools.querySelectorAll('input[type="number"]').forEach(input => input.value = "");
    document.getElementById("catalogSort").value = "newest";
    renderCatalog();
  });
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
  const stock = document.querySelector('input[name="catalogStock"]:checked')?.value || "all";
  const sort = document.getElementById("catalogSort")?.value || "newest";
  const selectedBrands = [...document.querySelectorAll('input[name="catalogBrand"]:checked')].map(input => input.value);
  const selectedCategories = [...document.querySelectorAll('input[name="catalogCategory"]:checked')].map(input => input.value);
  const term = String(window.searchQuery || "").trim().toLocaleLowerCase();

  let products = productState.all.filter(product => {
    const searchable = [product.n, product.brand, product.category, product.t, product.storageGb, product.ramGb, product.color, product.condition].join(" ").toLocaleLowerCase();
    return (!selectedBrands.length || selectedBrands.includes(product.brand))
      && (!selectedCategories.length || selectedCategories.includes(product.category))
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
    const specs = document.createElement("div");
    specs.className = "product-specs";
    [
      product.storageGb ? (Number(product.storageGb) >= 1024 ? (Number(product.storageGb) / 1024) + " TB storage" : Number(product.storageGb) + " GB storage") : "",
      product.ramGb ? Number(product.ramGb) + " GB RAM" : "",
      product.color,
      product.condition
    ].filter(Boolean).forEach(value => {
      const chip = document.createElement("span");
      chip.textContent = value;
      specs.append(chip);
    });
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
    if (specs.childElementCount) card.append(specs);
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
        storageGb: p.storageGb == null ? "" : Number(p.storageGb),
        ramGb: p.ramGb == null ? "" : Number(p.ramGb),
        color: safeText(p.color || ""),
        condition: safeText(p.condition || ""),
        t: safeText(p.description || ""),
        i: safeText(p.imageUrl || ""),
        createdAt
      };
    });
    productState.loaded = true;
    window.PHONES = productState.all;
    const brands = productState.all.map(product => product.brand);
    const categories = productState.all.map(product => product.category);
    const buildFilterOptions = (containerId, name, values) => {
      const container = document.getElementById(containerId);
      if (!container) return;
      const counts = values.reduce((map, value) => (map[value] = (map[value] || 0) + 1, map), {});
      container.replaceChildren();
      [...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b)).forEach(value => {
        const row = document.createElement("div"); row.className = "catalog-option";
        const label = document.createElement("label");
        const input = document.createElement("input"); input.type = "checkbox"; input.name = name; input.value = value;
        const text = document.createElement("span"); text.textContent = value;
        label.append(input,text);
        const count = document.createElement("small"); count.textContent = counts[value];
        row.append(label,count); container.append(row);
      });
    };
    buildFilterOptions("catalogBrandOptions","catalogBrand",brands);
    buildFilterOptions("catalogCategoryOptions","catalogCategory",categories);
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
