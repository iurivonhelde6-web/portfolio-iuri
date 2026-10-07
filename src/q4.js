/* ================= 3D CORE ================= */
const canvas = document.getElementById("gl");
let renderer = null;
try { renderer = new THREE.WebGLRenderer({canvas, antialias:true, powerPreference:"high-performance"}); } catch (e) { renderer = null; }
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, .1, 1600);
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const rnd = (a, b) => a + Math.random()*(b - a);
const pick = a => a[Math.floor(Math.random()*a.length)];
const TAU = Math.PI*2;
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const SP = REDUCED ? .35 : 1;
let ANISO = 4;
if (renderer){ renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); ANISO = renderer.capabilities.getMaxAnisotropy(); }

/* ---- toon materials ---- */
const GRAD = (() => { const d = new Uint8Array([70,70,70,255, 150,150,150,255, 215,215,215,255, 255,255,255,255]);
  const t = new THREE.DataTexture(d, 4, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; return t; })();
const matCache = {};
const TM = (c, extra) => { const k = c + (extra ? JSON.stringify(Object.keys(extra)) + Math.random() : "");
  if (!extra && matCache[k]) return matCache[k];
  const m = new THREE.MeshToonMaterial(Object.assign({color:new THREE.Color(c), gradientMap:GRAD}, extra || {}));
  if (!extra) matCache[k] = m; return m; };
function box(p, w, h, d, c, x, y, z, mat){ const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat || TM(c)); m.position.set(x, y, z); p.add(m); return m; }
function cyl(p, r1, r2, h, c, x, y, z, seg){ const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg || 14), TM(c)); m.position.set(x, y, z); p.add(m); return m; }
function ball(p, r, c, x, y, z, detail){ const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, detail ?? 1), TM(c)); m.position.set(x, y, z); p.add(m); return m; }
function rrShape(w, h, r){ const s = new THREE.Shape(), x = -w/2, y = -h/2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; }

/* ---- canvas textures ---- */
function cvs(w, h, fn){ const c = document.createElement("canvas"); c.width = w; c.height = h; fn(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.anisotropy = ANISO; return t; }
const GLOW = cvs(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(.25, "rgba(255,255,255,.55)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });
const DOT = cvs(32, 32, (g) => { const r = g.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, "#fff"); r.addColorStop(.4, "rgba(255,255,255,.8)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 32, 32); });
function glow(p, color, size, x, y, z, op){ const s = new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW, color, transparent:true, opacity:op ?? .9, blending:THREE.AdditiveBlending, depthWrite:false, fog:false}));
  s.scale.set(size, size, 1); s.position.set(x, y, z); p.add(s); return s; }
function motes(p, n, cx, cy, cz, rx, ry, rz, color, size, op){
  const pos = new Float32Array(n*3); for (let i = 0; i < n; i++){ pos[i*3] = cx + rnd(-rx, rx); pos[i*3+1] = cy + rnd(-ry, ry); pos[i*3+2] = cz + rnd(-rz, rz); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({color, size, map:DOT, transparent:true, opacity:op ?? .9, depthWrite:false, blending:THREE.AdditiveBlending, fog:false}));
  p.add(pts); return pts;
}
function labelTex(text, bg, fg, w, h, font){ return cvs(w, h, (g) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle";
  let fs = h*.62; g.font = (font || "800 ") + fs + "px 'Big Shoulders Display', 'Arial Narrow', Arial"; while (g.measureText(text).width > w*.86 && fs > 8){ fs -= 2; g.font = (font || "800 ") + fs + "px 'Big Shoulders Display', 'Arial Narrow', Arial"; }
  g.fillText(text, w/2, h/2 + 2); }); }
function stripeTex(a, b){ const t = cvs(64, 16, (g) => { g.fillStyle = a; g.fillRect(0, 0, 64, 16); g.fillStyle = b; g.fillRect(0, 0, 16, 16); g.fillRect(32, 0, 16, 16); }); t.wrapS = THREE.RepeatWrapping; return t; }

/* window atlas for distant city (walls tinted by vertex colour) */
const WIN = (() => {
  const make = (lit) => cvs(256, 256, (g) => {
    g.fillStyle = lit ? "#000" : "#cdcbe0"; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++){
      const x = i*64 + 16, y = j*64 + 12, on = ((i*7 + j*13) % 5 === 0) || ((i + j*3) % 7 === 0);
      if (lit){ if (on){ g.fillStyle = (i + j) % 3 ? "#ffcf7a" : "#ff9ec4"; g.fillRect(x + 3, y + 3, 26, 34); } continue; }
      g.fillStyle = "#ffffff"; g.fillRect(x - 3, y - 3, 38, 46);
      g.fillStyle = "#34386a"; g.fillRect(x + 3, y + 3, 26, 34);
      g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(x + 3, y + 3, 26, 6);
      g.fillStyle = "#ffffff"; g.fillRect(x - 5, y + 42, 42, 5);
    }
  });
  const a = make(false), b = make(true); [a, b].forEach(t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; });
  return {map:a, lit:b};
})();
const CITY_MAT = new THREE.MeshToonMaterial({map:WIN.map, emissiveMap:WIN.lit, emissive:new THREE.Color(0xffffff), emissiveIntensity:.95, vertexColors:true, gradientMap:GRAD});
const BCOL = ["#4a5fc0","#c2466a","#e0874a","#6a58b8","#2f8f86","#8a6ad8","#a8467f","#4c86d0","#d8a24a","#3e4a9a"];
const BCOL_MUTED = ["#4b5690","#8e3d56","#b87a4c","#3d4c84","#2e6d68","#5a4d8e","#7c3f66","#3b5a8d","#a88a50","#35416f","#9a4a5a","#2d7a5e"];

