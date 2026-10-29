import { auth } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendPasswordResetEmail, updateProfile
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const T = {
  en: {
    loginTitle: "Log in", registerTitle: "Create your account",
    loginSub: "Log in to buy phones and book repairs.",
    registerSub: "One account for orders and repair bookings.",
    name: "Full name", email: "Email", password: "Password", confirm: "Confirm password",
    loginBtn: "Log in", registerBtn: "Create account", forgot: "Forgot password?",
    noAccount: "No account yet?", haveAccount: "Already have an account?",
    toRegister: "Create one", toLogin: "Log in", home: "Back to shop",
    working: "Please wait…", welcome: "Success. Redirecting…",
    resetSent: "Password reset link sent. Check your email.",
    needEmail: "Enter your email first.",
    mismatch: "The two passwords don't match.",
    badLogin: "Wrong email or password.",
    inUse: "An account with this email already exists. Log in instead.",
    weak: "Password must be at least 6 characters.",
    badEmail: "That email address isn't valid.",
    tooMany: "Too many attempts. Wait a few minutes and try again.",
    network: "Can't connect. Check your internet and try again.",
    generic: "Something went wrong. Try again."
  },
  my: {
    loginTitle: "အကောင့်ဝင်ရန်", registerTitle: "အကောင့်ဖွင့်ရန်",
    loginSub: "ဖုန်းဝယ်ရန်နှင့် ပြုပြင်ရန် ဘိုကင်တင်ရန် အကောင့်ဝင်ပါ။",
    registerSub: "မှာယူမှုနှင့် ပြုပြင်ရေး ဘိုကင်အတွက် အကောင့်တစ်ခုတည်း။",
    name: "အမည်အပြည့်အစုံ", email: "အီးမေးလ်", password: "စကားဝှက်", confirm: "စကားဝှက် အတည်ပြုရန်",
    loginBtn: "အကောင့်ဝင်ရန်", registerBtn: "အကောင့်ဖွင့်ရန်", forgot: "စကားဝှက် မေ့နေပါသလား?",
    noAccount: "အကောင့် မရှိသေးဘူးလား?", haveAccount: "အကောင့် ရှိပြီးသားလား?",
    toRegister: "အကောင့်ဖွင့်ပါ", toLogin: "အကောင့်ဝင်ပါ", home: "ဆိုင်သို့ ပြန်သွားရန်",
    working: "ခဏစောင့်ပါ…", welcome: "အောင်မြင်ပါသည်။ ဆက်သွားနေသည်…",
    resetSent: "စကားဝှက်ပြန်သတ်မှတ်ရန် လင့်ခ်ကို အီးမေးလ်သို့ ပို့လိုက်ပါပြီ။",
    needEmail: "အီးမေးလ်ကို အရင်ရိုက်ထည့်ပါ။",
    mismatch: "စကားဝှက် နှစ်ခု မတူပါ။",
    badLogin: "အီးမေးလ် သို့မဟုတ် စကားဝှက် မှားနေပါသည်။",
    inUse: "ဤအီးမေးလ်ဖြင့် အကောင့် ရှိပြီးသားဖြစ်ပါသည်။ အကောင့်ဝင်ပါ။",
    weak: "စကားဝှက်သည် အနည်းဆုံး ၆ လုံး ရှိရပါမည်။",
    badEmail: "အီးမေးလ် လိပ်စာ မမှန်ပါ။",
    tooMany: "ကြိုးစားမှု များလွန်းသည်။ မိနစ်အနည်းငယ်စောင့်ပြီး ပြန်စမ်းပါ။",
    network: "ချိတ်ဆက်မှု မရပါ။ အင်တာနက်စစ်ပြီး ပြန်စမ်းပါ။",
    generic: "တစ်ခုခု မှားယွင်းသွားသည်။ ပြန်စမ်းပါ။"
  }
};

const ERR = {
  "auth/invalid-credential": "badLogin", "auth/user-not-found": "badLogin",
  "auth/wrong-password": "badLogin", "auth/email-already-in-use": "inUse",
  "auth/weak-password": "weak", "auth/invalid-email": "badEmail",
  "auth/too-many-requests": "tooMany", "auth/network-request-failed": "network"
};

let lang = "en", last = null;
try { lang = localStorage.getItem("wh-lang") || "en"; } catch (e) {}
const msg = document.getElementById("msg");

function show(key, type) {
  last = key ? { key, type } : null;
  msg.textContent = key ? T[lang][key] : "";
  msg.className = "msg " + (type || "");
}

function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach(el => el.textContent = T[lang][el.dataset.i18n]);
  document.querySelectorAll("[data-ph]").forEach(el => el.placeholder = T[lang][el.dataset.ph]);
  document.querySelectorAll("[data-lang]").forEach(b => b.setAttribute("aria-pressed", b.dataset.lang === lang));
  if (last) show(last.key, last.type);
}

document.querySelectorAll("[data-lang]").forEach(b => b.addEventListener("click", () => {
  lang = b.dataset.lang;
  try { localStorage.setItem("wh-lang", lang); } catch (e) {}
  applyLang();
}));

function nextPage() {
  const n = new URLSearchParams(location.search).get("next");
  return n && /^[\w\-./?=&%]+$/.test(n) && !n.startsWith("/") && !n.includes("//") ? n : "index.html";
}

const form = document.querySelector("form[data-mode]");
const mode = form.dataset.mode;
const btn = form.querySelector("button[type=submit]");

form.addEventListener("submit", async e => {
  e.preventDefault();
  const v = id => (form.elements[id]?.value || "").trim();
  const email = v("email"), pass = form.elements.password.value;
  if (mode === "register" && pass !== form.elements.confirm.value) return show("mismatch", "error");
  btn.disabled = true; show("working", "info");
  try {
    if (mode === "register") {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      if (v("name")) await updateProfile(cred.user, { displayName: v("name") });
    } else {
      await signInWithEmailAndPassword(auth, email, pass);
    }
    show("welcome", "ok");
    location.href = nextPage();
  } catch (err) {
    show(ERR[err.code] || "generic", "error");
    btn.disabled = false;
  }
});

document.getElementById("forgot")?.addEventListener("click", async () => {
  const email = (form.elements.email.value || "").trim();
  if (!email) return show("needEmail", "error");
  try { await sendPasswordResetEmail(auth, email); show("resetSent", "ok"); }
  catch (err) { show(ERR[err.code] || "generic", "error"); }
});

applyLang();
