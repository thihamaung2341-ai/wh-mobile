// Add to any page that needs login (orders, repair booking):
// <script type="module" src="auth-guard.js"></script>
// Optional: <button data-logout>Log out</button>
import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

onAuthStateChanged(auth, user => {
  if (!user) {
    const here = location.pathname.split("/").pop() + location.search;
    location.replace("login.html?next=" + encodeURIComponent(here));
  }
});
document.querySelectorAll("[data-logout]").forEach(b =>
  b.addEventListener("click", async () => { await signOut(auth); location.href = "login.html"; }));
