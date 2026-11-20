import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { createPriceContactChooser } from "./price-contact-links.js?v=wh-mobile-price-contacts-20261120-1";
import {
  collection, doc, getDoc, getDocs, limit, orderBy, query,
  serverTimestamp, where, writeBatch
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { INVENTORY } from "./inventory.js";

const $ = id => document.getElementById(id);
const productId = new URLSearchParams(window.location.search).get("id");
const MAX_REVIEWS = 20;
let currentProduct = null;
let firestoreProductAvailable = false;
let reviewUser = null;
let reviewAuthCheck = 0;
let reviewRecords = [];

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

function safeImageUrl(value) {
  if (!value || typeof value !== "string") return "";
  try {
    const url = new URL(value, window.location.href);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
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

function galleryUrls(product) {
  const candidates = [];
  if (product.imageUrl) candidates.push(product.imageUrl);
  const extras = Array.isArray(product.galleryImages) ? product.galleryImages : [];
  extras.forEach(item => {
    if (typeof item === "string") candidates.push(item);
    else if (item && typeof item === "object") candidates.push(item.imageUrl || item.url || "");
  });
  return [...new Set(candidates.map(safeImageUrl).filter(Boolean))].slice(0, 6);
}

function renderGallery(product) {
  const root = $("productPhoto");
  const thumbnails = $("productGallery");
  const urls = galleryUrls(product);
  const name = String(product.name || "Product");
  root.replaceChildren();
  thumbnails.replaceChildren();
  root.hidden = false;

  if (!urls.length) {
    const placeholder = document.createElement("span");
    placeholder.className = "product-photo-placeholder";
    placeholder.textContent = "Product photo coming soon";
    root.append(placeholder);
    thumbnails.hidden = true;
    return;
  }

  const hero = document.createElement("img");
  hero.src = urls[0];
  hero.alt = name;
  hero.loading = "eager";
  hero.decoding = "async";
  root.append(hero);

  urls.forEach((url, index) => {
    const button = document.createElement("button");
    button.className = "product-thumbnail";
    button.type = "button";
    button.setAttribute("aria-label", "Show photo " + (index + 1) + " of " + name);
    button.setAttribute("aria-pressed", index === 0 ? "true" : "false");
    const image = document.createElement("img");
    image.src = url;
    image.alt = "";
    image.loading = "lazy";
    button.append(image);
    button.addEventListener("click", () => {
      hero.src = url;
      hero.alt = name + " · photo " + (index + 1);
      thumbnails.querySelectorAll("button").forEach((other, otherIndex) => {
        other.setAttribute("aria-pressed", otherIndex === index ? "true" : "false");
      });
    });
    thumbnails.append(button);
  });
  thumbnails.hidden = urls.length < 2;
}

function updateShareLinks(product) {
  const title = String(product.name || "Product");
  const url = window.location.href.split("#")[0];
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  $("telegramShare").href = "https://t.me/share/url?url=" + encodedUrl + "&text=" + encodedTitle;
  $("viberShare").href = "viber://forward?text=" + encodeURIComponent(title + " " + url);
}

function closeShareMenu(returnFocus = false) {
  $("shareMenu").hidden = true;
  $("shareToggle").setAttribute("aria-expanded", "false");
  if (returnFocus) $("shareToggle").focus();
}

async function copyProductLink() {
  const url = window.location.href.split("#")[0];
  try {
    await navigator.clipboard.writeText(url);
    $("shareStatus").textContent = "Product link copied.";
  } catch {
    const field = document.createElement("textarea");
    field.value = url;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.append(field);
    field.select();
    let copied = false;
    try { copied = document.execCommand("copy"); } catch {}
    field.remove();
    $("shareStatus").textContent = copied ? "Product link copied." : "Copy this link: " + url;
  }
}

$("shareToggle").addEventListener("click", () => {
  const opening = $("shareMenu").hidden;
  $("shareMenu").hidden = !opening;
  $("shareToggle").setAttribute("aria-expanded", opening ? "true" : "false");
  if (opening) $("shareMenu").querySelector('[role="menuitem"]')?.focus();
});
$("copyProductLink").addEventListener("click", async () => {
  closeShareMenu();
  await copyProductLink();
});
$("nativeShare").addEventListener("click", async () => {
  closeShareMenu();
  if (!currentProduct) return;
  if (navigator.share) {
    try {
      await navigator.share({ title: String(currentProduct.name || "WH Mobile product"), url: window.location.href.split("#")[0] });
    } catch (error) {
      if (error?.name !== "AbortError") $("shareStatus").textContent = "Sharing is not available right now.";
    }
  } else {
    await copyProductLink();
  }
});
document.addEventListener("click", event => {
  if (!$("shareWrap").contains(event.target)) closeShareMenu();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !$("shareMenu").hidden) closeShareMenu(true);
});

function starText(rating) {
  const fullStars = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  return "★".repeat(fullStars) + "☆".repeat(5 - fullStars);
}

function renderReviewSummary() {
  const count = reviewRecords.length;
  const average = count
    ? reviewRecords.reduce((total, item) => total + Number(item.rating || 0), 0) / count
    : null;
  const summaryStars = $("reviewSummaryStars");
  const productStars = $("productRatingStars");
  summaryStars.textContent = average == null ? "☆☆☆☆☆" : starText(average);
  summaryStars.setAttribute("aria-label", average == null ? "No ratings yet" : average.toFixed(1) + " out of 5 stars");
  productStars.textContent = average == null ? "☆☆☆☆☆" : starText(average);
  $("reviewAverage").textContent = average == null ? "—" : average.toFixed(1);
  $("reviewCount").textContent = count
    ? count + (count === 1 ? " recent review" : " recent reviews") + (count === MAX_REVIEWS ? " · latest 20 shown" : "")
    : "No reviews yet";
  $("productRatingLabel").textContent = count
    ? average.toFixed(1) + " (" + count + (count === MAX_REVIEWS ? "+" : "") + ") · Read reviews"
    : "No reviews yet · Write the first review";
}

function formatReviewDate(value) {
  try {
    const date = value?.toDate ? value.toDate() : null;
    return date ? date.toLocaleDateString() : "Recently";
  } catch {
    return "Recently";
  }
}

function renderReviews() {
  const root = $("reviewList");
  root.replaceChildren();
  if (!reviewRecords.length) {
    const empty = document.createElement("p");
    empty.className = "review-empty";
    empty.textContent = "No reviews yet. Sign in to share the first review for this product.";
    root.append(empty);
    renderReviewSummary();
    return;
  }

  reviewRecords.forEach(review => {
    const card = document.createElement("article");
    card.className = "review-card";
    const header = document.createElement("div");
    header.className = "review-card-head";
    const authorWrap = document.createElement("div");
    const author = document.createElement("p");
    author.className = "review-card-name";
    author.textContent = String(review.displayName || "WH Mobile customer");
    const stars = document.createElement("span");
    stars.className = "review-stars";
    stars.textContent = starText(review.rating);
    stars.setAttribute("aria-label", String(review.rating) + " out of 5 stars");
    const date = document.createElement("time");
    date.className = "review-card-date";
    date.textContent = formatReviewDate(review.createdAt);
    authorWrap.append(author, stars);
    header.append(authorWrap, date);
    card.append(header);
    if (review.title) {
      const title = document.createElement("h3");
      title.className = "review-card-title";
      title.textContent = String(review.title);
      card.append(title);
    }
    const body = document.createElement("p");
    body.className = "review-card-body";
    body.textContent = String(review.body || "");
    card.append(body);
    root.append(card);
  });
  renderReviewSummary();
}

async function loadReviews() {
  const root = $("reviewList");
  if (!firestoreProductAvailable || !productId) {
    reviewRecords = [];
    root.replaceChildren();
    const note = document.createElement("p");
    note.className = "review-empty";
    note.textContent = "Reviews are not available for this listing yet.";
    root.append(note);
    renderReviewSummary();
    return;
  }
  try {
    const ref = collection(db, "products", productId, "reviews");
    const snapshot = await getDocs(query(ref, orderBy("createdAt", "desc"), limit(MAX_REVIEWS)));
    reviewRecords = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    renderReviews();
  } catch (error) {
    console.warn("Could not load product reviews:", error);
    reviewRecords = [];
    root.replaceChildren();
    const note = document.createElement("p");
    note.className = "review-empty";
    note.textContent = "Customer reviews are temporarily unavailable. Please try again later.";
    root.append(note);
    renderReviewSummary();
  }
}

function setReviewGate(message, showLinks = false) {
  const gate = $("reviewAuthGate");
  gate.replaceChildren(document.createTextNode(message));
  if (showLinks) {
    const separator = document.createTextNode(" ");
    const login = document.createElement("a");
    login.href = "login.html?next=" + encodeURIComponent("product.html?id=" + productId);
    login.textContent = "Log in";
    const middle = document.createTextNode(" or ");
    const register = document.createElement("a");
    register.href = "register.html?next=" + encodeURIComponent("product.html?id=" + productId);
    register.textContent = "create an account";
    gate.append(separator, login, middle, register, document.createTextNode("."));
  }
}

async function updateReviewComposer(user) {
  const gate = $("reviewAuthGate");
  const form = $("reviewForm");
  const token = ++reviewAuthCheck;
  form.hidden = true;
  gate.hidden = false;

  if (!firestoreProductAvailable || !productId) {
    setReviewGate("Reviews are not available for this listing yet.");
    return;
  }
  if (!user) {
    setReviewGate("Sign in to share your experience.", true);
    return;
  }

  setReviewGate("Checking your review access…");
  try {
    const prior = await getDoc(doc(db, "customers", user.uid, "productReviewIndex", productId));
    if (token !== reviewAuthCheck) return;
    if (prior.exists()) {
      setReviewGate("You have already reviewed this product from this account.");
      return;
    }
    gate.hidden = true;
    form.hidden = false;
    if (!$("reviewDisplayName").value && user.displayName) $("reviewDisplayName").value = user.displayName.slice(0, 60);
  } catch (error) {
    if (token !== reviewAuthCheck) return;
    console.warn("Could not check review status:", error);
    setReviewGate("Reviews are temporarily unavailable. Please try again later.");
  }
}

function chooseRating(value) {
  $("reviewRating").value = String(value);
  $("reviewStars").querySelectorAll("button").forEach(button => {
    const selected = Number(button.dataset.rating) <= value;
    button.setAttribute("aria-checked", selected && Number(button.dataset.rating) === value ? "true" : "false");
    button.textContent = selected ? "★" : "☆";
  });
}

$("reviewStars").addEventListener("click", event => {
  const button = event.target.closest("button[data-rating]");
  if (button) chooseRating(Number(button.dataset.rating));
});
$("reviewStars").addEventListener("keydown", event => {
  const current = Number($("reviewRating").value || 5);
  if (event.key === "ArrowRight" || event.key === "ArrowUp") {
    event.preventDefault();
    chooseRating(Math.min(5, current + 1));
    $("reviewStars").querySelector('[data-rating="' + Math.min(5, current + 1) + '"]').focus();
  } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
    event.preventDefault();
    chooseRating(Math.max(1, current - 1));
    $("reviewStars").querySelector('[data-rating="' + Math.max(1, current - 1) + '"]').focus();
  }
});

$("reviewForm").addEventListener("submit", async event => {
  event.preventDefault();
  const user = reviewUser;
  if (!user || !firestoreProductAvailable || !productId) return;
  const rating = Number($("reviewRating").value);
  const body = $("reviewBody").value.trim();
  const title = $("reviewTitle").value.trim();
  const displayName = ($("reviewDisplayName").value.trim() || user.displayName?.trim() || "WH Mobile customer").slice(0, 60);
  if (rating < 1 || rating > 5 || body.length < 10 || body.length > 1200) {
    $("reviewStatus").textContent = "Choose a star rating and write a review of at least 10 characters.";
    return;
  }

  const submit = $("reviewSubmit");
  submit.disabled = true;
  submit.textContent = "Submitting…";
  $("reviewStatus").textContent = "";
  try {
    const reviewRef = doc(collection(db, "products", productId, "reviews"));
    const indexRef = doc(db, "customers", user.uid, "productReviewIndex", productId);
    const prior = await getDoc(indexRef);
    if (prior.exists()) {
      $("reviewStatus").textContent = "This account has already reviewed this product.";
      await updateReviewComposer(user);
      return;
    }
    const review = {
      displayName,
      rating,
      title,
      body,
      createdAt: serverTimestamp()
    };
    const batch = writeBatch(db);
    batch.set(reviewRef, review);
    batch.set(indexRef, { reviewId: reviewRef.id, createdAt: serverTimestamp() });
    await batch.commit();
    $("reviewStatus").textContent = "Thanks for sharing your review.";
    $("reviewForm").reset();
    chooseRating(5);
    await loadReviews();
    await updateReviewComposer(user);
  } catch (error) {
    console.error("Could not submit product review:", error);
    $("reviewStatus").textContent = "We couldn't submit your review right now. Please try again later.";
  } finally {
    submit.disabled = false;
    submit.textContent = "Submit review";
  }
});

function relatedCard(product) {
  const card = document.createElement("a");
  card.className = "related-card";
  card.href = "product.html?id=" + encodeURIComponent(String(product.id));
  const imageWrap = document.createElement("div");
  imageWrap.className = "related-card-image";
  const imageUrl = safeImageUrl(product.imageUrl);
  if (imageUrl) {
    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = String(product.name || "Product");
    image.loading = "lazy";
    imageWrap.append(image);
  } else {
    const placeholder = document.createElement("span");
    placeholder.className = "product-photo-placeholder";
    placeholder.textContent = "Photo coming soon";
    imageWrap.append(placeholder);
  }
  const copy = document.createElement("div");
  copy.className = "related-card-copy";
  const brand = document.createElement("p");
  brand.className = "related-card-brand";
  brand.textContent = String(product.brand || product.category || "WH Mobile");
  const name = document.createElement("p");
  name.className = "related-card-name";
  name.textContent = String(product.name || "Product");
  const price = document.createElement("p");
  price.className = "related-card-price";
  const priceNumber = Number(product.price);
  price.textContent = Number.isFinite(priceNumber) && priceNumber > 0
    ? "Ks" + priceNumber.toLocaleString("en-US")
    : "Contact for price";
  copy.append(brand, name, price);
  card.append(imageWrap, copy);
  return card;
}

async function loadRelatedProducts(product) {
  const section = $("relatedSection");
  const root = $("relatedProducts");
  const products = [];
  const ids = new Set();
  const add = item => {
    const id = String(item.id || "");
    if (!id || id === String(product.id || productId) || ids.has(id)) return;
    ids.add(id);
    products.push({ ...item, id });
  };
  try {
    const snapshot = await getDocs(query(collection(db, "products"), where("active", "==", true)));
    snapshot.docs.forEach(item => add({ ...item.data(), id: item.id }));
  } catch (error) {
    console.warn("Could not load related Firestore products:", error);
  }
  INVENTORY.forEach(item => add(item));

  const brand = String(product.brand || "").toLowerCase();
  const category = String(product.category || "").toLowerCase();
  products.sort((a, b) => {
    const score = item => (brand && String(item.brand || "").toLowerCase() === brand ? 2 : 0) +
      (category && String(item.category || "").toLowerCase() === category ? 1 : 0);
    return score(b) - score(a);
  });
  root.replaceChildren();
  products.slice(0, 4).forEach(item => root.append(relatedCard(item)));
  section.hidden = !root.children.length;
}

function showProduct(product, fromFirestore = false) {
  currentProduct = product;
  firestoreProductAvailable = fromFirestore;
  const name = String(product.name || "Phone");
  const category = String(product.category || "Phone");
  const brand = String(product.brand || category);
  const storage = storageLabel(product.storageGb);
  const ramNumber = numberOrNull(product.ramGb);
  const ram = ramNumber ? ramNumber + " GB" : "";
  const color = String(product.color || "");
  const condition = String(product.condition || "");
  const description = String(product.description || "");
  const stockNumber = Number(product.stock ?? 0);
  const stock = Number.isFinite(stockNumber) ? stockNumber : 0;
  const priceNumber = product.price == null || product.price === "" ? null : Number(product.price);
  const hasPrice = Number.isFinite(priceNumber) && priceNumber > 0;

  document.title = name + " | WH Mobile";
  $("productState").hidden = true;
  $("productDetail").hidden = false;
  $("reviews").hidden = false;
  $("productMeta").textContent = [brand, category].filter(Boolean).join(" · ");
  $("productName").textContent = name;
  $("productSpecs").replaceChildren();
  $("productAvailability").textContent = stock > 0 ? "● In stock · " + stock + (stock === 1 ? " available" : " available") : "● Out of stock";
  $("productAvailability").classList.toggle("out-of-stock", stock <= 0);
  addSpec("Storage", storage);
  addSpec("RAM", ram);
  addSpec("Color", color);
  addSpec("Condition", condition);
  renderGallery(product);
  updateShareLinks(product);

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
    addButton.addEventListener("click", () => addToCart({ id: product.id || productId, name, price: priceNumber, imageUrl: product.imageUrl || "" }));
    actions.append(addButton);
  } else {
    actions.append(createPriceContactChooser(name, stock > 0 ? "Ask for today's price" : "Check availability"));
  }
  const phone = document.createElement("a");
  phone.className = "product-secondary-action";
  phone.href = "tel:+959793777772";
  phone.textContent = "Call WH Mobile";
  actions.append(phone);
}