function mergeInto(list, mat){
  let n = 0; list.forEach(o => n += o.g.attributes.position.count);
  const P = new Float32Array(n*3), N = new Float32Array(n*3), U = new Float32Array(n*2), Cc = new Float32Array(n*3);
  let o3 = 0, o2 = 0;
  list.forEach(o => { const g = o.g, c = g.attributes.position.count;
    P.set(g.attributes.position.array, o3); N.set(g.attributes.normal.array, o3); U.set(g.attributes.uv.array, o2);
    for (let i = 0; i < c; i++){ Cc[o3 + i*3] = o.c.r; Cc[o3 + i*3 + 1] = o.c.g; Cc[o3 + i*3 + 2] = o.c.b; }
    o3 += c*3; o2 += c*2; });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(P, 3)); geo.setAttribute("normal", new THREE.BufferAttribute(N, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(U, 2)); geo.setAttribute("color", new THREE.BufferAttribute(Cc, 3));
  geo.computeBoundingSphere();
  return new THREE.Mesh(geo, mat);
}
function pushBox(list, w, h, d, x, y, z, color, solid){
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, ou = Math.floor(Math.random()*4)/4, ov = Math.floor(Math.random()*4)/4;
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++){ const i = f*4 + v;
    if (solid || f === 2 || f === 3){ uv.setXY(i, .006, .006); continue; }
    const fw = f < 2 ? d : w; uv.setXY(i, uv.getX(i)*fw/8.8 + ou, uv.getY(i)*h/11.2 + ov); }
  g.translate(x, y, z); list.push({g:g.toNonIndexed(), c:new THREE.Color(color)});
}
/* distant city block: merged buildings + ground with streets + lights + moving car lights */
function city(p, o){
  const list = [], roof = new THREE.Color(o.muted ? "#a3a6d6" : "#b9b4ef"), PAL = o.muted ? BCOL_MUTED : BCOL;
  const cols = Math.round((o.x1 - o.x0)/o.sp), rows = Math.round((o.z1 - o.z0)/o.sp);
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++){
    const cx = o.x0 + (i + .5)*o.sp, cz = o.z0 + (j + .5)*o.sp;
    if (o.skip && o.skip(cx, cz)) continue;
    const n = Math.random() < .35 ? 2 : 1;
    for (let k = 0; k < n; k++){
      const w = n === 2 ? rnd(3, o.sp*.42) : rnd(o.sp*.45, o.sp*.72), d = rnd(o.sp*.45, o.sp*.7);
      const tall = Math.random() < (o.tall ?? .12), h = tall ? rnd(o.hmax*.9, o.hmax*1.5) : rnd(o.hmin, o.hmax);
      const x = cx + (n === 2 ? (k ? 1 : -1)*o.sp*.2 : rnd(-.8, .8)), z = cz + rnd(-.8, .8), col = new THREE.Color(pick(PAL));
      pushBox(list, w, h, d, x, o.y + h/2, z, col);
      pushBox(list, w + .5, .45, d + .5, x, o.y + h + .22, z, col.clone().lerp(roof, o.muted ? .78 : .55), true);
      if (Math.random() < .6) pushBox(list, rnd(1, 2.2), rnd(.8, 1.6), rnd(1, 2), x + rnd(-w/4, w/4), o.y + h + .9, z + rnd(-d/4, d/4), "#8e88c8", true);
      if (Math.random() < .25){ pushBox(list, 1.4, 1.6, 1.4, x - w/4, o.y + h + 1.7, z, "#7b6fb0", true); }
      if (o.muted && Math.random() < .35){ const side = Math.random() < .5 ? -1 : 1, n2 = Math.max(3, Math.floor(w/0.7));
        for (let k2 = 0; k2 < n2; k2++) pushBox(list, w/n2, .12, 1.1, x - w/2 + (k2 + .5)*w/n2, o.y + 3.2, z + side*(d/2 + .5), k2 % 2 ? "#f0e6f0" : "#c8445a", true); }
    }
  }
  const mesh = mergeInto(list, CITY_MAT); p.add(mesh);
  const gt = cvs(128, 128, (g) => { g.fillStyle = "#26244a"; g.fillRect(0, 0, 128, 128); g.fillStyle = "#3d3a70"; g.fillRect(12, 12, 104, 104);
    g.fillStyle = "#4a4686"; g.fillRect(16, 16, 96, 96); g.fillStyle = "rgba(255,210,140,.5)"; for (let i = 0; i < 128; i += 12){ g.fillRect(i, 5, 6, 2); g.fillRect(5, i, 2, 6); } });
  gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set((o.x1 - o.x0)/o.sp, (o.z1 - o.z0)/o.sp);
  const gr = new THREE.Mesh(new THREE.PlaneGeometry(o.x1 - o.x0, o.z1 - o.z0), new THREE.MeshBasicMaterial({map:gt}));
  gr.rotation.x = -Math.PI/2; gr.position.set((o.x0 + o.x1)/2, o.y + .02, (o.z0 + o.z1)/2); p.add(gr);
  // street lights along the grid
  const L = [];
  for (let i = 0; i <= cols; i++) for (let j = 0; j <= rows; j++) if (Math.random() < .7) L.push(o.x0 + i*o.sp + rnd(-.3, .3), o.y + .6, o.z0 + j*o.sp + rnd(-o.sp/2, o.sp/2));
  const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(L), 3));
  p.add(new THREE.Points(lg, new THREE.PointsMaterial({color:o.muted ? 0xff9a3c : 0xffc070, size:o.lampSize || 1.3, map:DOT, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending})));
  // moving car lights
  const nc = o.cars || 60, cp = new Float32Array(nc*3), cd = [];
  for (let k = 0; k < nc; k++){ const alongX = Math.random() < .5, lane = alongX ? o.z0 + Math.floor(Math.random()*(rows + 1))*o.sp : o.x0 + Math.floor(Math.random()*(cols + 1))*o.sp;
    cd.push({alongX, lane, s:rnd(-1, 1) < 0 ? -rnd(6, 14) : rnd(6, 14), t:rnd(0, 1)}); }
  const cg = new THREE.BufferGeometry(); cg.setAttribute("position", new THREE.BufferAttribute(cp, 3));
  const cars = new THREE.Points(cg, new THREE.PointsMaterial({color:0xfff0d0, size:(o.lampSize || 1.3)*.9, map:DOT, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending}));
  p.add(cars);
  const W = o.x1 - o.x0, Dd = o.z1 - o.z0;
  return {mesh, update:(t, dt) => { const a = cg.attributes.position;
    cd.forEach((c, k) => { c.t = (c.t + c.s*dt*SP/(c.alongX ? W : Dd) + 1) % 1;
      if (c.alongX) a.setXYZ(k, o.x0 + c.t*W, o.y + .5, c.lane + (c.s > 0 ? .8 : -.8)); else a.setXYZ(k, c.lane + (c.s > 0 ? .8 : -.8), o.y + .5, o.z0 + c.t*Dd); });
    a.needsUpdate = true; }};
}

