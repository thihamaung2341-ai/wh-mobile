import { db } from "./firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { INVENTORY } from "./inventory.js";

const $ = id => document.getElementById(id);
const productId = new URLSearchParams(window.location.search).get("id");

function numberOrNull(value) {
  if (value == null || value === "") return null;
  const match = String(value).match(/[0-9]+(?:\.[0-9]+)?/);
  if (!match) return null;
  const number = Number(match[0]);
  return /\bTB\b/i.test(String(value)) ? number * 1024 : number;
}

function storageLabel(value) {
  const gigabytes = numberOrNull(value);
  if (!gigabytes) return "";
  return gigabytes >= 1024 ? (gigabytes / 1024) + " TB" : gigabytes + " GB";
}

function cartRead() {
  try {
    const cart = JSON.parse(localStorage.getItem("wh-cart") || "[]");
    return Array.isArray(cart) ? cart : [];
  } catch {
    return [];
  }
}

function addToCart(product) {
  const cart = cartRead();
  const existing = cart.find(item => String(item.id) === String(product.id));
  if (existing) existing.qty = Number(existing.qty || 1) + 1;
  else cart.push({ id: product.id, name: product.name, price: product.price, image: product.imageUrl || "", qty: 1 });
  try {
    localStorage.setItem("wh-cart", JSON.stringify(cart));
    $("productActionStatus").textContent = product.name + " added to your cart.";
  } catch {
    $("productActionStatus").textContent = "Your browser could not save the cart. Please contact WH Mobile to order.";
  }
}

function addSpec(label, value) {
  if (!value) return;
  const group = document.createElement("div");
  const term = document.createElement("dt");
  const description = document.createElement("dd");
  term.textContent = label;
  description.textContent = value;
  group.append(term, description);
  $("productSpecs").append(group);
}

function showProduct(product) {
  const name = String(product.name || "Phone");
  const category = String(product.category || "Phone");
  const brand = String(product.brand || category);
  const storage = storageLabel(product.storageGb);
  const ramNumber = numberOrNull(product.ramGb);
  const ram = ramNumber ? ramNumber + " GB" : "";
  const color = String(product.color || "");
  const condition = String(product.condition || "");
  const description = String(product.description || "");
  const imageUrl = String(product.imageUrl || "");
  const stockNumber = Number(product.stock ?? 0);
  const stock = Number.isFinite(stockNumber) ? stockNumber : 0;
  const priceNumber = product.price == null || product.price === "" ? null : Number(product.price);
  const hasPrice = Number.isFinite(priceNumber) && priceNumber > 0;

  document.title = name + " | WH Mobile";
  $("productState").hidden = true;
  $("productDetail").hidden = false;
  $("productMeta").textContent = [brand, category].filter(Boolean).join(" · ");
  $("productName").textContent = name;
  $("productSpecs").replaceChildren();
  addSpec("Storage", storage);
  addSpec("RAM", ram);
  addSpec("Color", color);
  addSpec("Condition", condition);
  addSpec("Availability", stock > 0 ? "In stock · " + stock : "Out of stock");

  if (imageUrl) {
    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = name;
    image.loading = "eager";
    $("productPhoto").replaceChildren(image);
    $("productPhoto").hidden = false;
  } else {
    $("productPhoto").replaceChildren();
    $("productPhoto").hidden = true;
  }

  if (description) {
    $("productDescription").textContent = description;
    $("productDescription").hidden = false;
    $("productContactNote").hidden = true;
  } else {
    $("productDescription").hidden = true;
    $("productContactNote").textContent = "Contact WH Mobile to confirm any additional specifications, included accessories, or product condition details.";
    $("productContactNote").hidden = false;
  }

  $("productPrice").textContent = hasPrice ? "Ks" + priceNumber.toLocaleString("en-US") : "Price updated daily";
  const actions = $("productActions");
  actions.replaceChildren();
  if (hasPrice && stock > 0) {
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "btn";
    addButton.textContent = "Add to cart";
    addButton.addEventListener("click", () => addToCart({ id: product.id || productId, name, price: priceNumber, imageUrl }));
    actions.append(addButton);
  } else {
    const ask = document.createElement("a");
    ask.className = "btn";
    ask.href = "https://wa.me/959793777772?text=" + encodeURIComponent("Hi WH Mobile, please confirm today's price and availability for " + name + ".");
    ask.target = "_blank";
    ask.rel = "noopener noreferrer";
    ask.textContent = stock > 0 ? "Ask for today's price" : "Check availability";
    actions.append(ask);
  }
}

async function loadProduct() {
  if (!productId) {
    $("productState").textContent = "This product link is missing its product ID. Browse the shop to choose a phone.";
    return;
  }

  try {
    const snapshot = await getDoc(doc(db, "products", productId));
    if (snapshot.exists()) {
      const product = snapshot.data();
      if (product.active === false) {
        $("productState").textContent = "This listing is currently unavailable. Browse the shop or contact WH Mobile.";
        return;
      }
      showProduct({ ...product, id: snapshot.id });
      return;
    }
    const fallback = INVENTORY.find(item => String(item.id) === productId);
    if (fallback) {
      showProduct({
        ...fallback,
        name: fallback.name,
        price: null,
        color: "",
        description: "",
        imageUrl: fallback.imageUrl || ""
      });
      return;
    }
    $("productState").textContent = "We couldn’t find that product. Browse the shop to see current listings.";
  } catch (error) {
    const fallback = INVENTORY.find(item => String(item.id) === productId);
    if (fallback) {
      showProduct({ ...fallback, name: fallback.name, price: null, color: "", description: "", imageUrl: fallback.imageUrl || "" });
      return;
    }
    console.error("Could not load product details:", error);
    $("productState").textContent = "Product details are temporarily unavailable. Please check your connection or contact WH Mobile.";
  }
}

loadProduct();

