// WH Mobile: English / Burmese switch for the homepage.
// Add ONE line before </body> in index.html:  <script src="lang.js"></script>
// The switch button is added to the top menu automatically.
(function () {
  var MY = {
    "Phones": "ဖုန်းများ",
    "Repairs": "ပြုပြင်ရေး",
    "Order & Book": "မှာယူရန် / ဘိုကင်",
    "Visit": "လာရောက်ရန်",
    "Phones, accessories & fast repairs.": "ဖုန်းများ၊ ဆက်စပ်ပစ္စည်းများနှင့် မြန်ဆန်သော ပြုပြင်ရေး။",
    "Browse what’s in stock, reserve a phone, or book a repair in a minute.": "စတော့ထဲမှာ ဘာတွေရှိလဲ ကြည့်ပါ၊ ဖုန်းကြိုတင်မှာပါ၊ ဒါမှမဟုတ် တစ်မိနစ်အတွင်း ပြုပြင်ရန် ဘိုကင်တင်ပါ။",
    "Log in": "အကောင့်ဝင်ရန်",
    "See phones": "ဖုန်းများကြည့်ရန်",
    "Book a repair": "ပြုပြင်ရန် ဘိုကင်တင်ရန်",
    "Phones in stock": "စတော့ရှိ ဖုန်းများ",
    "Sample items and prices; replace with your own.": "နမူနာပစ္စည်းများနှင့် ဈေးနှုန်းများ။ သင့်ကိုယ်ပိုင်ဖြင့် အစားထိုးပါ။",
    "All": "အားလုံး",
    "128 GB · New": "128 GB · အသစ်",
    "256 GB · New": "256 GB · အသစ်",
    "128 GB · Used, A grade": "128 GB · အသုံးပြုပြီးသား၊ A အဆင့်",
    "Reserve": "ကြိုတင်မှာရန်",
    "Repairs & services": "ပြုပြင်ရေးနှင့် ဝန်ဆောင်မှုများ",
    "Prices start from; final quote after a quick check.": "ဈေးနှုန်းများသည် စတင်ဈေးများဖြစ်ပြီး၊ စစ်ဆေးပြီးမှ နောက်ဆုံးဈေး ပြောပါမည်။",
    "Screen replacement": "ဖန်သားပြင် လဲလှယ်ခြင်း",
    "Battery replacement": "ဘက်ထရီ လဲလှယ်ခြင်း",
    "Charging port repair": "အားသွင်းပေါက် ပြုပြင်ခြင်း",
    "Water damage check": "ရေဝင်ပျက်စီးမှု စစ်ဆေးခြင်း",
    "Screen protector & case fitting": "ဖန်သားပြင်ကာကွယ်ဖလင်နှင့် ဖုန်းအိတ် တပ်ဆင်ခြင်း",
    "Other": "အခြား",
    "Order, reserve or book": "မှာယူရန်၊ ကြိုတင်မှာရန် သို့မဟုတ် ဘိုကင်တင်ရန်",
    "An account is needed to reserve a phone or book a repair.": "ဖုန်းကြိုတင်မှာရန် သို့မဟုတ် ပြုပြင်ရန် ဘိုကင်တင်ရန် အကောင့် လိုအပ်ပါသည်။",
    "Create your account": "အကောင့်ဖွင့်ပါ",
    "Takes 10 seconds. Next time you will be signed in on this device.": "စက္ကန့် ၁၀ လောက်ပဲ ကြာပါမယ်။ နောက်တစ်ကြိမ်မှာ ဒီစက်ထဲက အကောင့်ဝင်ပြီးသား ဖြစ်နေပါမယ်။",
    "Name": "အမည်",
    "Phone number": "ဖုန်းနံပါတ်",
    "Email": "အီးမေးလ်",
    "Create account": "အကောင့်ဖွင့်ရန်",
    "Signed in as": "အကောင့်ဝင်ထားသူ",
    "Sign out": "အကောင့်ထွက်ရန်",
    "Reserve a phone": "ဖုန်း ကြိုတင်မှာရန်",
    "Your name": "သင့်အမည်",
    "Phone model": "ဖုန်းမော်ဒယ်",
    "Repair type": "ပြုပြင်ရေး အမျိုးအစား",
    "When?": "ဘယ်အချိန်လဲ?",
    "Notes": "မှတ်ချက်",
    "Prepare request": "တောင်းဆိုမှု ပြင်ဆင်ရန်",
    "Send by SMS": "SMS ဖြင့် ပို့ရန်",
    "Visit us": "ဆိုင်သို့ လာရောက်လည်ပတ်ပါ",
    "Address": "လိပ်စာ",
    "Open": "ဖွင့်ချိန်",
    "Mon–Sun, 10:00–20:00": "တနင်္လာ–တနင်္ဂနွေ၊ ၁၀:၀၀–၂၀:၀၀",
    "Phone": "ဖုန်း",
    "Shop": "ဆိုင်",
    "Reserve / Repair": "ကြိုတင်မှာယူရန် / ပြုပြင်ရန်",
    "My Account": "ကျွန်ုပ်အကောင့်",
    "Account overview": "အကောင့်အကျဉ်းချုပ်",
    "Manage your WH Mobile account and personal information.": "သင့် WH Mobile အကောင့်နှင့် ကိုယ်ရေးအချက်အလက်များကို စီမံပါ။",
    "Back to shop": "ဆိုင်သို့ ပြန်သွားရန်",
    "Your account": "သင့်အကောင့်",
    "Loading account…": "အကောင့်အချက်အလက် ဖွင့်နေသည်…",
    "Personal information": "ကိုယ်ရေးအချက်အလက်",
    "Update the name shown on your WH Mobile account.": "သင့် WH Mobile အကောင့်တွင် ပြသမည့်အမည်ကို ပြင်ဆင်ပါ။",
    "Full name": "အမည်အပြည့်အစုံ",
    "Email address": "အီးမေးလ်လိပ်စာ",
    "Delivery address": "ပို့ဆောင်မည့်လိပ်စာ",
    "Save changes": "ပြောင်းလဲမှုများ သိမ်းရန်",
    "Log out": "အကောင့်ထွက်ရန်",
    "Quick links": "အမြန်လင့်ခ်များ",
    "Browse phones": "ဖုန်းများကြည့်ရန်",
    "Your account is used to access reservations and repair bookings. Order history and saved favorites can be added when those features are connected.": "သင့်အကောင့်ကို ဖုန်းကြိုတင်မှာယူမှုများနှင့် ပြုပြင်ရေး ဘိုကင်များအတွက် အသုံးပြုပါသည်။ အမှာစာမှတ်တမ်းနှင့် သိမ်းထားသောအကြိုက်များကို အဆိုပါလုပ်ဆောင်ချက်များ ချိတ်ဆက်ပြီးနောက် ထည့်သွင်းနိုင်ပါသည်။",
    "Contact WH Mobile": "WH Mobile ကို ဆက်သွယ်ရန်",
    "Get in touch with us by phone or follow our TikTok pages.": "ဖုန်းဖြင့် ကျွန်ုပ်တို့ကို ဆက်သွယ်နိုင်သလို TikTok စာမျက်နှာများကိုလည်း ကြည့်ရှုနိုင်ပါသည်။",
    "PHONE NUMBERS": "ဖုန်းနံပါတ်များ",
    "TIKTOK": "TIKTOK",
    "© WH Mobile · Your mobile store": "© WH Mobile · သင့်မိုဘိုင်းဆိုင်",
    "WH Mobile customer": "WH Mobile သုံးစွဲသူ",
    "Could not load saved contact details. You can still enter them and try saving.": "သိမ်းထားသော ဆက်သွယ်ရန်အချက်အလက်များကို ဖွင့်မရပါ။ အချက်အလက်များကို ဖြည့်ပြီး သိမ်းဆည်းရန် ကြိုးစားနိုင်ပါသည်။",
    "Saving your information…": "သင့်အချက်အလက်များကို သိမ်းနေသည်…",
    "Your name, phone number and delivery address have been saved.": "သင့်အမည်၊ ဖုန်းနံပါတ်နှင့် ပို့ဆောင်မည့်လိပ်စာကို သိမ်းဆည်းပြီးပါပြီ။",
    "Could not save your information. Please try again.": "အချက်အလက်များကို သိမ်းမရပါ။ ထပ်မံကြိုးစားပါ။",
    "Contact WH Mobile customer support": "WH Mobile ဖောက်သည်ဝန်ဆောင်မှုကို ဆက်သွယ်ရန်",
    "Contact customer support": "ဖောက်သည်ဝန်ဆောင်မှုကို ဆက်သွယ်ရန်",
    "WH MOBILE SUPPORT": "WH MOBILE ဖောက်သည်ဝန်ဆောင်မှု",
    "How can we help?": "ဘယ်လိုကူညီပေးရမလဲ?",
    "Talk with our team about products, orders, or repairs.": "ပစ္စည်းများ၊ မှာယူမှုများ သို့မဟုတ် ပြုပြင်ရေးအကြောင်း ကျွန်ုပ်တို့အဖွဲ့ကို မေးမြန်းနိုင်ပါသည်။",
    "Call customer service": "ဖောက်သည်ဝန်ဆောင်မှုကို ဖုန်းခေါ်ပါ",
    "Visit us on TikTok": "TikTok တွင် ကျွန်ုပ်တို့ကို ကြည့်ရန်",
    "Store details and opening hours": "ဆိုင်လိပ်စာနှင့် ဖွင့်ချိန်များ"
  };
  var RULES = [[/^from (฿[\d,]+)$/, "$1 မှ စတင်"]];
  var orig = new WeakMap(), lang = "en", obs;
  try { lang = localStorage.getItem("wh-lang") || "en"; } catch (e) {}

  function tr(s) {
    var k = s.trim(), out = null;
    if (!k) return null;
    if (MY[k]) out = MY[k];
    else for (var i = 0; i < RULES.length; i++)
      if (RULES[i][0].test(k)) { out = k.replace(RULES[i][0], RULES[i][1]); break; }
    return out === null ? null : s.replace(k, function () { return out; });
  }
  function apply(node) {
    var p = node.parentNode && node.parentNode.nodeName;
    if (p === "SCRIPT" || p === "STYLE" || p === "TEXTAREA") return;
    var o = orig.get(node);
    if (lang === "my") {
      var base = o === undefined ? node.nodeValue : o, t = tr(base);
      if (t !== null) { orig.set(node, base); if (node.nodeValue !== t) node.nodeValue = t; }
    } else if (o !== undefined && node.nodeValue !== o) node.nodeValue = o;
  }
  function walk(root) {
    if (root.nodeType === 3) return apply(root);
    if (root.nodeType !== 1) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), n, list = [];
    while ((n = w.nextNode())) list.push(n);
    list.forEach(apply);
  }
  function setLang(l) {
    lang = l;
    try { localStorage.setItem("wh-lang", l); } catch (e) {}
    document.documentElement.lang = l;
    walk(document.body);
    document.querySelectorAll(".langsw button").forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-lang") === l);
    });
  }

  var css = document.createElement("style");
  css.textContent =
    ".langsw{display:flex;flex:none;border:1px solid var(--line);border-radius:8px;overflow:hidden}" +
    ".langsw button{border:0;background:var(--card);color:var(--muted);padding:6px 10px;font-size:13px;font-family:inherit;cursor:pointer}" +
    ".langsw button[aria-pressed=true]{background:var(--accent);color:var(--accent-t)}" +
    "html[lang=my] body,html[lang=my] button,html[lang=my] input,html[lang=my] select,html[lang=my] textarea{font-family:'Noto Sans Myanmar','Myanmar Text','Padauk',system-ui,sans-serif}";
  document.head.appendChild(css);
  var font = document.createElement("link");
  font.rel = "stylesheet";
  font.href = "https://fonts.googleapis.com/css2?family=Noto+Sans+Myanmar:wght@400;700&display=swap";
  document.head.appendChild(font);

  var header = document.querySelector(".head-tools");
  var sw = document.createElement("div");
  sw.className = "langsw";
  sw.innerHTML = '<button type="button" data-lang="en">EN</button><button type="button" data-lang="my">မြန်မာ</button>';
  sw.setAttribute("aria-label", "Choose language");
  sw.addEventListener("click", function (e) {
    var l = e.target.getAttribute && e.target.getAttribute("data-lang");
    if (l) setLang(l);
  });
  if (header) header.appendChild(sw);

  obs = new MutationObserver(function (muts) {
    if (lang !== "my") return;
    muts.forEach(function (m) { m.addedNodes.forEach(walk); });
  });
  obs.observe(document.body, { childList: true, subtree: true });
  setLang(lang);
})();