/* detailed facade for street scenes */
const SHOPS = ["CAFÉ","LIVROS","PADARIA","FLORES","DOCES","ARTE","DISCOS","BAR","ÓTICA","SUCOS"];
const WALLS = [["#b8465e","#8f3149"],["#d97b44","#ad5a2c"],["#4d62b8","#374a92"],["#6c56b0","#52408c"],["#2f8a82","#226a64"],["#c85a8a","#9c406a"],["#d6a04a","#aa7a30"]];
function facadeTex(wm, hm, wall){
  const ppm = Math.min(30, 900/hm), W = Math.round(wm*ppm), H = Math.round(hm*ppm);
  return cvs(W, H, (g) => {
    const m = v => v*ppm;
    g.fillStyle = wall[0]; g.fillRect(0, 0, W, H);
    g.fillStyle = "rgba(0,0,0,.07)"; for (let y = 0; y < H; y += m(.3)){ g.fillRect(0, y, W, 1.5); const off = (Math.round(y/m(.3)) % 2)*m(.35); for (let x = off; x < W; x += m(.7)) g.fillRect(x, y, 1.5, m(.3)); }
    g.fillStyle = "rgba(255,255,255,.14)"; g.fillRect(0, 0, m(.35), H); g.fillRect(W - m(.35), 0, m(.35), H);
    // cornice
    g.fillStyle = "#e9e3f6"; g.fillRect(0, 0, W, m(.55)); g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(0, m(.55), W, m(.12));
    for (let x = m(.2); x < W; x += m(.5)){ g.fillStyle = "#d4cde8"; g.fillRect(x, m(.55), m(.22), m(.22)); }
    // upper floors
    const gfh = 4.3, fh = 3.1, cols = Math.max(2, Math.floor(wm/2.6)), cw = wm/cols;
    let floorBase = gfh;
    while (floorBase + fh <= hm - .6){
      for (let c = 0; c < cols; c++){
        const wx = m(c*cw + cw/2 - .65), wy = H - m(floorBase + .7 + 1.9), ww = m(1.3), wh = m(1.9), lit = Math.random() < .28;
        g.fillStyle = "rgba(0,0,0,.2)"; g.fillRect(wx - m(.12), wy - m(.24), ww + m(.24), m(.16));
        g.fillStyle = "#efe9fa"; g.fillRect(wx - m(.14), wy - m(.14), ww + m(.28), wh + m(.28));
        const gl = g.createLinearGradient(wx, wy, wx, wy + wh);
        if (lit){ gl.addColorStop(0, "#ffe2a0"); gl.addColorStop(1, "#ffb45a"); } else { gl.addColorStop(0, "#4a5190"); gl.addColorStop(1, "#262a55"); }
        g.fillStyle = gl; g.fillRect(wx, wy, ww, wh);
        g.fillStyle = "#efe9fa"; g.fillRect(wx + ww/2 - m(.05), wy, m(.1), wh); g.fillRect(wx, wy + wh*.38, ww, m(.08));
        if (lit && Math.random() < .5){ g.fillStyle = "rgba(160,60,90,.55)"; g.fillRect(wx, wy, ww*.3, wh); }
        if (!lit){ g.fillStyle = "rgba(255,255,255,.16)"; g.beginPath(); g.moveTo(wx, wy + wh*.3); g.lineTo(wx + ww*.3, wy); g.lineTo(wx + ww*.45, wy); g.lineTo(wx, wy + wh*.45); g.fill(); }
        g.fillStyle = "#fbf7ff"; g.fillRect(wx - m(.22), wy + wh + m(.08), ww + m(.44), m(.18));
        g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(wx - m(.22), wy + wh + m(.26), ww + m(.44), m(.08));
      }
      floorBase += fh;
    }
    // ground floor shop
    g.fillStyle = wall[1]; g.fillRect(0, H - m(gfh), W, m(gfh));
    g.fillStyle = "#1c1a36"; g.fillRect(m(.4), H - m(4.15), W - m(.8), m(.7));
    g.fillStyle = "#fff4dc"; g.textAlign = "center"; g.textBaseline = "middle"; g.font = "800 " + m(.5) + "px 'Big Shoulders Display','Arial Narrow',Arial";
    g.fillText(pick(SHOPS), W/2, H - m(3.8));
    const sx = m(.6), sw = W - m(2.6), sy = H - m(3.1), sh = m(2.4);
    const sg = g.createLinearGradient(0, sy, 0, sy + sh); sg.addColorStop(0, "#ffe7b0"); sg.addColorStop(1, "#ff9d5c");
    g.fillStyle = Math.random() < .7 ? sg : "#2d3266"; g.fillRect(sx, sy, sw, sh);
    g.fillStyle = "rgba(60,30,60,.35)"; for (let k = 1; k < 4; k++) g.fillRect(sx + sw*k/4, sy, m(.08), sh);
    g.fillStyle = "rgba(90,40,70,.5)"; g.fillRect(sx + m(.3), sy + sh - m(.9), m(.8), m(.9)); g.fillRect(sx + sw - m(1.4), sy + sh - m(.6), m(1), m(.6));
    g.strokeStyle = "#f2ecfb"; g.lineWidth = m(.12); g.strokeRect(sx, sy, sw, sh);
    g.fillStyle = "#3b2440"; g.fillRect(W - m(1.7), H - m(2.8), m(1.1), m(2.8)); g.fillStyle = "#f2ecfb"; g.fillRect(W - m(1.7), H - m(2.9), m(1.1), m(.12));
    g.fillStyle = "#ffcf6b"; g.beginPath(); g.arc(W - m(.8), H - m(1.4), m(.06), 0, 7); g.fill();
  });
}
const FACADES = {};
function facadeFor(w, h){ const key = Math.round(w/2) + "_" + Math.round(h/4), list = FACADES[key] || (FACADES[key] = []);
  if (list.length < 3){ const wall = pick(WALLS), t = facadeTex(Math.round(w/2)*2, Math.round(h/4)*4, wall); list.push([t, wall]); return list[list.length - 1]; }
  return pick(list); }
