import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { collection, doc, getDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { INVENTORY } from "./inventory.js";

const trigger = document.getElementById("headerAccountButton");
const menu = document.getElementById("headerAccountMenu");
const nameLabel = document.getElementById("headerAccountName");
const signOutButton = document.getElementById("headerSignOut");
let currentUser = null;
let authReady = false;
let profileRequest = 0;

if (trigger && menu && nameLabel) {
  trigger.addEventListener("click", event => {
    if (!authReady) {
      event.preventDefault();
      return;
    }
    if (!currentUser) return;
    event.preventDefault();
    menu.hidden = !menu.hidden;
    trigger.setAttribute("aria-expanded", String(!menu.hidden));
  });

  document.addEventListener("click", event => {
    if (!menu.hidden && !event.target.closest(".header-account-wrap")) {
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !menu.hidden) {
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      trigger.focus();
    }
  });

  signOutButton?.addEventListener("click", async () => {
    signOutButton.disabled = true;
    try {
      await signOut(auth);
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
    } catch (error) {
      console.error("Could not sign out:", error);
      nameLabel.textContent = "Could not sign out. Please try again.";
    } finally {
      signOutButton.disabled = false;
    }
  });

  onAuthStateChanged(auth, async user => {
    currentUser = user;
    authReady = true;
    const request = ++profileRequest;

    if (!user) {
      trigger.textContent = "Sign in";
      trigger.href = "login.html?next=index.html";
      trigger.title = "Sign in to your WH Mobile account";
      trigger.setAttribute("aria-label", "Sign in");
      trigger.setAttribute("aria-expanded", "false");
      menu.hidden = true;
      nameLabel.textContent = "";
      return;
    }

    let name = user.displayName || "";
    if (!name) {
      try {
        const profile = await getDoc(doc(db, "customers", user.uid));
        if (profile.exists()) name = String(profile.data().name || "");
      } catch (error) {
        console.warn("Could not load the saved account name:", error);
      }
    }
    if (request !== profileRequest) return;

    name = name || user.email?.split("@")[0] || "My account";
    trigger.textContent = name;
    trigger.href = "account.html";
    trigger.title = "Open account options";
    trigger.setAttribute("aria-label", "Account options for " + name);
    nameLabel.textContent = "Signed in as " + name;
  });
}

initCategoryDropdown();

function initCategoryDropdown() {
  const nav = document.querySelector(".main-nav");
  if (!nav) return;

  const categoryLink = [...nav.querySelectorAll("a")].find(link =>
    link.textContent.trim().toLocaleLowerCase() === "categories" ||
    new URL(link.href, window.location.href).pathname.endsWith("/categories.html")
  );
  if (!categoryLink) return;

  const wrapper = document.createElement("div");
  wrapper.className = "nav-category-dropdown";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "nav-category-trigger";
  button.setAttribute("aria-haspopup", "menu");
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-controls", "categoryDropdownMenu");
  button.innerHTML = '<span>Categories</span><span class="nav-category-chevron" aria-hidden="true">⌄</span>';
  wrapper.append(button);

  const dropdown = document.createElement("div");
  dropdown.id = "categoryDropdownMenu";
  dropdown.className = "nav-category-menu";
  dropdown.setAttribute("role", "menu");
  dropdown.setAttribute("aria-label", "Product categories");
  dropdown.hidden = true;

  const list = document.createElement("div");
  list.className = "nav-category-list";
  const loading = document.createElement("p");
  loading.className = "nav-category-empty";
  loading.textContent = "Loading categories…";
  list.append(loading);

  const shopLink = document.createElement("a");
  shopLink.className = "nav-category-shop";
  shopLink.href = "index.html#phones";
  shopLink.innerHTML = '<span>Shop</span><span aria-hidden="true">→</span>';
  dropdown.append(list, shopLink);
  categoryLink.replaceWith(wrapper);
  document.body.append(dropdown);

  const style = document.createElement("style");
  style.id = "categoryDropdownStyles";
  style.textContent = `
    .nav-category-dropdown{display:flex;align-items:center;flex:0 0 auto}
    .nav-category-trigger{display:inline-flex;align-items:center;gap:7px;min-height:40px;padding:0 12px;border:0;border-radius:0;background:transparent;color:inherit;font:inherit;font-weight:750;white-space:nowrap;cursor:pointer}
    .nav-category-trigger:hover,.nav-category-trigger:focus-visible,.nav-category-trigger[aria-expanded="true"]{background:#e90012;color:#fff;outline:none}
    .nav-category-chevron{font-size:16px;line-height:1;transition:transform .16s ease}
    .nav-category-trigger[aria-expanded="true"] .nav-category-chevron{transform:rotate(180deg)}
    .nav-category-menu{position:fixed;z-index:3000;display:flex;flex-direction:column;width:360px;max-width:calc(100vw - 24px);max-height:min(72vh,560px);padding:10px 10px 0;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 18px 18px;background:#fff;color:#334155;box-shadow:0 14px 32px rgba(15,23,42,.18)}
    .nav-category-menu[hidden]{display:none!important}
    .nav-category-list{min-height:0;overflow-y:auto;padding:2px 0 10px;overscroll-behavior:contain}
    .nav-category-item{display:flex;align-items:center;justify-content:space-between;gap:14px;min-height:44px;padding:8px 14px;border-radius:8px;color:#374151;text-decoration:none;font-size:14px;font-weight:500;text-transform:uppercase}
    .nav-category-item:hover,.nav-category-item:focus-visible{background:#f5f6f8;color:#111827;outline:none}
    .nav-category-count{display:inline-flex;align-items:center;justify-content:center;min-width:34px;height:23px;padding:0 8px;border-radius:999px;background:#f1f2f4;color:#586174;font-size:12px;font-weight:700}
    .nav-category-empty{margin:10px 14px;color:#6b7280;font-size:14px}
    .nav-category-shop{display:flex;align-items:center;justify-content:space-between;min-height:47px;margin-top:auto;padding:0 14px;border-top:1px solid #eceef1;color:#d90012;text-decoration:none;font-size:13px;font-weight:800}
    .nav-category-shop:hover,.nav-category-shop:focus-visible{color:#a9000e;outline:none}
    @media(max-width:680px){.nav-category-menu{max-height:min(68vh,520px);border-radius:0 0 16px 16px}.nav-category-trigger{padding:0 10px}}
  `;
  document.head.append(style);

  let open = false;
  const setOpen = value => {
    open = value;
    dropdown.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
    if (open) positionDropdown();
  };

  function positionDropdown() {
    if (!open) return;
    const rect = button.getBoundingClientRect();
    const width = Math.min(360, window.innerWidth - 24);
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
    const top = Math.max(8, Math.min(rect.bottom, window.innerHeight - 150));
    dropdown.style.width = `${width}px`;
    dropdown.style.left = `${left}px`;
    dropdown.style.top = `${top}px`;
  }

  function renderCategories(categories) {
    list.replaceChildren();
    if (!categories.length) {
      const empty = document.createElement("p");
      empty.className = "nav-category-empty";
      empty.textContent = "No categories available yet.";
      list.append(empty);
      return;
    }

    for (const [name, count] of categories) {
      const item = document.createElement("a");
      item.className = "nav-category-item";
      item.href = `index.html?category=${encodeURIComponent(name)}#phones`;
      item.setAttribute("role", "menuitem");

      const label = document.createElement("span");
      label.textContent = name;
      const badge = document.createElement("span");
      badge.className = "nav-category-count";
      badge.textContent = String(count);
      item.append(label, badge);
      list.append(item);
    }
  }

  function getInventoryCategories() {
    const counts = new Map();
    for (const product of INVENTORY) {
      const category = String(product.category || "Other").trim() || "Other";
      counts.set(category, (counts.get(category) || 0) + 1);
    }
    return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
  }

  async function loadCategories() {
    try {
      const snapshot = await getDocs(query(collection(db, "products"), where("active", "==", true)));
      const counts = new Map();
      snapshot.forEach(productDoc => {
        const product = productDoc.data();
        const category = String(product.category || "Other").trim() || "Other";
        counts.set(category, (counts.get(category) || 0) + 1);
      });
      if (counts.size) return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
    } catch (error) {
      console.warn("Could not load category counts:", error);
    }
    return getInventoryCategories();
  }

  button.addEventListener("click", () => setOpen(!open));
  document.addEventListener("click", event => {
    if (open && !wrapper.contains(event.target) && !dropdown.contains(event.target)) setOpen(false);
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && open) {
      setOpen(false);
      button.focus();
    }
  });
  window.addEventListener("resize", positionDropdown);
  window.addEventListener("scroll", positionDropdown, true);

  loadCategories().then(renderCategories);
}
