/* The Long Way Northwest — magazine renderer + scroll route map.
   Built from window.TRIP (data/trip.js) + window.ROUTE (data/route.js). */
(function () {
  "use strict";
  var TRIP = window.TRIP, meta = TRIP.meta, sections = TRIP.sections;
  var ROUTE = window.ROUTE || null;
  function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;"); }

  function mstyle(m){ var s=""; if(m.fit)s+="object-fit:"+m.fit+";"; if(m.pos)s+="object-position:"+m.pos+";"; return s?' style="'+s+'"':""; }
  function mediaFig(m) {
    var cap = m.caption ? '<figcaption>' + esc(m.caption) + '</figcaption>' : '';
    if (m.video) {
      return '<figure class="m video">' +
               '<video muted loop playsinline preload="none"' + (m.poster ? ' poster="' + m.poster + '"' : '') + mstyle(m) + '>' +
                 '<source src="' + m.src + '" type="video/mp4"></video>' +
               '<span class="sound">tap for sound</span>' + cap + '</figure>';
    }
    return '<figure class="m"><img src="' + m.src + '" alt="" loading="lazy"' + mstyle(m) + '>' + cap + '</figure>';
  }

  /* ---------- cover (masthead over the photo) ---------- */
  var coverStyle = ""; if (meta.coverFit) coverStyle += "object-fit:" + meta.coverFit + ";"; if (meta.coverPos) coverStyle += "object-position:" + meta.coverPos + ";";
  document.getElementById("cover").innerHTML =
    (meta.cover ? '<img class="cover-img" src="' + meta.cover + '"' + (coverStyle ? ' style="' + coverStyle + '"' : "") + ' alt="">' : "") +
    '<div class="cover-veil"></div>' +
    '<div class="cover-text">' +
      "<h1>" + esc(meta.title) + "</h1>" +
      '<div class="cover-rule"></div>' +
      '<p class="sub">' + esc(meta.tagline) + (meta.dates ? '<span class="dot-sep"></span>' + esc(meta.dates) : "") + "</p>" +
    "</div>";

  /* ---------- sections (magazine) ---------- */
  var reader = document.getElementById("reader");
  sections.forEach(function (s, i) {
    var art = document.createElement("article");
    art.className = "post";
    art.dataset.i = i;
    var media = s.media || [];
    var hasText = !!(s.title || (s.body && s.body.length));

    var head =
      '<header class="post-head">' +
        '<div class="daynum">' + esc(s.day) + "</div>" +
        '<div class="dateline">' + esc(s.date) + "</div>" +
        (s.place ? '<div class="locline">' + esc(s.place) + "</div>" : "") +
      "</header>";

    var textHtml = "";
    if (hasText) {
      textHtml =
        (s.title ? "<h2>" + esc(s.title) + "</h2>" : "") +
        ((s.body && s.body.length) ? s.body.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("")
                                   : '<p class="todo">Notes from our voice memo land here.</p>') +
        ((s.links && s.links.length) ? '<div class="post-links">' + s.links.map(function (l) {
            return '<a href="' + l.url + '" target="_blank" rel="noopener">' + esc(l.label) + ' ↗</a>';
          }).join("") + "</div>" : "");
    }
    var rest = media, spread = "";
    if (hasText && media.length) {
      spread = '<div class="spread' + (i % 2 ? " alt" : "") + '">' +
                 '<div class="spread-media">' + mediaFig(media[0]) + "</div>" +
                 '<div class="spread-text">' + textHtml + "</div></div>";
      rest = media.slice(1);
    } else if (hasText) {
      spread = '<div class="post-textonly spread-text">' + textHtml + "</div>";   // no photos yet
    }
    var gallery = rest.length ? '<div class="gallery">' + rest.map(mediaFig).join("") + "</div>" : "";
    art.innerHTML = head + spread + gallery;
    reader.appendChild(art);
  });
  document.getElementById("foot").innerHTML = "<p>More days as we drive them.</p>";

  /* ---------- videos: autoplay (muted) in view, pause out; tap for sound ---------- */
  (function () {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting && e.intersectionRatio > 0.4) { if (v.paused) { var p = v.play(); if (p && p.catch) p.catch(function(){}); } }
        else if (!v.paused) v.pause();
      });
    }, { threshold: [0, 0.4, 1] });
    [].forEach.call(document.querySelectorAll(".m.video video"), function (v) { io.observe(v); });
    reader.addEventListener("click", function (e) {
      var fig = e.target.closest && e.target.closest(".m.video");
      if (!fig) return;
      var v = fig.querySelector("video");
      if (v.muted) { v.muted = false; v.controls = true; fig.classList.add("heard"); v.play().catch(function(){}); }
    });
  })();

  /* ================= map: pin follows the traced road ================= */
  var hasRoute = !!(ROUTE && ROUTE.a && ROUTE.a.length);
  var LEGORDER = ["a", "b", "c", "d", "e", "f", "g", "h"];
  var LEGS = hasRoute ? LEGORDER.filter(function (k) { return ROUTE[k] && ROUTE[k].length; }) : [];
  var P = [], legStart = {};
  if (hasRoute) { LEGS.forEach(function (k) { legStart[k] = P.length; P = P.concat(ROUTE[k]); }); }
  else { P = meta.origin ? [meta.origin.coords].concat(sections.map(function (s) { return s.coords; })) : sections.map(function (s) { return s.coords; }); }
  function dist(a, b) { var dx = (a[1] - b[1]) * Math.cos((a[0] + b[0]) * Math.PI / 360), dy = a[0] - b[0]; return Math.sqrt(dx * dx + dy * dy); }
  var cum = [0];
  for (var ci = 1; ci < P.length; ci++) cum[ci] = cum[ci - 1] + dist(P[ci - 1], P[ci]);
  var TOTAL = cum[cum.length - 1] || 1;

  // distance bounds for each route leg, then each section's finish distance
  var legBound = {};
  if (hasRoute) { LEGS.forEach(function (k) { var si = legStart[k], ei = si + ROUTE[k].length - 1; legBound[k] = { s: cum[si], e: cum[ei] }; }); }
  function distAt(leg, frac) { var b = legBound[leg]; return b ? b.s + (frac == null ? 1 : frac) * (b.e - b.s) : 0; }
  var secEnd = sections.map(function (s) { return hasRoute && s.endLeg && legBound[s.endLeg] ? distAt(s.endLeg, s.endFrac) : TOTAL; });

  function pointAt(d) {
    d = Math.max(0, Math.min(TOTAL, d));
    for (var k = 1; k < P.length; k++) {
      if (d <= cum[k]) { var seg = (cum[k] - cum[k - 1]) || 1, f = (d - cum[k - 1]) / seg;
        return [P[k - 1][0] + (P[k][0] - P[k - 1][0]) * f, P[k - 1][1] + (P[k][1] - P[k - 1][1]) * f]; }
    }
    return P[P.length - 1];
  }
  function sliceTo(d) {
    d = Math.max(0, Math.min(TOTAL, d));
    var out = [P[0]];
    for (var k = 1; k < P.length; k++) { if (cum[k] < d) out.push(P[k]); else { out.push(pointAt(d)); break; } }
    return out;
  }

  var map = L.map("map", { zoomControl: false, scrollWheelZoom: false, attributionControl: true })
              .fitBounds(P, { padding: [34, 34] });
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    { subdomains: "abcd", maxZoom: 19, attribution: "&copy; OpenStreetMap &copy; CARTO" }).addTo(map);
  L.polyline(P, { color: "#cdbfae", weight: 3, opacity: .95, lineCap: "round", lineJoin: "round" }).addTo(map);
  var traveled = L.polyline([P[0]], { color: "#9c5a3c", weight: 4, opacity: .97, lineCap: "round", lineJoin: "round" }).addTo(map);

  if (meta.origin) {
    L.marker(meta.origin.coords, { icon: L.divIcon({ className: "dot start", html: "<span>◆</span>", iconSize: [22, 22], iconAnchor: [11, 11] }) })
      .addTo(map).bindTooltip("Start · " + meta.origin.place, { direction: "top" });
  }
  var dotByKey = {};
  sections.forEach(function (s) {
    if (!s.dot) return;
    var key = s.coords.join(",");
    if (!dotByKey[key]) dotByKey[key] = L.marker(s.coords, { icon: L.divIcon({ className: "dot", html: "<span></span>", iconSize: [16, 16], iconAnchor: [8, 8] }) }).addTo(map);
  });
  var pin = L.marker(P[0], { icon: L.divIcon({ className: "pin", html: "", iconSize: [30, 30], iconAnchor: [15, 22] }), zIndexOffset: 1000, interactive: false }).addTo(map);

  var secs = [].slice.call(document.querySelectorAll(".post"));
  function render(d) { pin.setLatLng(pointAt(d)); traveled.setLatLngs(sliceTo(d)); }

  var active = -1, tag = document.getElementById("mapTag");
  function setActive(i) {
    if (i === active || !sections[i]) return;
    active = i; var s = sections[i];
    tag.innerHTML = "<b>" + esc(s.day) + "</b>" + (s.place ? " · " + esc(s.place) : "");
    Object.keys(dotByKey).forEach(function (k) { var el = dotByKey[k].getElement(); if (el) el.classList.toggle("day-on", s.dot && k === s.coords.join(",")); });
  }

  function onScroll() {
    var centerY = window.scrollY + window.innerHeight * 0.45;
    var tops = secs.map(function (sEl) { return sEl.getBoundingClientRect().top + window.scrollY; });
    var last = tops.length - 1;
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) { render(secEnd[last]); setActive(last); return; }
    var idx = 0;
    if (centerY <= tops[0]) idx = 0;
    else if (centerY >= tops[last]) {                 // final section has no next anchor — bound it by scroll position
      var endScroll = document.body.scrollHeight - window.innerHeight, hitScroll = tops[last] - window.innerHeight * 0.45;
      var fp = endScroll > hitScroll ? (window.scrollY - hitScroll) / (endScroll - hitScroll) : 1;
      idx = last + Math.max(0, Math.min(0.999, fp));
    } else for (var i = 0; i < last; i++) {
      if (centerY < tops[i + 1]) { idx = i + (centerY - tops[i]) / ((tops[i + 1] - tops[i]) || 1); break; }
    }
    var i0 = Math.floor(idx), p = idx - i0;
    var startD = (i0 === 0) ? 0 : secEnd[i0 - 1];
    render(startD + (secEnd[i0] - startD) * p);
    setActive(Math.min(last, i0));
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () { map.invalidateSize(); onScroll(); });
  setTimeout(function () { map.invalidateSize(); setActive(0); onScroll(); }, 250);

  /* floating Edit button -> ?edit=1. Local-only — never shows on the public site. */
  (function () {
    if (!/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return;
    var b = document.createElement("a");
    b.href = location.pathname + "?edit=1";
    b.textContent = "✎  Edit";
    b.setAttribute("style", "position:fixed;right:18px;bottom:18px;z-index:1500;background:#211f1b;color:#f3ede2;" +
      "font:600 14px/1 Inter,system-ui,sans-serif;padding:13px 18px;border-radius:999px;text-decoration:none;" +
      "box-shadow:0 5px 20px rgba(0,0,0,.28)");
    document.body.appendChild(b);
  })();

  window.__trip = { map: map, pin: pin, setActive: setActive, sections: sections, pointAt: pointAt, secEnd: secEnd, total: TOTAL };
})();