function streetBuilding(p, w, h, d, x, z, rotY){
  const [ft, wall] = facadeFor(w, h), grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = rotY; p.add(grp);
  const side = TM(wall[1]), roofM = TM("#9b92d8"), front = new THREE.MeshToonMaterial({map:ft, emissiveMap:ft, emissive:new THREE.Color(0x5a5a5a), gradientMap:GRAD});
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, roofM, roofM, front, side]); b.position.y = h/2; grp.add(b);
  box(grp, w + .5, .45, .7, "#ece6f8", 0, h - .1, d/2 + .2);
  box(grp, w + .2, .3, .5, "#d7d0ec", 0, 4.3, d/2 + .15);
  const aw = new THREE.Mesh(new THREE.BoxGeometry(w - 2.2, .1, 1.5), new THREE.MeshToonMaterial({map:stripeTex(pick(["#f4efe6","#ffe9c9"]), pick(["#d6405c","#3f7fd6","#2f9a7a","#e08a2c"])), gradientMap:GRAD}));
  aw.material.map.repeat.set(Math.round((w - 2.2)*1.2), 1); aw.position.set(-.8, 3.95, d/2 + .72); aw.rotation.x = .38; grp.add(aw);
  if (Math.random() < .5){ const tank = cyl(grp, .8, .8, 1.6, "#8f86c4", rnd(-w/4, w/4), h + .9, rnd(-d/4, 0)); tank.material = TM("#8f86c4"); }
  return grp;
}

