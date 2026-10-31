import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

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