async function loadProduct() {
  if (!productId || productId.includes("/") || productId.length > 150) {
    $("productState").textContent = "This product link is missing a valid product ID. Browse the shop to choose a phone.";
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
      const completeProduct = { ...product, id: snapshot.id };
      showProduct(completeProduct, true);
      await Promise.all([loadReviews(), loadRelatedProducts(completeProduct), updateReviewComposer(reviewUser)]);
      return;
    }
    const fallback = INVENTORY.find(item => String(item.id) === productId);
    if (fallback) {
      const completeProduct = {
        ...fallback,
        name: fallback.name,
        price: null,
        color: "",
        description: "",
        imageUrl: fallback.imageUrl || ""
      };
      showProduct(completeProduct, false);
      await Promise.all([loadReviews(), loadRelatedProducts(completeProduct), updateReviewComposer(reviewUser)]);
      return;
    }
    $("productState").textContent = "We couldn’t find that product. Browse the shop to see current listings.";
  } catch (error) {
    const fallback = INVENTORY.find(item => String(item.id) === productId);
    if (fallback) {
      const completeProduct = { ...fallback, name: fallback.name, price: null, color: "", description: "", imageUrl: fallback.imageUrl || "" };
      showProduct(completeProduct, false);
      await Promise.all([loadReviews(), loadRelatedProducts(completeProduct), updateReviewComposer(reviewUser)]);
      return;
    }
    console.error("Could not load product details:", error);
    $("productState").textContent = "Product details are temporarily unavailable. Please check your connection or contact WH Mobile.";
  }
}

chooseRating(5);
onAuthStateChanged(auth, user => {
  reviewUser = user;
  if (currentProduct) updateReviewComposer(user);
});
loadProduct();
