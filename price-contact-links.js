const VIBER_PHONE = "959793777771";
const TELEGRAM_PHONE = "959793777771";

let stylesInstalled = false;

function installStyles() {
  if (stylesInstalled || document.getElementById("priceContactStyles")) return;

  const style = document.createElement("style");
  style.id = "priceContactStyles";
  style.textContent = `
    .price-contact-chooser{position:relative;width:100%;margin-top:10px}
    .price-contact-chooser>summary{display:flex;align-items:center;justify-content:center;list-style:none;cursor:pointer}
    .price-contact-chooser>summary::-webkit-details-marker{display:none}
    .price-contact-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:8px}
    .price-contact-options a{display:flex;align-items:center;justify-content:center;min-height:40px;padding:8px;border:1px solid #dce4ef;border-radius:10px;background:#fff;color:#23344e;font:700 13px system-ui,-apple-system,"Segoe UI",sans-serif;text-align:center;text-decoration:none}
    .price-contact-options a:hover,.price-contact-options a:focus-visible{border-color:#2868e8;color:#1f62e8;outline:2px solid #2868e833;outline-offset:1px}
    #grid .product-card .price-contact-chooser{margin-top:auto}
    .product-actions .price-contact-chooser{display:flex;flex:1 1 180px;flex-direction:column;margin-top:10px}
    .product-actions .price-contact-chooser>summary.btn{width:100%;flex:1 1 auto;margin-top:0}
  `;
  document.head.append(style);
  stylesInstalled = true;
}

export function createPriceContactChooser(productName, label = "Ask for today's price") {
  installStyles();
  const name = String(productName || "this product");
  const message = "Hi WH Mobile, can you confirm today's price and availability for " + name + "?";
  const chooser = document.createElement("details");
  chooser.className = "price-contact-chooser";

  const summary = document.createElement("summary");
  summary.className = "btn";
  summary.textContent = label;
  chooser.append(summary);

  const options = document.createElement("div");
  options.className = "price-contact-options";

  const viber = document.createElement("a");
  viber.href = "https://viber.me/" + VIBER_PHONE + "?draft=" + encodeURIComponent(message);
  viber.textContent = "Ask on Viber";

  const telegram = document.createElement("a");
  telegram.href = "https://t.me/+" + TELEGRAM_PHONE + "?text=" + encodeURIComponent(message);
  telegram.textContent = "Ask on Telegram";

  for (const link of [viber, telegram]) {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }

  options.append(viber, telegram);
  chooser.append(options);
  return chooser;
}