/* chunky low-poly street building: dark wall, 3D window frames, sills and lintels (facade faces local +z) */
const SOLID_MAT = new THREE.MeshToonMaterial({vertexColors:true, gradientMap:GRAD});
const LIT_MAT = new THREE.MeshBasicMaterial({vertexColors:true});
const CH_WALLS = ["#1f5957", "#6a2338", "#28386a", "#763a2f", "#3a2c5c", "#264e49", "#5a2a4e", "#2f4a78"];
const CH_TRIM = ["#f0b99c", "#bdb9e8", "#eadacb", "#e8a58e", "#a9c4e6"];
function chunkyBuilding(p, w, h, d, x, z, rotY){
  const grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = rotY; p.add(grp);
  const wall = new THREE.Color(pick(CH_WALLS)), trim = pick(CH_TRIM), light = wall.clone().lerp(new THREE.Color("#ffffff"), .12), dark = "#1c1f3c";
  const S = [], G = [], F = d/2;
  pushBox(S, w, h, d, 0, h/2, 0, wall, true);
  pushBox(S, .55, h, .3, -w/2 + .28, h/2, F + .1, light, true); pushBox(S, .55, h, .3, w/2 - .28, h/2, F + .1, light, true);
  pushBox(S, w + .7, .7, .9, 0, h - .2, F + .1, light, true); pushBox(S, w + .9, .25, 1.1, 0, h + .2, F + .15, trim, true);
  pushBox(S, w + .2, .4, .45, 0, 4.25, F + .15, trim, true);
  // ground floor shopfront
  const sw = w - 2.6; pushBox(S, sw + .5, 2.9, .2, -.5, 1.7, F + .05, trim, true);
  (Math.random() < .55 ? G : S).push(...(() => { const t = []; pushBox(t, sw, 2.5, .22, -.5, 1.7, F + .08, Math.random() < .55 ? "#ffcf8e" : dark, true); return t; })());
  pushBox(S, 1.1, 2.7, .25, w/2 - 1.1, 1.35, F + .06, "#2a1f3a", true);
  // upper floors
  const cols = Math.max(2, Math.floor(w/2.5)), cw = (w - 1.2)/cols;
  for (let y = 4.9; y + 2.3 < h - .6; y += 3.1){
    const balcony = Math.random() < .18;
    for (let c = 0; c < cols; c++){
      const cx = -w/2 + .6 + cw*(c + .5), cy = y + 1.05, lit = Math.random() < .22;
      pushBox(lit ? G : S, 1.05, 1.6, .12, cx, cy, F + .02, lit ? pick(["#ffd29a", "#ffb3c8", "#ffe4b8"]) : dark, true);
      pushBox(S, 1.5, .26, .4, cx, cy + .94, F + .16, trim, true);
      pushBox(S, 1.62, .2, .55, cx, cy - .9, F + .22, trim, true);
      pushBox(S, .2, 1.9, .3, cx - .64, cy, F + .12, trim, true); pushBox(S, .2, 1.9, .3, cx + .64, cy, F + .12, trim, true);
      pushBox(S, .08, 1.6, .16, cx, cy, F + .08, trim, true);
    }
    if (balcony){ pushBox(S, w*.6, .18, 1.1, 0, y - .02, F + .55, light, true); for (let k = 0; k <= 8; k++) pushBox(S, .06, .8, .06, -w*.3 + k*w*.6/8, y + .4, F + 1.05, "#2a2448", true); pushBox(S, w*.6, .06, .08, 0, y + .8, F + 1.05, "#2a2448", true); }
  }
  grp.add(mergeInto(S, SOLID_MAT)); if (G.length) grp.add(mergeInto(G, LIT_MAT));
  if (Math.random() < .5){ const aw = new THREE.Mesh(new THREE.BoxGeometry(sw, .08, 1.4), new THREE.MeshToonMaterial({map:stripeTex("#f1e9ee", pick(["#c8445a", "#3f6fc0", "#2f8a72"])), gradientMap:GRAD}));
    aw.material.map.repeat.set(Math.round(sw*1.2), 1); aw.position.set(-.5, 3.55, F + .75); aw.rotation.x = .42; grp.add(aw); }
  return grp;
}

