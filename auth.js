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
    generic: "Something went wrong. Try again.",
    showPw: "Show password", hidePw: "Hide password"
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
    generic: "တစ်ခုခု မှားယွင်းသွားသည်။ ပြန်စမ်းပါ။",
    showPw: "စကားဝှက်ကို ပြရန်", hidePw: "စကားဝှက်ကို ဖျောက်ရန်"
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
  document.querySelectorAll(".eye").forEach(setEye);
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

const EYE = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.9 10.9 0 0 1 12 19c-6.5 0-10-7-10-7a18.6 18.6 0 0 1 5.06-5.94M9.9 4.24A10.9 10.9 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22"/><path d="M14.12 14.12A3 3 0 1 1 9.88 9.88"/></svg>';
function setEye(b) {
  const shown = b.previousElementSibling.type === "text";
  b.innerHTML = shown ? EYE_OFF : EYE;
  b.setAttribute("aria-label", T[lang][shown ? "hidePw" : "showPw"]);
  b.setAttribute("aria-pressed", shown);
}
document.querySelectorAll("input[type=password]").forEach(input => {
  const box = document.createElement("div");
  box.className = "pw";
  input.parentNode.insertBefore(box, input);
  box.appendChild(input);
  const b = document.createElement("button");
  b.type = "button"; b.className = "eye";
  b.addEventListener("click", () => {
    input.type = input.type === "password" ? "text" : "password";
    setEye(b);
  });
  box.appendChild(b);
});

applyLang();
