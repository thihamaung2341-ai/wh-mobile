// WH Mobile theme toggle. Include this script on each page.
(() => {
  const storageKey = "wh-mobile-theme";

  // Apply saved theme before updating the toggle.
  const savedTheme = localStorage.getItem(storageKey);
  if (savedTheme === "dark") {
    document.documentElement.classList.add("dark-mode");
  }

  function updateThemeButton(button) {
    const isDark = document.documentElement.classList.contains("dark-mode");
    button.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
    button.setAttribute(
      "aria-label",
      isDark ? "Switch to light mode" : "Switch to dark mode"
    );
    button.setAttribute("aria-pressed", String(isDark));
  }

  function initThemeToggle() {
    const button = document.getElementById("themeToggle");
    if (!button) return;

    updateThemeButton(button);
    button.addEventListener("click", () => {
      const isDark = document.documentElement.classList.toggle("dark-mode");
      localStorage.setItem(storageKey, isDark ? "dark" : "light");
      updateThemeButton(button);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initThemeToggle);
  } else {
    initThemeToggle();
  }
})();