function lamp(p, x, z, facing){
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = facing || 0; p.add(g);
  cyl(g, .09, .13, 5, "#26244a", 0, 2.5, 0, 8); cyl(g, .2, .24, .5, "#26244a", 0, .25, 0, 8);
  const arm = new THREE.Mesh(new THREE.TorusGeometry(.55, .05, 6, 12, Math.PI/2), TM("#26244a")); arm.position.set(.55, 5, 0); arm.rotation.z = Math.PI/2; g.add(arm);
  cyl(g, .05, .28, .28, "#26244a", 1.1, 5.4, 0, 10);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.16, 10, 8), new THREE.MeshBasicMaterial({color:0xfff0c8})); bulb.position.set(1.1, 5.25, 0); g.add(bulb);
  glow(g, 0xffc27a, 3.4, 1.1, 5.2, 0, .8); glow(g, 0xff9a5a, 7, 1.1, 5.1, 0, .22);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), new THREE.MeshBasicMaterial({map:GLOW, color:0xff9a50, transparent:true, opacity:.28, blending:THREE.AdditiveBlending, depthWrite:false}));
  pool.rotation.x = -Math.PI/2; pool.position.set(1.4, .03, 0); g.add(pool);
  return g;
}
function hydrant(p, x, z){ const g = new THREE.Group(); g.position.set(x, 0, z); p.add(g);
  cyl(g, .2, .24, .7, "#d63a4a", 0, .35, 0, 10); ball(g, .22, "#e04a58", 0, .74, 0); cyl(g, .07, .07, .5, "#b82f3e", 0, .5, 0, 6).rotation.z = Math.PI/2; return g; }
