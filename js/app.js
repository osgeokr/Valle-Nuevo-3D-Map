/* Valle Nuevo 3D web map (MapLibre GL JS 5) */
(function () {
  "use strict";

  var D = window.VN_DATA, V = window.VN_VIEWS, S = window.VN_STATS, T = window.I18N;
  var lang = "es";
  var is3d = true;
  var base = "sat";
  var fmt = function (n, d) { return Number(n).toLocaleString("en-US", { maximumFractionDigits: d || 0 }); };
  var t = function (k) { return (T[lang] && T[lang][k]) || T.es[k] || k; };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------------- places for the "go to" buttons ---------------- */
  function bboxCenter(b) { return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; }
  // Villa Poppy (Google Maps plus code V79F+499) and the area drawn on the paper sketch
  var VILLA_POPPY = [-70.72652, 18.86779];
  var SKETCH_BOUNDS = [-70.742, 18.840, -70.711, 18.873];
  var PLACES = [
    { id: "sketch", icon: "🏠", star: true, bounds: SKETCH_BOUNDS, pitch: 60, bearing: 0, zoomAdj: 0 },
    { id: "park", icon: "🏞️", bounds: V.park, pitch: 55, bearing: -15 },
    { id: "lacueva", icon: "🔥", fire: true, bounds: V.lacueva, pitch: 62, bearing: 10 },
    { id: "canadaseca", icon: "🔥", fire: true, bounds: V.canadaseca, pitch: 60, bearing: -20 },
    { id: "constanza", icon: "🏘️", center: V["Constanza"], zoom: 13.2, pitch: 55, bearing: 150 },
    { id: "peak", icon: "⛰️", center: [S.peak[0], S.peak[1]], zoom: 13.4, pitch: 65, bearing: 30, sub: fmt(S.peak[2]) + " m" },
  ].filter(function (p) { return p.bounds || p.center; });

  /* ---------------- map ---------------- */
  function webglOK() {
    try { var c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); }
    catch (e) { return false; }
  }
  if (!webglOK()) { $("#nogl").hidden = false; return; }

  var ESRI = "Esri, Maxar, Earthstar Geographics";
  var style = {
    version: 8,
    sources: {
      sat: { type: "raster", tileSize: 256, maxzoom: 18,
        tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
        attribution: "Imagen © " + ESRI },
      topo: { type: "raster", tileSize: 256, maxzoom: 18,
        tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"],
        attribution: "Mapa © Esri, HERE, Garmin, OpenStreetMap" },
      dem: { type: "raster-dem", encoding: "terrarium", tileSize: 256, maxzoom: 14,
        tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
        attribution: "Relieve: Mapzen Terrain Tiles" },
      park: { type: "geojson", data: D.park },
      pa: { type: "geojson", data: D.pa },
      burn: { type: "geojson", data: D.burn },
      rivers: { type: "geojson", data: D.rivers },
      roads: { type: "geojson", data: D.roads, attribution: "© OpenStreetMap" },
      frame: { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [
        [SKETCH_BOUNDS[0], SKETCH_BOUNDS[1]], [SKETCH_BOUNDS[2], SKETCH_BOUNDS[1]], [SKETCH_BOUNDS[2], SKETCH_BOUNDS[3]],
        [SKETCH_BOUNDS[0], SKETCH_BOUNDS[3]], [SKETCH_BOUNDS[0], SKETCH_BOUNDS[1]]] } } },
    },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": "#dfe7dd" } },
      { id: "sat", type: "raster", source: "sat" },
      { id: "topo", type: "raster", source: "topo", layout: { visibility: "none" } },
      { id: "pa-fill", type: "fill", source: "pa", paint: { "fill-color": "#9be39f", "fill-opacity": 0.14 } },
      { id: "pa-line", type: "line", source: "pa", paint: { "line-color": "#9be39f", "line-width": 1.6, "line-dasharray": [3, 2] } },
      { id: "burn-fill", type: "fill", source: "burn", paint: { "fill-color": "#ff5a1f", "fill-opacity": ["interpolate", ["linear"], ["zoom"], 9, 0.55, 14, 0.35] } },
      { id: "burn-line", type: "line", source: "burn", paint: { "line-color": "#b3261e", "line-width": ["interpolate", ["linear"], ["zoom"], 9, 1, 14, 2.2] } },
      { id: "rivers", type: "line", source: "rivers",
        paint: { "line-color": "#4fc3f7", "line-opacity": 0.95,
          "line-width": ["interpolate", ["linear"], ["zoom"], 9, ["match", ["get", "cls"], "river", 1.6, 0.6], 15, ["match", ["get", "cls"], "river", 4, 2]] } },
      { id: "roads-case", type: "line", source: "roads", filter: ["!=", ["get", "cls"], "track"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#3b3b3b", "line-opacity": 0.8,
          "line-width": ["interpolate", ["linear"], ["zoom"], 9, ["match", ["get", "cls"], "main", 3, 1.8], 15, ["match", ["get", "cls"], "main", 8, 5.5]] } },
      { id: "roads", type: "line", source: "roads", filter: ["!=", ["get", "cls"], "track"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": ["match", ["get", "cls"], "main", "#ffe08a", "#ffffff"],
          "line-width": ["interpolate", ["linear"], ["zoom"], 9, ["match", ["get", "cls"], "main", 1.8, 0.9], 15, ["match", ["get", "cls"], "main", 5.5, 3.5]] } },
      { id: "tracks", type: "line", source: "roads", filter: ["==", ["get", "cls"], "track"], minzoom: 11,
        paint: { "line-color": "#fff3e0", "line-width": ["interpolate", ["linear"], ["zoom"], 11, 0.8, 15, 2.2], "line-dasharray": [2, 1.5] } },
      { id: "park-case", type: "line", source: "park", paint: { "line-color": "#3d3200", "line-opacity": 0.7, "line-width": ["interpolate", ["linear"], ["zoom"], 9, 4, 14, 7] } },
      { id: "park-line", type: "line", source: "park", paint: { "line-color": "#ffd23f", "line-width": ["interpolate", ["linear"], ["zoom"], 9, 2.2, 14, 4] } },
      { id: "frame", type: "line", source: "frame", paint: { "line-color": "#ffffff", "line-width": 2, "line-opacity": 0.9, "line-dasharray": [3, 2] } },
    ],
    sky: { "sky-color": "#a9cbe9", "horizon-color": "#e8f1fa", "fog-color": "#f2f6fa",
      "sky-horizon-blend": 0.6, "horizon-fog-blend": 0.7, "fog-ground-blend": 0.85, "atmosphere-blend": 0.6 },
  };

  var map;
  try {
    map = new maplibregl.Map({
      container: "map", style: style, center: bboxCenter(SKETCH_BOUNDS), zoom: 13.3, pitch: 60, bearing: 0,
      maxPitch: 75, attributionControl: false, fadeDuration: 150, maxTileCacheSize: 120,
    });
  } catch (e) { $("#nogl").hidden = false; return; }

  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
  var geo = new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true });
  map.addControl(geo, "top-right");
  geo.on("error", function () { toast(t("locOff")); });
  map.addControl(new maplibregl.ScaleControl({ unit: "metric", maxWidth: 90 }), "top-right");
  map.addControl(new maplibregl.AttributionControl({ compact: true }), "top-right");

  /* ---------------- camera helpers ---------------- */
  function isDesktop() { return window.matchMedia("(min-width:900px)").matches; }
  function padding() {
    var sh = $("#sheet");
    if (isDesktop()) return { top: 60, bottom: 40, left: sh.offsetWidth + 40, right: 60 };
    return { top: 70, bottom: Math.min(sh.offsetHeight, map.getContainer().clientHeight * 0.6) + 20, left: 30, right: 30 };
  }
  function goTo(p, instant) {
    var pitch = is3d ? p.pitch : 0, bearing = is3d ? p.bearing : 0;
    var b = p.bounds || [p.center[0] - 0.004, p.center[1] - 0.004, p.center[0] + 0.004, p.center[1] + 0.004];
    var box = [[b[0], b[1]], [b[2], b[3]]];
    var o = { padding: padding(), bearing: bearing };
    if (p.zoom) o.maxZoom = is3d ? p.zoom : p.zoom + 0.3;
    var cam = map.cameraForBounds(box, o) || map.cameraForBounds(box, { bearing: bearing, maxZoom: o.maxZoom });
    if (!cam) return;
    var adj = p.zoomAdj !== undefined ? p.zoomAdj : (is3d && p.bounds ? 0.3 : 0);
    var opts = { center: cam.center, zoom: cam.zoom + (is3d ? adj : 0), pitch: pitch, bearing: bearing };
    if (instant) map.jumpTo(opts); else map.flyTo(Object.assign(opts, { duration: 2600, essential: true, curve: 1.3 }));
  }

  /* ---------------- 3D / 2D and basemap ---------------- */
  function set3d(on, silent) {
    is3d = on;
    $$(".seg-btn[data-view]").forEach(function (b) { b.classList.toggle("is-on", (b.dataset.view === "3d") === on); });
    if (on) {
      map.setMaxPitch(75);
      map.setTerrain({ source: "dem", exaggeration: 1.35 });
      map.easeTo({ pitch: 58, duration: 900 });
      if (!silent) toast(t("to3d"));
    } else {
      map.setTerrain(null);
      map.easeTo({ pitch: 0, bearing: 0, duration: 700 });
      setTimeout(function () { map.setMaxPitch(0); }, 720);
      if (!silent) toast(t("to2d"));
    }
  }
  function setBase(b) {
    base = b;
    $$(".seg-btn[data-base]").forEach(function (x) { x.classList.toggle("is-on", x.dataset.base === b); });
    map.setLayoutProperty("sat", "visibility", b === "sat" ? "visible" : "none");
    map.setLayoutProperty("topo", "visibility", b === "topo" ? "visible" : "none");
    map.setPaintProperty("pa-line", "line-color", b === "sat" ? "#9be39f" : "#2c7a52");
    map.setPaintProperty("rivers", "line-color", b === "sat" ? "#4fc3f7" : "#1e88e5");
  }

  /* ---------------- HTML labels (no font server needed) ---------------- */
  var labels = [];
  function addLabel(lngLat, text, cls, minZoom, key) {
    var el = document.createElement("div");
    el.className = "lbl " + (cls || "");
    el.textContent = text;
    var fire = cls === "fire";
    var m = new maplibregl.Marker({ element: el, anchor: fire ? "bottom" : "left", offset: fire ? [0, -6] : [-4, 0] }).setLngLat(lngLat).addTo(map);
    labels.push({ el: el, m: m, min: minZoom || 0, key: key, pri: PRI[key === "place" && cls === "town" ? "town" : key] });
  }
  var PRI = { fire: 0, peak: 1, town: 2, place: 3 };
  var raf = 0;
  function refreshLabels() {
    if (raf) return;
    raf = requestAnimationFrame(function () { raf = 0; layoutLabels(); });
  }
  // simple collision: higher-priority labels win, far-away labels near the horizon are hidden
  function layoutLabels() {
    var z = map.getZoom(), on = $("#lyr-places") ? $("#lyr-places").checked : true;
    var h = map.getContainer().clientHeight, horizon = map.getPitch() > 35 ? h * 0.22 : -1;
    var boxes = [];
    labels.slice().sort(function (a, b) { return a.pri - b.pri; }).forEach(function (l) {
      var show = (l.key === "fire" || l.key === "peak") ? z >= l.min : on && z >= l.min;
      if (show) {
        var pt = map.project(l.m.getLngLat());
        if (l.key !== "fire" && pt.y < horizon) show = false;
        var w = l.el.textContent.length * 7.2 + 16, hh = 18;
        var bx = l.key === "fire" ? [pt.x - w / 2, pt.y - 30, pt.x + w / 2, pt.y - 6] : [pt.x - 6, pt.y - hh / 2, pt.x + w, pt.y + hh / 2];
        if (show) {
          for (var i = 0; i < boxes.length; i++) {
            var o = boxes[i];
            if (bx[0] < o[2] && bx[2] > o[0] && bx[1] < o[3] && bx[3] > o[1]) { show = false; break; }
          }
        }
        if (show) boxes.push(bx);
      }
      l.el.classList.toggle("is-hidden", !show);
    });
  }
  function buildLabels() {
    labels.forEach(function (l) { l.m.remove(); });
    labels = [];
    D.places.features.forEach(function (f) {
      var c = f.properties.cls, big = c === "city" || c === "town";
      addLabel(f.geometry.coordinates, f.properties.name, big ? "town" : "", big ? 9.5 : 11.3, "place");
    });
    addVillaPoppy();
    addLabel([S.peak[0], S.peak[1]], t("peakName") + " " + fmt(S.peak[2]) + " m", "peak", 9.5, "peak");
    addLabel(bboxCenter(V.lacueva), t("p.lacueva") + " · " + fmt(S.lacueva) + " ha", "fire", 8, "fire");
    if (V.canadaseca) addLabel(bboxCenter(V.canadaseca), t("p.canadaseca") + " · " + fmt(S.cs) + " ha", "fire", 8.5, "fire");
    refreshLabels();
  }

  var vpMarker = null;
  function addVillaPoppy() {
    if (vpMarker) vpMarker.remove();
    var el = document.createElement("button");
    el.className = "vp";
    el.setAttribute("aria-label", "Villa Poppy");
    el.innerHTML = '<span class="vp-ring"></span><span class="vp-dot">🏠</span><span class="vp-name">Villa Poppy</span>';
    el.addEventListener("click", function (ev) {
      ev.stopPropagation();
      new maplibregl.Popup({ offset: 22, maxWidth: "270px" }).setLngLat(VILLA_POPPY)
        .setHTML('<div class="pop-t vp-t">Villa Poppy</div><div class="pop-r">' + t("vpPop") + "</div>").addTo(map);
    });
    vpMarker = new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat(VILLA_POPPY).addTo(map);
  }

  /* ---------------- panel: places and layers ---------------- */
  function buildPlaces() {
    var box = $("#places");
    box.innerHTML = "";
    PLACES.forEach(function (p) {
      var b = document.createElement("button");
      b.className = "place" + (p.star ? " star" : "");
      b.dataset.id = p.id;
      var sub = p.sub || (T.es["p." + p.id + ".s"] ? t("p." + p.id + ".s") : "");
      b.innerHTML = '<i class="' + (p.fire ? "fire" : "") + '">' + p.icon + "</i><span><b>" + t("p." + p.id) + "</b>" +
        (sub ? "<small>" + sub + "</small>" : "") + "</span>";
      b.addEventListener("click", function () {
        $$(".place").forEach(function (x) { x.classList.toggle("is-on", x === b); });
        goTo(p);
      });
      box.appendChild(b);
    });
  }

  var LAYERS = [
    { id: "burn", ids: ["burn-fill", "burn-line"] },
    { id: "park", ids: ["park-case", "park-line"] },
    { id: "rivers", ids: ["rivers"] },
    { id: "roads", ids: ["roads-case", "roads", "tracks"] },
    { id: "places", ids: [] },
    { id: "pa", ids: ["pa-fill", "pa-line"] },
  ];
  var layerState = { burn: true, park: true, rivers: true, roads: true, places: true, pa: true };
  function buildLayers() {
    var box = $("#layers");
    box.innerHTML = "";
    LAYERS.forEach(function (L) {
      var lab = document.createElement("label");
      lab.className = "layer";
      lab.innerHTML = '<input type="checkbox" id="lyr-' + L.id + '"' + (layerState[L.id] ? " checked" : "") + '>' +
        '<span class="sw ' + L.id + '"></span><span>' + t("l." + L.id) + '</span><span class="chk"></span>';
      box.appendChild(lab);
      lab.querySelector("input").addEventListener("change", function (e) {
        layerState[L.id] = e.target.checked;
        L.ids.forEach(function (id) { map.setLayoutProperty(id, "visibility", e.target.checked ? "visible" : "none"); });
        if (L.id === "places") refreshLabels();
      });
    });
  }

  /* ---------------- language ---------------- */
  function applyLang(l) {
    lang = l;
    document.documentElement.lang = l;
    $$(".lang-btn").forEach(function (b) { b.classList.toggle("is-active", b.dataset.lang === l); });
    $$("[data-i18n]").forEach(function (el) { el.textContent = t(el.dataset.i18n); });
    $$("[data-i18n-html]").forEach(function (el) { el.innerHTML = t(el.dataset.i18nHtml); });
    buildPlaces();
    buildLayers();
    if (map.loaded()) buildLabels();
    try { localStorage.setItem("vn_lang", l); } catch (e) {}
  }

  /* ---------------- popups ---------------- */
  function burnPopup(e) {
    var p = e.features[0].properties;
    var sev = p.dnbr_mean >= 0.44 ? t("sevHigh") : t("sevMod");
    var html = '<div class="pop-t">' + t("burnPop") + (p.event ? " · " + String(p.event).replace(/\s*\(.*\)/, "") : "") + "</div>" +
      '<div class="pop-r">' + t("area") + ": <b>" + fmt(p.area_ha, 1) + " ha</b>" +
      (p.park_ha > 0 ? " (" + fmt(p.park_ha, 1) + " ha " + t("inPark") + ")" : "") + "</div>" +
      '<div class="pop-r">' + t("severity") + ": <b>" + sev + "</b></div>";
    new maplibregl.Popup({ closeButton: true, maxWidth: "260px" }).setLngLat(e.lngLat).setHTML(html).addTo(map);
  }

  /* ---------------- toast ---------------- */
  var toastTimer;
  function toast(msg) {
    var el = $("#toast");
    el.textContent = msg;
    el.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("is-on"); }, 2600);
  }

  /* ---------------- wiring ---------------- */
  $$(".seg-btn[data-view]").forEach(function (b) { b.addEventListener("click", function () { set3d(b.dataset.view === "3d"); }); });
  $$(".seg-btn[data-base]").forEach(function (b) { b.addEventListener("click", function () { setBase(b.dataset.base); }); });
  $$(".lang-btn").forEach(function (b) { b.addEventListener("click", function () { applyLang(b.dataset.lang); }); });
  var sheet = $("#sheet");
  if (!isDesktop()) sheet.classList.add("is-collapsed");
  $("#sheetHandle").addEventListener("click", function () { sheet.classList.toggle("is-collapsed"); });
  $("#factLaCueva").textContent = fmt(S.lacueva);

  var saved = null;
  try { saved = localStorage.getItem("vn_lang"); } catch (e) {}
  applyLang(saved === "en" ? "en" : "es");

  map.once("style.load", function () {
    set3d(true, true);
    goTo(PLACES[0], true); // start on the area of the paper sketch (Villa Poppy)
    var first = document.querySelector('.place[data-id="sketch"]'); if (first) first.classList.add("is-on");
    buildLabels();
    map.on("move", refreshLabels);
    map.on("click", "burn-fill", burnPopup);
    map.on("mouseenter", "burn-fill", function () { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "burn-fill", function () { map.getCanvas().style.cursor = ""; });
    // attribution: collapsed on phones until the (i) button is tapped
    var at = document.querySelector(".maplibregl-ctrl-attrib");
    var ab = document.querySelector(".maplibregl-ctrl-attrib-button");
    if (ab) ab.addEventListener("click", function () { at.classList.toggle("user-open"); });
  });
  map.on("error", function (e) { if (window.console) console.warn("map error", e && e.error && e.error.message); });

  window.VN_MAP = map; // for debugging
})();
