/**
 * Sparx Media embed snippet
 * Usage:
 * <div id="sparx-media" data-height="520"></div>
 * <script src="https://YOUR-DOMAIN/embed.js" async></script>
 */
(function () {
  var el = document.getElementById("sparx-media");
  if (!el) return;
  var script = document.currentScript;
  var base = script && script.src ? script.src.replace(/\/embed\.js.*$/, "") : "";
  var height = el.getAttribute("data-height") || "520";
  var iframe = document.createElement("iframe");
  iframe.src = base + "/embed";
  iframe.title = "Sparx Media Player";
  iframe.style.cssText =
    "width:100%;height:" +
    height +
    "px;border:0;border-radius:12px;overflow:hidden;background:#0a0a0a";
  iframe.allow = "autoplay; encrypted-media";
  iframe.loading = "lazy";
  el.appendChild(iframe);
})();
