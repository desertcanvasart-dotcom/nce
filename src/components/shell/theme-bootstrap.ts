/**
 * Inline script run in <head> before paint: applies the saved theme.
 * Kept tiny and dependency-free; the storage key matches the design-system previews ("nc-theme").
 */
export const THEME_BOOTSTRAP = `(function(){var d=document.documentElement;try{var t=localStorage.getItem("nc-theme");d.setAttribute("data-theme",t==="dark"?"dark":"light")}catch(e){d.setAttribute("data-theme","light")}})();`;
