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
    "Phone": "ဖုန်း"
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

  var nav = document.querySelector("nav"), logo = nav && nav.querySelector("b");
  var sw = document.createElement("div");
  sw.className = "langsw";
  sw.innerHTML = '<button type="button" data-lang="en">EN</button><button type="button" data-lang="my">မြန်မာ</button>';
  sw.addEventListener("click", function (e) {
    var l = e.target.getAttribute && e.target.getAttribute("data-lang");
    if (l) setLang(l);
  });
  if (logo) logo.after(sw); else if (nav) nav.appendChild(sw);

  obs = new MutationObserver(function (muts) {
    if (lang !== "my") return;
    muts.forEach(function (m) { m.addedNodes.forEach(walk); });
  });
  obs.observe(document.body, { childList: true, subtree: true });
  setLang(lang);
})();
