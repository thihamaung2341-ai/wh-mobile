import { auth, db } from "./firebase-config.js";
import { INVENTORY } from "./inventory.js";
import {
  collection, getDocs, query, where, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const form = document.getElementById("f");
const grid = document.getElementById("grid");
const productState = { all: [], loaded: false, error: false, usingInventory: false };


function addCatalogStyles() {
  if (document.getElementById("catalogStyles")) return;
  const style = document.createElement("style");
  style.id = "catalogStyles";
  style.textContent = `
    .catalog-layout{display:block!important;margin:18px 0!important;width:100%}
    .catalog-tools{display:grid!important;grid-template-columns:repeat(5,minmax(130px,1fr));gap:12px;margin:14px 0 18px;padding:0;background:transparent;border:0;border-radius:0}
    .catalog-filter-title{display:none}
    .catalog-filter-group{display:contents}
    .catalog-filter-group h4{display:none}
    .catalog-filter-group label{display:grid;gap:6px;color:var(--muted,#64748b);font-size:.84rem;font-weight:600;margin:0}
    .catalog-filter-group .catalog-check{display:none}
    .catalog-filter-group input[type=number],.catalog-tools select{width:100%;min-width:0;box-sizing:border-box;padding:10px 12px;border:1px solid var(--line,#d9e0ea);border-radius:10px;background:var(--card,#fff);color:var(--text,#172033);font:inherit}
    .catalog-reset{grid-column:1/-1;justify-self:start;padding:9px 13px;border:1px solid var(--line,#d9e0ea);border-radius:9px;background:transparent;color:var(--text,#172033);cursor:pointer}
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
    @media(max-width:850px){.catalog-tools{grid-template-columns:repeat(3,minmax(0,1fr))}}
    @media(max-width:560px){.catalog-tools{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}}
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
    <label>Brand<select id="catalogBrand"><option value="">All brands</option></select></label>
    <label>Storage<select id="catalogStorage"><option value="">All storage</option></select></label>
    <label>Condition<select id="catalogCondition"><option value="">All conditions</option></select></label>
    <label>Category<select id="catalogCategory"><option value="">All categories</option></select></label>
    <label>Minimum price (Ks)<input id="catalogMinPrice" type="number" min="0" step="1" inputmode="numeric" placeholder="No minimum"></label>
    <label>Maximum price (Ks)<input id="catalogMaxPrice" type="number" min="0" step="1" inputmode="numeric" placeholder="No maximum"></label>
    <label>Stock status<select id="catalogStock"><option value="all">All products</option><option value="in">In stock</option><option value="out">Out of stock</option></select></label>
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
    document.getElementById("catalogBrand").value = "";
    document.getElementById("catalogCategory").value = "";
    document.getElementById("catalogStorage").value = "";
    document.getElementById("catalogCondition").value = "";
    document.getElementById("catalogStock").value = "all";
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

function storageLabel(value) {
  if (value === "" || value == null) return "";
  const match = String(value).match(/[0-9]+(?:\\.[0-9]+)?/);
  return match ? Number(match[0]) + " GB" : String(value);
}

function conditionGroup(value) {
  const text = String(value || "").trim().toLocaleLowerCase();
  if (text.includes("refurb")) return "Refurbished";
  if (text.includes("new")) return "New";
  return value ? String(value) : "";
}

function inventoryProducts() {
  const listedAt = Date.now();
  return INVENTORY.map((product, index) => ({
    id: product.id,
    n: product.name,
    p: null,
    brand: product.brand,
    category: product.category,
    stock: product.stock,
    storageGb: product.storageGb,
    ramGb: product.ramGb,
    color: "",
    condition: "",
    t: "",
    i: product.imageUrl,
    createdAt: listedAt - index,
    isInventory: true
  }));
}

function fallbackProductImage(name) {
  const productName = String(name || "").trim().toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
  const catalogImages = [
    ["iphone15", "assets/iphone-15-blue-catalog.jpg"],
    ["iphone13", "assets/iphone-13-grade-a-catalog.jpg"],
    ["galaxys24", "assets/samsung-galaxy-s24-catalog.jpg"],
    ["galaxys23", "assets/samsung-galaxy-s23-grade-a-catalog.jpg"],
    ["xiaomi14", "assets/xiaomi-14-catalog.jpg"],
    ["infinixhot60pro", "assets/infinix-hot-60-pro-plus.jpg"],
    ["infinixhot40i", "assets/infinix-hot-40i.jpg"],
    ["itels25uitra", "assets/itel-s25-ultra.jpg"],
    ["itels25ultra", "assets/itel-s25-ultra.jpg"],
    ["itels25ultra", "assets/itel-s25-ultra.jpg"],
    ["huawelnova12s", "assets/huawei-nova-12s.jpg"],
    ["huaweinova12s", "assets/huawei-nova-12s.jpg"],
    ["huaweinovay61", "assets/huawei-nova-y61.jpg"],
    ["tecnospark40pro", "assets/tecno-spark-40-pro-plus.jpg"],
    ["tecnosparkgo1", "assets/tecno-spark-go-1.jpg"],
    ["tecnosparkgo2", "assets/tecno-spark-go-2.jpg"],
    ["honorx7a", "assets/honor-x7a.jpg"],
    ["oppox7", "assets/oppo-x7.jpg"],
    ["oppoa565g", "assets/oppo-a56-5g.jpg"],
    ["oppoa565g", "assets/oppo-a56-5g.jpg"],
    ["oppoa38", "assets/oppo-a38.jpg"],
    ["oppof11", "assets/oppo-f11.jpg"],
    ["oppoa15s", "assets/oppo-a15s.jpg"],
    ["oppoa31", "assets/oppo-a31.jpg"],
    ["oppoa11", "assets/oppo-a11.jpg"],
    ["redminote145g", "assets/redmi-note-14-5g.jpg"],
    ["redminote145g", "assets/redmi-note-14-5g.jpg"],
    ["redminote13pro", "assets/redmi-note-13-pro.jpg"],
    ["redminote135g", "assets/redmi-note-13-5g.jpg"],
    ["redminote13", "assets/redmi-note-13-catalog.jpg"],
    ["redminote12pro", "assets/redmi-note-12-pro.jpg"],
    ["redminote11pro", "assets/redmi-note-11-pro.jpg"],
    ["redminote115g", "assets/redmi-note-11-5g.jpg"],
    ["redminote10pro", "assets/redmi-note-10-pro.jpg"],
    ["redminote9", "assets/redmi-note-9.jpg"],
    ["redmik40", "assets/redmi-k40.jpg"],
    ["k40", "assets/redmi-k40.jpg"],
    ["redmi15c", "assets/redmi-15c.jpg"],
    ["redmi15", "assets/redmi-15.jpg"],
    ["redmi14c", "assets/redmi-14c.jpg"],
    ["redmi13c", "assets/redmi-13c.jpg"],
    ["redmi13r", "assets/redmi-13r.jpg"],
    ["redmi12", "assets/redmi-12.jpg"],
    ["redmi10x", "assets/redmi-10x.jpg"],
    ["redmi10a", "assets/redmi-10a.jpg"],
    ["redmi9a", "assets/redmi-9a.jpg"],
    ["redmi9", "assets/redmi-9.jpg"],
    ["redmia5", "assets/redmi-a5.jpg"],
    ["redmi8", "assets/redmi-8.jpg"]
  ];
  const match = catalogImages.find(([model]) => productName.includes(model));
  return match ? match[1] : "";
}

function renderCatalog() {
  if (!grid || !productState.loaded) return;
  ensureCatalogTools();

  const brandSelect = document.getElementById("catalogBrand");
  const categorySelect = document.getElementById("catalogCategory");
  const brand = brandSelect?.value || "";
  const category = categorySelect?.value || "";
  const storage = document.getElementById("catalogStorage")?.value || "";
  const condition = document.getElementById("catalogCondition")?.value || "";
  const minValue = document.getElementById("catalogMinPrice")?.value;
  const maxValue = document.getElementById("catalogMaxPrice")?.value;
  const min = minValue === "" || minValue == null ? null : Number(minValue);
  const max = maxValue === "" || maxValue == null ? null : Number(maxValue);
  const stock = document.getElementById("catalogStock")?.value || "all";
  const sort = document.getElementById("catalogSort")?.value || "newest";
  const term = String(window.searchQuery || "").trim().toLocaleLowerCase();

  let products = productState.all.filter(product => {
    const searchable = [product.n, product.brand, product.category, product.t, product.storageGb, product.ramGb, product.color, product.condition].join(" ").toLocaleLowerCase();
    return (!brand || brand === product.brand)
      && (!category || category === product.category)
      && (!storage || storageLabel(product.storageGb) === storage)
      && (!condition || conditionGroup(product.condition) === condition)
      && (min === null || (Number.isFinite(product.p) && product.p >= min))
      && (max === null || (Number.isFinite(product.p) && product.p <= max))
      && (stock === "all" || (stock === "in" ? product.stock > 0 : product.stock <= 0))
      && (!term || searchable.includes(term));
  });

  if (sort === "price-asc") products.sort((a, b) => (a.p == null) - (b.p == null) || ((a.p || 0) - (b.p || 0)));
  else if (sort === "price-desc") products.sort((a, b) => (a.p == null) - (b.p == null) || ((b.p || 0) - (a.p || 0)));
  else if (sort === "name-asc") products.sort((a, b) => a.n.localeCompare(b.n));
  else products.sort((a, b) => b.createdAt - a.createdAt);

  const summary = document.getElementById("catalogSummary");
  if (summary) summary.textContent = productState.error
    ? "Live inventory could not be reached. Showing the supplied WH Mobile stock list."
    : productState.usingInventory
      ? productState.all.length + " listed variants · prices change daily. Ask WH Mobile for today's price."
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
    const isApple = String(product.brand || "").trim().toLocaleLowerCase() === "apple";
    const specsToShow = isApple
      ? [
          product.storageGb ? (Number(product.storageGb) >= 1024 ? (Number(product.storageGb) / 1024) + " TB storage" : Number(product.storageGb) + " GB storage") : "",
          product.color,
          product.condition
        ]
      : [
          product.ramGb ? Number(product.ramGb) + " GB RAM" : "",
          product.condition
        ];
    specsToShow.filter(Boolean).forEach(value => {
      const chip = document.createElement("span");
      chip.textContent = value;
      specs.append(chip);
    });
    const hasPrice = Number.isFinite(product.p) && product.p > 0;
    const price = document.createElement("div");
    price.className = "price";
    price.textContent = hasPrice ? "Ks" + product.p.toLocaleString("en-US") : "Price updated daily";
    const stockLabel = document.createElement("div");
    stockLabel.className = "product-stock" + (product.stock > 0 ? " available" : "");
    stockLabel.textContent = product.stock > 0 ? "In stock · " + product.stock : "Out of stock";

    let action;
    if (hasPrice) {
      const add = document.createElement("button");
      add.className = "btn";
      add.type = "button";
      add.dataset.add = product.id;
      add.textContent = product.stock > 0 ? "Add to cart" : "Out of stock";
      add.disabled = product.stock <= 0;
      action = add;
    } else {
      const ask = document.createElement("a");
      ask.className = "btn";
      ask.href = "https://wa.me/959793777772?text=" + encodeURIComponent("Hi WH Mobile, what is today's price for " + product.n + "?");
      ask.target = "_blank";
      ask.rel = "noopener noreferrer";
      ask.textContent = product.stock > 0 ? "Ask for today's price" : "Check availability";
      action = ask;
    }

    card.append(photo, title);
    if (meta.textContent) card.append(meta);
    if (product.t) card.append(description);
    if (specs.childElementCount) card.append(specs);
    card.append(price, stockLabel, action);
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
      const productName = safeText(p.name || "Unnamed product");
      const stock = Number(p.stock ?? 0);
      const createdAt = p.createdAt?.toMillis?.() ?? (p.createdAt?.seconds ? p.createdAt.seconds * 1000 : 0);
      const category = safeText(p.category || "Other");
      // Legacy records use category values such as Apple or Samsung for their brand.
      const brand = safeText(p.brand || category);
      return {
        id: docSnap.id,
        n: productName,
        p: p.price == null || p.price === "" ? null : Number(p.price),
        salePrice: Number(p.salePrice ?? 0),
        brand,
        category,
        stock: Number.isFinite(stock) ? stock : 0,
        storageGb: p.storageGb == null ? "" : Number(String(p.storageGb).match(/[0-9]+(?:\\.[0-9]+)?/)?.[0] || NaN),
        ramGb: p.ramGb == null ? "" : Number(p.ramGb),
        color: safeText(p.color || ""),
        condition: safeText(p.condition || ""),
        t: safeText(p.description || ""),
        i: safeText(p.imageUrl || fallbackProductImage(productName)),
        createdAt
      };
    });
    if (!productState.all.length) {
      productState.all = inventoryProducts();
      productState.usingInventory = true;
    }
    productState.loaded = true;
    window.PHONES = productState.all;
    const brands = ["Apple", "Samsung", "Xiaomi", ...productState.all.map(product => product.brand)];
    const categories = productState.all.map(product => product.category);
    setOptions("catalogBrand", brands, "All brands");
    setOptions("catalogStorage", ["128 GB", "256 GB", "512 GB", ...productState.all.map(product => storageLabel(product.storageGb))], "All storage");
    setOptions("catalogCondition", ["New", "Refurbished", ...productState.all.map(product => conditionGroup(product.condition))], "All conditions");
    setOptions("catalogCategory", categories, "All categories");
    // Retain the existing category chips as quick shortcuts.
    window.cats = ["All"].concat([...new Set(categories)]);
    window.cur = "All";
    renderCatalog();
  } catch (error) {
    console.error("Could not load Firestore products:", error);
    productState.loaded = true;
    productState.error = true;
    productState.usingInventory = true;
    productState.all = inventoryProducts();
    window.PHONES = productState.all;
    setOptions("catalogBrand", ["Apple", "Samsung", "Xiaomi", ...productState.all.map(product => product.brand)], "All brands");
    setOptions("catalogStorage", ["64 GB", "128 GB", "256 GB", "512 GB", ...productState.all.map(product => storageLabel(product.storageGb))], "All storage");
    setOptions("catalogCondition", ["New", "Refurbished", ...productState.all.map(product => conditionGroup(product.condition))], "All conditions");
    setOptions("catalogCategory", [...new Set(productState.all.map(product => product.category))], "All categories");
    window.cats = ["All", ...new Set(productState.all.map(product => product.category))];
    window.cur = "All";
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