function planter(p, x, z){ const g = new THREE.Group(); g.position.set(x, 0, z); p.add(g);
  cyl(g, .38, .3, .6, "#c0663a", 0, .3, 0, 10); const b = ball(g, .55, "#1f8a6a", 0, 1.05, 0); b.scale.set(1, 1.35, 1); ball(g, .35, "#2aa57c", .15, 1.45, .1); return g; }

/* ---- sky dome + stars ---- */
const skyMat = new THREE.ShaderMaterial({
  uniforms:{top:{value:new THREE.Color()}, mid:{value:new THREE.Color()}, bot:{value:new THREE.Color()}, sunDir:{value:V3(0, .1, -1)}, sunCol:{value:new THREE.Color()}, sunK:{value:0}},
  vertexShader:"varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader:"uniform vec3 top; uniform vec3 mid; uniform vec3 bot; uniform vec3 sunDir; uniform vec3 sunCol; uniform float sunK; varying vec3 vP;" +
    "void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.55, h)) : mix(mid, bot, smoothstep(0.0, -0.3, h));" +
    "float s = max(dot(normalize(vP), normalize(sunDir)), 0.0); c += sunCol * (pow(s, 5.0) * 0.5 + pow(s, 40.0) * 0.6) * sunK; gl_FragColor = vec4(c, 1.0); }",
  side:THREE.BackSide, depthWrite:false
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), skyMat); sky.renderOrder = -10;
const starGeo = (() => { const n = 1100, a = new Float32Array(n*3); for (let i = 0; i < n; i++){ const th = rnd(0, TAU), ph = Math.acos(rnd(.04, 1)); a[i*3] = Math.sin(ph)*Math.cos(th)*800; a[i*3+1] = Math.cos(ph)*800; a[i*3+2] = Math.sin(ph)*Math.sin(th)*800; }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(a, 3)); return g; })();
const starMat = new THREE.PointsMaterial({color:0xffffff, size:2.4, sizeAttenuation:false, map:DOT, transparent:true, depthWrite:false, opacity:1, fog:false});
const stars = new THREE.Points(starGeo, starMat);
const skyRig = new THREE.Group(); skyRig.add(sky); skyRig.add(stars); scene.add(skyRig);
const hemi = new THREE.HemisphereLight(0xc4b4ff, 0x2a1840, .9); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffd0a0, .9); sun.position.set(30, 60, 25); scene.add(sun); scene.add(sun.target);
scene.fog = new THREE.Fog(0x7a2a86, 60, 320);

/* ---- hero (illustrated sprite in the 3D world) ---- */
const HERO_P = 2.07;                                   // plane size in metres (figure ≈ 1.8 m)
const HIP_UP = (CH.HIP.y - CH.SIZE/2)/CH.SIZE*HERO_P;  // hip sits this far below the plane centre
const shadowTex = cvs(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, "rgba(10,6,30,.55)"); r.addColorStop(1, "rgba(10,6,30,0)"); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
/* one illustrated hero per scene, so two scenes can be on screen during a dissolve */
function makeHero(){
  const c = document.createElement("canvas"); c.width = c.height = CH.SIZE;
  const tex = new THREE.CanvasTexture(c); tex.anisotropy = ANISO;
  const mat = new THREE.MeshBasicMaterial({map:tex, transparent:true, alphaTest:.04, side:THREE.DoubleSide, fog:false});
  const group = new THREE.Group(), plane = new THREE.Mesh(new THREE.PlaneGeometry(HERO_P, HERO_P), mat); plane.position.y = HIP_UP; group.add(plane);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.5, .7), new THREE.MeshBasicMaterial({map:shadowTex, transparent:true, depthWrite:false})); shadow.rotation.x = -Math.PI/2;
  return {group, tex, ctx:c.getContext("2d"), mat, shadow, plane};
}
const HIP_H = (CH.SIZE - 4 - CH.HIP.y)/CH.SIZE*HERO_P; // hip height above the soles (lowest shoe pixel measured at canvas y ≈ 796)
