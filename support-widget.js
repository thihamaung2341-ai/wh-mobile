(function () {
  if (document.getElementById("wh-support-root")) return;

  var style = document.createElement("style");
  style.id = "wh-support-styles";
  style.textContent = `
    #wh-support-root{position:relative;z-index:2147483000}
    #wh-support-button{position:fixed!important;right:22px;bottom:22px;z-index:2147483000;width:62px;height:62px;padding:0!important;margin:0!important;display:grid;place-items:center;border:0;border-radius:50%;background:var(--primary,#2166ff);color:#fff;box-shadow:0 10px 28px rgba(19,46,92,.28);cursor:pointer;transition:transform .18s,box-shadow .18s}
    #wh-support-button:hover{transform:translateY(-3px);box-shadow:0 14px 32px rgba(19,46,92,.34)}
    #wh-support-button:focus-visible,#wh-support-panel button:focus-visible,#wh-support-panel a:focus-visible{outline:3px solid #77a6ff;outline-offset:3px}
    #wh-support-button svg{width:29px;height:29px;display:block}
    #wh-support-button:after{content:"";position:absolute;right:2px;top:2px;width:12px;height:12px;border:2px solid var(--card,#fff);border-radius:50%;background:#20b77a}
    #wh-support-panel{position:fixed;right:22px;bottom:96px;z-index:2147483000;width:min(360px,calc(100vw - 32px));padding:18px;border:1px solid var(--border,#d1dced);border-radius:20px;background:var(--card,#fff);color:var(--text,#0b1f41);box-shadow:0 18px 60px rgba(13,34,69,.24);font:inherit}
    #wh-support-panel[hidden]{display:none!important}
    #wh-support-panel *{box-sizing:border-box}
    .wh-support-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
    .wh-support-brand{display:flex;align-items:center;gap:7px;color:var(--muted,#60718e);font-size:10px;font-weight:800;letter-spacing:.09em}
    .wh-support-online{width:8px;height:8px;flex:none;border-radius:50%;background:#20b77a}
    .wh-support-close{width:32px;height:32px;flex:none;padding:0!important;margin:0!important;border:1px solid var(--border,#d1dced);border-radius:50%;background:var(--card,#fff);color:var(--text,#0b1f41);font-size:20px;line-height:1;box-shadow:none;cursor:pointer}
    .wh-support-close:hover{background:var(--bg,#f1f5fb)}
    .wh-support-title{margin:12px 0 5px;color:var(--text,#0b1f41);font-size:20px;font-weight:800;line-height:1.2}
    .wh-support-copy{margin:0 0 14px;color:var(--muted,#60718e);font-size:13px;line-height:1.5}
    .wh-support-links{display:grid;gap:8px}
    #wh-support-panel a{display:flex;align-items:center;gap:11px;min-height:54px;padding:10px 12px;border:1px solid var(--border,#d1dced);border-radius:13px;background:var(--card,#fff);color:var(--text,#0b1f41);text-decoration:none;transition:border-color .15s,transform .15s}
    #wh-support-panel a:hover{border-color:var(--primary,#2166ff);transform:translateY(-1px)}
    .wh-support-link-icon{width:34px;height:34px;flex:none;display:grid;place-items:center;border-radius:10px;background:color-mix(in srgb,var(--primary,#2166ff) 12%,transparent);color:var(--primary,#2166ff);font-size:17px}
    .wh-support-link-copy{display:grid;gap:2px;min-width:0}
    .wh-support-link-copy strong{font-size:12px;font-weight:750}
    .wh-support-link-copy small{color:var(--muted,#60718e);font-size:11px}
    .wh-support-arrow{margin-left:auto;color:var(--muted,#60718e);font-size:15px}
    .wh-support-foot{margin:12px 2px 0;color:var(--muted,#60718e);font-size:11px;line-height:1.45}
    .wh-support-foot a{display:inline!important;min-height:0!important;padding:0!important;border:0!important;background:transparent!important;color:var(--primary,#2166ff)!important}
    @media(max-width:480px){#wh-support-button{right:16px;bottom:16px;width:56px;height:56px}#wh-support-panel{right:16px;bottom:84px}}
    @media(prefers-reduced-motion:reduce){#wh-support-button,#wh-support-panel a{transition:none}}
  `;
  document.head.appendChild(style);

  var root = document.createElement("div");
  root.id = "wh-support-root";
  var button = document.createElement("button");
  button.id = "wh-support-button";
  button.type = "button";
  button.setAttribute("aria-label", "Contact WH Mobile customer support");
  button.setAttribute("aria-controls", "wh-support-panel");
  button.setAttribute("aria-expanded", "false");
  button.title = "Contact customer support";
  button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4.5 18.5 5.6 15A8.4 8.4 0 1 1 9 18.7l-4.5-.2Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.2 9.2c.2 2.7 2.1 4.7 4.9 5.5l1.1-1.3-2-1.2-.9.7a5.4 5.4 0 0 1-2-2l.7-.9-1.2-2-1.3 1.2Z" fill="currentColor"/></svg>';

  var panel = document.createElement("section");
  panel.id = "wh-support-panel";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "WH Mobile customer support");
  panel.innerHTML = '<div class="wh-support-head"><div><div class="wh-support-brand"><span class="wh-support-online" aria-hidden="true"></span>WH MOBILE SUPPORT</div><h2 class="wh-support-title">How can we help?</h2></div><button class="wh-support-close" type="button" aria-label="Close support panel" data-support-close>×</button></div><p class="wh-support-copy">Talk with our team about products, orders, or repairs.</p><div class="wh-support-links"><a href="tel:+959793777772"><span class="wh-support-link-icon" aria-hidden="true">☎</span><span class="wh-support-link-copy"><strong>Call customer service</strong><small>+959 793 777 772</small></span><span class="wh-support-arrow" aria-hidden="true">↗</span></a><a href="tel:+959793777771"><span class="wh-support-link-icon" aria-hidden="true">☎</span><span class="wh-support-link-copy"><strong>Call customer service</strong><small>+959 793 777 771</small></span><span class="wh-support-arrow" aria-hidden="true">↗</span></a><a href="https://www.tiktok.com/@whmobile132" target="_blank" rel="noopener noreferrer"><span class="wh-support-link-icon" aria-hidden="true">♪</span><span class="wh-support-link-copy"><strong>Visit us on TikTok</strong><small>@whmobile132</small></span><span class="wh-support-arrow" aria-hidden="true">↗</span></a></div><p class="wh-support-foot"><a href="index.html#visit">Store details and opening hours</a></p>';

  root.append(button, panel);
  document.body.appendChild(root);

  function setOpen(open) {
    panel.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
  }

  button.addEventListener("click", function () {
    setOpen(panel.hidden);
  });
  panel.querySelector("[data-support-close]").addEventListener("click", function () {
    setOpen(false);
    button.focus();
  });
  document.addEventListener("click", function (event) {
    if (!panel.hidden && !root.contains(event.target)) setOpen(false);
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !panel.hidden) {
      setOpen(false);
      button.focus();
    }
  });
})();