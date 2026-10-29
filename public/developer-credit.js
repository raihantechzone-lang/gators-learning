// Fills every [data-dev-credit] footer element with the developer name/link from settings.
(function () {
  var DEFAULT = { name: "Raihan Tech Zone", url: "" };
  function safeUrl(u) { try { var x = new URL(u); return x.protocol === "https:" || x.protocol === "http:" ? x.href : ""; } catch (e) { return ""; } }
  function paint(c) {
    document.querySelectorAll("[data-dev-credit]").forEach(function (el) {
      el.textContent = c.name || DEFAULT.name;
      var url = safeUrl(c.url || "");
      if (url) { el.setAttribute("href", url); el.setAttribute("target", "_blank"); el.setAttribute("rel", "noopener noreferrer"); }
      else el.removeAttribute("href");
    });
  }
  async function load(tries) {
    if (!window.supabase) { if (tries < 50) setTimeout(function () { load(tries + 1); }, 200); return; }
    try {
      var r = await window.supabase.from("settings").select("setting_key,setting_value").in("setting_key", ["developer_name", "developer_url"]);
      var c = Object.assign({}, DEFAULT);
      (r.data || []).forEach(function (row) { if (row.setting_key === "developer_name" && row.setting_value) c.name = row.setting_value; if (row.setting_key === "developer_url") c.url = row.setting_value || ""; });
      paint(c);
    } catch (e) { paint(DEFAULT); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { paint(DEFAULT); load(0); });
  else { paint(DEFAULT); load(0); }
})();
