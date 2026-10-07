/* ================= RG · Iuri, articulated and cel-shaded =================
   Every body part is a closed shape (tapered capsules / smooth outlines) solved from a skeleton each frame.
   Parts are painted flat with an outline, then two whole-figure passes add anime-style cel shading:
   a cool shadow crescent on the side away from the light (multiply) and a thin rim light on the lit edge (screen). */
const RG = (function(){
"use strict";
const PPM = 478, rad = Math.PI/180, TAU = Math.PI*2, OL = 3.2;
const K = {skin:"#efb892", skinD:"#cf8d69", lip:"#b56858", hair:"#15161d", hairL:"#3a4058", beard:"#232129", beardL:"#34323c",
  jac:"#8e939c", jacD:"#6b707b", jacL:"#b7bcc4", pan:"#48566f", panD:"#343f55", panL:"#66799c",
  tee:"#16171d", pant:"#1b1c23", pantL:"#30334a", boot:"#141419", bootL:"#2e3140", sole:"#5b5f70",
  ol:"#11111c", iris:"#3b2519", white:"#f6f2ee", frame:"#191b25", chair:"#1c2252", chairD:"#12163a", blue:"#2e5cff", cloud:"#f3effc",
  metal:"#c3c8d3", metalD:"#8e95a5", metalL:"#eef1f6", joint:"#363a47", jointL:"#565c6e", face:"#e9ecf2", visor:"#1b1e2a", glow:"#5ee8ff"};
const hexv = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, k) => { const A = hexv(a), B = hexv(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v)*k).toString(16).padStart(2, "0")).join(""); };
const KF = {}; for (const n in K) KF[n] = n === "ol" ? K.ol : mix(K[n], "#1a1838", .32);
const L = {thigh:212, shin:204, upper:162, fore:146};
const INFO = {
  stand:{W:760, H:1000, hip:[380, 520], gy:960}, walkf:{W:760, H:1090, hip:[380, 520], gy:960}, cheer:{W:820, H:1260, hip:[410, 780], gy:1220},
  ride:{W:720, H:840, hip:[250, 540], gy:0}, fly:{W:1300, H:720, hip:[700, 390], gy:0},
  type:{W:780, H:720, hip:[390, 540], gy:0}, sit:{W:920, H:720, hip:[460, 540], gy:0}
};
const STRIDE = 170, WALK_V = 1.2, WALK_T = 2*STRIDE/(.6*WALK_V*PPM);

/* ---------- math ---------- */
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const rot = (p, a) => { const s = Math.sin(a), c = Math.cos(a); return [p[0]*c - p[1]*s, p[0]*s + p[1]*c]; };
const lerp = (a, b, k) => a + (b - a)*k, lerp2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
const sstep = x => { x = Math.max(0, Math.min(1, x)); return x*x*(3 - 2*x); };
function ik(a, b, L1, L2, dir){
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1e-3, dm = Math.min(d, L1 + L2 - .5), ux = dx/d, uy = dy/d;
  const x = (L1*L1 - L2*L2 + dm*dm)/(2*dm), h = Math.sqrt(Math.max(0, L1*L1 - x*x));
  return {j:[a[0] + ux*x - dir*uy*h, a[1] + uy*x + dir*ux*h], e:[a[0] + ux*dm, a[1] + uy*dm]};
}
const shoulderOf = (hip, ta) => add(hip, rot([0, -246], ta));
const headOf = (hip, ta) => add(hip, rot([0, -284], ta));
/* organic motion: smooth value noise, "hold then move" targets, irregular blinks */
const hash = n => { const v = Math.sin(n*127.1 + 311.7)*43758.5453; return v - Math.floor(v); };
function noise(t, seed){ const i = Math.floor(t), f = t - i, u = f*f*(3 - 2*f); return (hash(i + seed*57.31)*(1 - u) + hash(i + 1 + seed*57.31)*u)*2 - 1; }
const fbm = (t, seed) => noise(t, seed)*.65 + noise(t*2.17 + 3.1, seed + 9)*.35;
const smoother = x => { x = Math.max(0, Math.min(1, x)); return x*x*x*(x*(x*6 - 15) + 10); };
function hold(t, seed, D, vals, trans){
  const val = k => Array.isArray(vals) ? vals[Math.floor(hash(k*3.7 + seed)*vals.length)] : vals.lo + (vals.hi - vals.lo)*hash(k*3.7 + seed);
  let k = Math.floor(t/D), st = k*D + hash(k*1.3 + seed*2.1)*D*.6;
  if (t < st){ k--; st = k*D + hash(k*1.3 + seed*2.1)*D*.6; }
  return val(k - 1) + (val(k) - val(k - 1))*smoother((t - st)/trans);
}
function blinkAt(t, seed){ seed = seed || 0; const D = 3.3, k = Math.floor(t/D), st = k*D + hash(k + seed)*D*.7, d = t - st;
  return (d >= 0 && d < .11) || (hash(k*1.7 + seed) > .76 && d >= .24 && d < .34); }

/* ---------- path builders (all subpaths share one winding so unions fill correctly) ---------- */
function cap(x, a, b, ra, rb, dx, dy){
  const ax = a[0] + dx, ay = a[1] + dy, bx = b[0] + dx, by = b[1] + dy, ex = bx - ax, ey = by - ay, d = Math.hypot(ex, ey);
  if (d < Math.abs(ra - rb) + .5){ const r = Math.max(ra, rb); x.moveTo(ax + r, ay); x.arc(ax, ay, r, 0, TAU); x.closePath(); return; }
  const ang = Math.atan2(ey, ex), ph = Math.acos((ra - rb)/d);
  x.moveTo(ax + ra*Math.cos(ang + ph), ay + ra*Math.sin(ang + ph));
  x.arc(ax, ay, ra, ang + ph, ang + TAU - ph); x.arc(bx, by, rb, ang - ph, ang + ph); x.closePath();
}
function circ(x, cx, cy, r, dx, dy){ x.moveTo(cx + dx + r, cy + dy); x.arc(cx + dx, cy + dy, r, 0, TAU); x.closePath(); }
function sm(x, P, dx, dy){
  const n = P.length;
  for (let i = 0; i < n; i++){ const p0 = P[(i - 1 + n)%n], p1 = P[i], p2 = P[(i + 1)%n], p3 = P[(i + 2)%n];
    if (!i) x.moveTo(p1[0] + dx, p1[1] + dy);
    x.bezierCurveTo(p1[0] + (p2[0] - p0[0])/6 + dx, p1[1] + (p2[1] - p0[1])/6 + dy, p2[0] - (p3[0] - p1[0])/6 + dx, p2[1] - (p3[1] - p1[1])/6 + dy, p2[0] + dx, p2[1] + dy); }
  x.closePath();
}
function poly(x, P, dx, dy){ x.moveTo(P[0][0] + dx, P[0][1] + dy); for (let i = 1; i < P.length; i++) x.lineTo(P[i][0] + dx, P[i][1] + dy); x.closePath(); }
function line(c, pts, w, col, cap_){ c.lineCap = cap_ || "round"; c.lineJoin = "round"; c.lineWidth = w; c.strokeStyle = col; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.stroke(); }
function curve(c, a, q, b, w, col){ c.lineCap = "round"; c.lineWidth = w; c.strokeStyle = col; c.beginPath(); c.moveTo(a[0], a[1]); c.quadraticCurveTo(q[0], q[1], b[0], b[1]); c.stroke(); }

/* ---------- painter: flat parts + shading passes ---------- */
let SS = null, SR = null, LIGHT = null;
const mkc = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
function begin(c, light){
  const W = c.canvas.width, H = c.canvas.height; LIGHT = light;
  if (!SS || SS.width !== W || SS.height !== H){ SS = mkc(W, H); SR = mkc(W, H); }
  for (const s of [SS, SR]){ const x = s.getContext("2d"); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = "source-over"; x.clearRect(0, 0, W, H); }
}
function part(c, shape, fill, details, o){
  o = o || {}; const M = c.getTransform();
  c.beginPath(); shape(c, 0, 0);
  if (o.ol !== 0){ c.lineWidth = (o.lw || OL)*2; c.strokeStyle = o.olc || K.ol; c.lineJoin = "round"; c.stroke(); }
  c.fillStyle = fill; c.fill();
  if (details){ c.save(); c.clip(); details(c); c.restore(); }
  const det = M.a*M.d - M.b*M.c || 1, inv = (x, y) => [(M.d*x - M.c*y)/det, (-M.b*x + M.a*y)/det];
  const k = o.k !== undefined ? o.k : LIGHT.k, r = o.r !== undefined ? o.r : LIGHT.r;
  const offs = [inv(LIGHT.x*k, LIGHT.y*k), inv(-LIGHT.x*r, -LIGHT.y*r)];
  [SS, SR].forEach((S, i) => { const x = S.getContext("2d"); x.setTransform(M);
    x.globalCompositeOperation = "destination-out"; x.beginPath(); shape(x, 0, 0); x.fill();
    if (o.flat || (i === 1 && o.noRim)) return;
    x.globalCompositeOperation = "source-over"; x.fillStyle = "#fff"; x.fill();
    x.globalCompositeOperation = "destination-out"; x.beginPath(); shape(x, offs[i][0], offs[i][1]); x.fill();
    x.globalCompositeOperation = "source-over"; });
}
function end(c){
  const W = c.canvas.width, H = c.canvas.height;
  [[SS, LIGHT.shadow], [SR, LIGHT.rim]].forEach(([S, col]) => { const x = S.getContext("2d"); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = col; x.fillRect(0, 0, W, H); x.globalCompositeOperation = "source-over"; });
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = "multiply"; c.drawImage(SS, 0, 0);
  c.globalCompositeOperation = "screen"; c.globalAlpha = LIGHT.rimA; c.drawImage(SR, 0, 0);
  c.restore();
}
const LIGHTS = {
  front:{x:-.55, y:-.83, k:15, r:3.6, shadow:"#8f89ba", rim:"#aebcff", rimA:.55},
  side:{x:.5, y:-.86, k:15, r:3.6, shadow:"#8f89ba", rim:"#b6c2ff", rimA:.6},
  back:{x:.62, y:-.78, k:17, r:4, shadow:"#8a84b6", rim:"#c3cbff", rimA:.62}
};

/* ---------- robot materials ---------- */
// metal shells, dark joints / inner frame, cyan glow for eyes and the chest emblem
const glow = (c, col, blur, fn) => { c.save(); c.shadowColor = col; c.shadowBlur = blur; fn(); c.restore(); };
function disc(c, P, p, r, o){
  o = o || {};
  part(c, (x, dx, dy) => circ(x, p[0], p[1], r, dx, dy), P.joint, x => {
    x.fillStyle = P.metalD; x.beginPath(); x.arc(p[0], p[1], r*.66, 0, TAU); x.fill(); x.strokeStyle = P.joint; x.lineWidth = 2; x.stroke();
    x.fillStyle = P.metalL; x.beginPath(); x.arc(p[0] - r*.18, p[1] - r*.18, r*.26, 0, TAU); x.fill();
    x.fillStyle = P.joint; x.beginPath(); x.arc(p[0], p[1], r*.18, 0, TAU); x.fill(); }, {k:o.k || 6, lw:2.6});
}
function shell(c, P, a, b, ra, rb, t0, t1, seam){
  const A = lerp2(a, b, t0), B = lerp2(a, b, t1);
  part(c, (x, dx, dy) => cap(x, A, B, ra, rb, dx, dy), P.metal, x => {
    const d = [B[0] - A[0], B[1] - A[1]], n = Math.hypot(d[0], d[1]) || 1, v = [-d[1]/n, d[0]/n];
    if (seam !== false) line(x, [[A[0] + v[0]*ra*.35, A[1] + v[1]*ra*.35], [B[0] + v[0]*rb*.35, B[1] + v[1]*rb*.35]], 2, P.metalD);
    line(x, [lerp2(A, B, .8), B], (ra + rb)*.95, P.metalD, "butt");                        // darker cuff ring near the next joint
    line(x, [lerp2(A, B, .8), lerp2(A, B, .83)], (ra + rb)*.95, P.joint, "butt");
  }, {k:13});
}
function bone(c, P, a, b, r){ part(c, (x, dx, dy) => cap(x, a, b, r, r*.9, dx, dy), P.joint, x => {
  const n = 5; for (let i = 1; i < n; i++){ const p = lerp2(a, b, i/n), d = [b[0] - a[0], b[1] - a[1]], m = Math.hypot(...d) || 1, v = [-d[1]/m*r, d[0]/m*r]; line(x, [[p[0] - v[0], p[1] - v[1]], [p[0] + v[0], p[1] + v[1]]], 1.6, P.jointL); } }, {k:4, lw:2.4}); }

/* ---------- hands (mechanical) ---------- */
const FINGERS = {relax:[[0, 14, 10], [0, 15, 12], [0, 13, 10]], fist:[[0, 8, 14], [0, 8, 14], [0, 8, 14]], flat:[[0, 17, 0], [0, 19, 0], [0, 16, 0]], type:[[0, 11, 14], [0, 12, 16], [0, 11, 14]]};
function hand(c, P, w, ang, kind, flip, far){
  kind = FINGERS[kind] ? kind : "relax"; const F = FINGERS[kind];
  c.save(); c.translate(w[0], w[1]); c.rotate(ang); if (flip) c.scale(1, -1);
  disc(c, P, [0, 0], 9, {k:3});
  part(c, (x, dx, dy) => sm(x, [[4, -12], [24, -13], [27, -6], [27, 6], [24, 12], [4, 11], [1, 0]], dx, dy), P.metal, x => line(x, [[8, -6], [22, -6]], 1.6, P.metalD), {k:6, lw:2.2});
  [-8, 0, 8].forEach((y0, i) => { const [, l, bend] = F[i], m = [27 + l*.55, y0*1.1 + bend*.3], e = [27 + l*.55 + l*.5*Math.cos(bend*.06), y0*1.15 + bend];
    part(c, (x, dx, dy) => { cap(x, [26, y0], m, 4.4, 4, dx, dy); cap(x, m, e, 4, 3.4, dx, dy); }, P.metal, x => { x.fillStyle = P.joint; x.beginPath(); x.arc(m[0], m[1], 2.4, 0, TAU); x.fill(); }, {k:3, lw:2}); });
  part(c, (x, dx, dy) => cap(x, [8, 10], kind === "fist" ? [24, 9] : [20, 19], 5, 4, dx, dy), P.metal, null, {k:3, lw:2});
  c.restore(); void far;
}

/* ---------- feet ---------- */
const FOOT_SIDE = [[-22, -26], [18, -26], [26, -6], [50, 6], [84, 16], [100, 28], [98, 40], [-24, 40], [-30, 20], [-28, -6]];
function bootSide(c, P, a, th){
  c.save(); c.translate(a[0], a[1]); c.rotate(th*rad); c.scale(.9, .9);
  part(c, (x, dx, dy) => sm(x, FOOT_SIDE, dx, dy), P.metal, x => { x.fillStyle = P.joint; x.fillRect(-60, 30, 200, 20); line(x, [[30, -2], [52, 8], [88, 18]], 2.2, P.metalD); line(x, [[44, 6], [40, 30]], 2, P.metalD); }, {k:10});
  c.restore();
}
function bootBack(c, P, a){
  c.save(); c.translate(a[0], a[1]);
  part(c, (x, dx, dy) => sm(x, [[-24, -30], [24, -30], [28, 10], [33, 30], [29, 44], [-29, 44], [-33, 30], [-28, 10]], dx, dy), P.metal, x => { x.fillStyle = P.joint; x.fillRect(-40, 34, 80, 14); line(x, [[0, -26], [0, 30]], 2, P.metalD); }, {k:10});
  c.restore();
}

/* ---------- limbs ---------- */
function legPart(c, P, h, k, a, far){
  bone(c, P, h, k, 12); bone(c, P, k, a, 10);
  shell(c, P, h, k, 30, 22, .1, .84);
  shell(c, P, k, a, 23, 15, .15, .88);
  disc(c, P, k, 18);
  void far;
}
function armPart(c, P, s, j, e, opt){
  opt = opt || {};
  if (opt.seg !== "fore"){ bone(c, P, s, j, 9); shell(c, P, s, j, 20, 16, .16, .86); }
  if (opt.seg !== "upper"){ bone(c, P, j, e, 8); shell(c, P, j, e, 17, 12, .14, .86); }
  disc(c, P, j, 13);
  if (opt.seg !== "fore" && !opt.noShoulder) disc(c, P, s, 22);
  if (opt.watch && opt.seg !== "upper"){ const w = lerp2(j, e, .72); glow(c, P.glow, 8, () => { c.fillStyle = P.glow; c.beginPath(); c.arc(w[0], w[1], 3.2, 0, TAU); c.fill(); }); }
  if (opt.hand === "none" || opt.seg === "upper") return;
  const ang = Math.atan2(e[1] - j[1], e[0] - j[0]);
  hand(c, P, e, opt.handAng !== undefined ? opt.handAng : ang, opt.hand || "relax", opt.flip, opt.far);
}

/* ---------- heads (helmet + mask) ---------- */
function eyes(c, pts, blink, happy){
  glow(c, K.glow, 12, () => { c.fillStyle = K.glow; c.strokeStyle = K.glow; c.lineCap = "round";
    for (const [ex, ey, w] of pts){
      if (happy){ c.lineWidth = 3.4; c.beginPath(); c.moveTo(ex - w, ey + 2); c.quadraticCurveTo(ex, ey - 6, ex + w, ey + 2); c.stroke(); }
      else { c.beginPath(); c.ellipse(ex, ey, w, blink ? .9 : 3.6, 0, 0, TAU); c.fill(); } } });
}
function headFront(c, hp, ang, o){
  o = o || {}; c.save(); c.translate(hp[0], hp[1]); c.rotate(ang); c.scale(1.1, 1.1);
  bone(c, K, [0, 10], [0, -16], 13);
  for (const sd of [-1, 1]) disc(c, K, [sd*44, -68], 13, {k:4});
  part(c, (x, dx, dy) => sm(x, [[-42, -100], [-44, -70], [-38, -40], [-24, -14], [0, -6], [24, -14], [38, -40], [44, -70], [42, -100], [28, -126], [0, -134], [-28, -126]], dx, dy), K.metal,
    x => { line(x, [[0, -134], [0, -104]], 2.4, K.metalD); line(x, [[-34, -108], [-18, -122]], 2, K.metalL); }, {k:12});
  part(c, (x, dx, dy) => sm(x, [[-31, -94], [31, -94], [33, -62], [22, -32], [0, -22], [-22, -32], [-33, -62]], dx, dy), K.face,
    x => { x.fillStyle = K.visor; x.beginPath(); x.roundRect ? x.roundRect(-28, -82, 56, 18, 9) : x.rect(-28, -82, 56, 18); x.fill();
      x.strokeStyle = K.metalD; x.lineWidth = 2; for (const yy of [-42, -37]){ x.beginPath(); x.moveTo(-10, yy); x.lineTo(10, yy); x.stroke(); }
      line(x, [[0, -58], [0, -50]], 2, K.metalD); }, {k:8, lw:2.6});
  eyes(c, [[-13, -73, 7.5], [13, -73, 7.5]], o.blink, o.smile);
  c.restore();
}
function headSide(c, hp, ang, o){
  o = o || {}; c.save(); c.translate(hp[0], hp[1]); c.rotate(ang); c.scale(1.1, 1.1);
  bone(c, K, [-2, 10], [-2, -16], 13);
  part(c, (x, dx, dy) => sm(x, [[-40, -30], [-48, -70], [-40, -110], [-14, -132], [16, -128], [38, -108], [46, -84], [48, -62], [42, -36], [26, -16], [4, -10], [-20, -16]], dx, dy), K.metal,
    x => { line(x, [[-14, -132], [-38, -104]], 2.2, K.metalD); line(x, [[-30, -48], [-12, -28]], 2, K.metalD); }, {k:12});
  part(c, (x, dx, dy) => sm(x, [[12, -102], [40, -100], [49, -72], [45, -42], [30, -22], [16, -28], [22, -66]], dx, dy), K.face,
    x => { x.fillStyle = K.visor; x.beginPath(); x.roundRect ? x.roundRect(24, -82, 26, 18, 8) : x.rect(24, -82, 26, 18); x.fill(); }, {k:8, lw:2.6});
  disc(c, K, [-6, -66], 15, {k:4});
  eyes(c, [[41, -73, 6]], o.blink, o.smile);
  c.restore();
}
function headBack(c, hp, ang, o){
  o = o || {}; const y = Math.max(0, Math.min(1, o.yaw === undefined ? .3 : o.yaw));
  c.save(); c.translate(hp[0], hp[1]); c.rotate(ang); c.scale(1.1, 1.1);
  bone(c, K, [0, 10], [0, -16], 13);
  if (y > .15){ part(c, (x, dx, dy) => sm(x, [[28, -96], [46 + 10*y, -92], [52 + 12*y, -66], [44 + 10*y, -36], [28, -30]], dx, dy), K.face, null, {k:6, lw:2.4});
    eyes(c, [[48 + 12*y, -73, 2 + 3*y]], o.blink); }
  for (const ex of [-50 + 3*y, 50 + 2*y]) part(c, (x, dx, dy) => { x.ellipse(ex + dx, -68 + dy, 7, 13, 0, 0, TAU); x.closePath(); }, K.joint, null, {k:3, lw:2.4});
  part(c, (x, dx, dy) => sm(x, [[-42, -30], [-48, -70], [-42, -108], [-22, -130], [0, -134], [22, -130], [42, -108], [46 + 4*y, -70], [40 + 4*y, -34], [22, -14], [0, -8], [-22, -14]], dx, dy), K.metal,
    x => { line(x, [[0, -134], [0, -20]], 2.4, K.metalD); for (const yy of [-44, -36, -28]) line(x, [[-16, yy], [16, yy]], 2.2, K.metalD); line(x, [[-34, -110], [-16, -124]], 2, K.metalL); }, {k:12});
  c.restore();
}

/* ---------- torsos (origin = hip centre) ---------- */
function emblem(c, x0, y0, s){ glow(c, K.glow, 10, () => { c.fillStyle = K.glow; c.font = `700 ${s}px 'IBM Plex Mono', Consolas, monospace`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("</>", x0, y0); }); }
function neck(c, base, top){ bone(c, K, base, top, 14); }
function torsoSide(c, P, hip, ta, o){
  const br = o.breath || 0;
  c.save(); c.translate(hip[0], hip[1]); c.rotate(ta);
  neck(c, [2, -236], [2, -292]);
  part(c, (x, dx, dy) => cap(x, [0, -60], [0, -152], 26, 24, dx, dy), P.joint, x => { for (let yy = -146; yy < -60; yy += 11) line(x, [[-30, yy], [30, yy]], 2, P.jointL); }, {k:6});
  part(c, (x, dx, dy) => sm(x, [[-50, -52], [44, -54], [58, -10], [36, 34], [-36, 34], [-56, -6]], dx, dy), P.metal, x => line(x, [[-40, -10], [44, -12]], 2, P.metalD), {k:12});
  part(c, (x, dx, dy) => sm(x, [[-40, -254], [10, -266], [46, -250], [66 + br, -206], [64 + br, -162], [40, -134], [-24, -134], [-52, -166], [-54, -222]], dx, dy), P.metal,
    x => { line(x, [[-40, -200], [44, -196]], 2, P.metalD); line(x, [[10, -262], [20, -150]], 2, P.metalD); for (const yy of [-180, -170, -160]) line(x, [[-38, yy], [-14, yy]], 2.2, P.metalD); }, {k:14});
  c.restore();
}
function torsoFront(c, hip, roll, o){
  const br = o.breath || 0;
  c.save(); c.translate(hip[0], hip[1]); c.rotate(roll);
  neck(c, [0, -240], [0, -294]);
  part(c, (x, dx, dy) => cap(x, [0, -62], [0, -150], 40, 36, dx, dy), K.joint, x => { for (let yy = -146; yy < -60; yy += 11) line(x, [[-44, yy], [44, yy]], 2, K.jointL); line(x, [[0, -150], [0, -60]], 3, K.jointL); }, {k:6});
  part(c, (x, dx, dy) => sm(x, [[-70, -40], [70, -40], [80, -6], [52, 30], [0, 46], [-52, 30], [-80, -6]], dx, dy), K.metal, x => { line(x, [[0, -40], [0, 44]], 2, K.metalD); line(x, [[-62, -14], [62, -14]], 2, K.metalD); }, {k:12});
  const C = [[-30, -264], [30, -264], [84, -246], [100 + br*.5, -214], [96 + br*.5, -176], [70, -150], [30, -140], [0, -146], [-30, -140], [-70, -150], [-96 - br*.5, -176], [-100 - br*.5, -214], [-84, -246]];
  part(c, (x, dx, dy) => sm(x, C, dx, dy), K.metal, x => {
    line(x, [[0, -262], [0, -146]], 2.4, K.metalD);
    for (const sd of [-1, 1]){ curve(x, [sd*10, -186], [sd*56, -176], [sd*88, -200], 2.2, K.metalD); line(x, [[sd*20, -250], [sd*78, -236]], 2, K.metalL); }
    for (const yy of [-160, -152]) line(x, [[-22, yy], [22, yy]], 2.2, K.metalD);
  }, {k:14});
  emblem(c, -46, -214, 20);
  c.restore();
}
function torsoBack(c, hip, o){
  const br = o.breath || 0;
  c.save(); c.translate(hip[0], hip[1]); c.rotate(o.roll || 0);
  neck(c, [0, -240], [o.hx || 0, -294]);
  part(c, (x, dx, dy) => cap(x, [0, -62], [0, -150], 40, 36, dx, dy), K.joint, x => { for (let yy = -146; yy < -60; yy += 11) line(x, [[-44, yy], [44, yy]], 2, K.jointL); }, {k:6});
  part(c, (x, dx, dy) => sm(x, [[-70, -40], [70, -40], [80, -6], [52, 30], [0, 42], [-52, 30], [-80, -6]], dx, dy), K.metal, x => line(x, [[-60, -12], [60, -12]], 2, K.metalD), {k:12});
  part(c, (x, dx, dy) => sm(x, [[-30, -264], [30, -264], [84, -246], [100 + br*.5, -214], [96, -176], [66, -146], [0, -138], [-66, -146], [-96, -176], [-100 - br*.5, -214], [-84, -246]], dx, dy), K.metal, x => {
    x.fillStyle = K.metalD; x.beginPath(); x.roundRect ? x.roundRect(-12, -262, 24, 120, 8) : x.rect(-12, -262, 24, 120); x.fill();
    for (let yy = -250; yy < -146; yy += 16) line(x, [[-12, yy], [12, yy]], 2, K.joint);
    for (const sd of [-1, 1]) curve(x, [sd*24, -236], [sd*70, -228], [sd*80, -180], 2.2, K.metalD);
    x.fillStyle = K.joint; x.beginPath(); x.arc(0, -204, 26, 0, TAU); x.fill(); x.fillStyle = K.metalD; x.beginPath(); x.arc(0, -204, 19, 0, TAU); x.fill();
  }, {k:14});
  emblem(c, 0, -204, 18);
  c.restore();
}
function collarBack(){}

/* ---------- profile figure ---------- */
function sideLeg(c, P, lg, far){ bootSide(c, P, lg.a, lg.th); legPart(c, P, lg.h, lg.k, [lg.a[0], lg.a[1] - 8], far); }
function figureSide(c, p){
  if (p.cloud) cloud(c, p.cloud, p.t);
  if (p.farArm) armPart(c, KF, p.farArm.s, p.farArm.j, p.farArm.e, {hand:p.farArm.hand, watch:true, far:true, flip:p.farArm.flip});
  sideLeg(c, KF, p.farLeg, true);
  sideLeg(c, K, p.nearLeg);
  torsoSide(c, K, p.hip, p.ta, p);
  armPart(c, K, p.nearArm.s, p.nearArm.j, p.nearArm.e, {hand:p.nearArm.hand, flip:p.nearArm.flip});
  headSide(c, headOf(p.hip, p.ta), p.ha, p);
}
const shoulderFK = (sh, a1, flex) => { const j = [sh[0] + L.upper*Math.sin(a1), sh[1] + L.upper*Math.cos(a1)], a2 = a1 + flex; return {s:sh, j, e:[j[0] + L.fore*Math.sin(a2), j[1] + L.fore*Math.cos(a2)]}; };
const legFK = (hip, a1, flex) => { const k = [hip[0] + L.thigh*Math.sin(a1), hip[1] + L.thigh*Math.cos(a1)], a2 = a1 - flex; return {k, a:[k[0] + L.shin*Math.sin(a2), k[1] + L.shin*Math.cos(a2)], a2}; };
const armIKp = (sh, target, dir) => { const r = ik(sh, target, L.upper, L.fore, dir); return {s:sh, j:r.j, e:r.e}; };
function cloud(c, cl, t){
  const puffs = [];
  for (let i = 0; i < 9; i++){ const u = i/8, wob = Math.sin(t*2.2 + i*1.7);
    puffs.push([cl[0] - u*200 + wob*6, cl[1] + Math.sin(i*2.3)*24*u + wob*4, 30 + 30*u + Math.sin(t*3 + i)*3]); }
  part(c, (x, dx, dy) => { for (const [px, py, r] of puffs) circ(x, px, py, r, dx, dy); }, K.cloud, null, {k:16, olc:"#8a82b8", lw:2.4});
}
function poseRide(t, o){
  o = o || {}; const hip = [250, 540 + (o.bump || 0)], ta = 9*rad + (o.lean || 0), sp = Math.min(1, Math.abs(o.speed || 0));
  const peg = [460, 780], grip = [468, 394];
  const lg = (f, th) => { const r = ik(hip, f, L.thigh, L.shin, -1); return {h:hip, k:r.j, a:r.e, th}; };
  const sh = shoulderOf(hip, ta);
  return {t, hip, ta, nearLeg:lg(peg, 8), farLeg:lg([peg[0] - 20, peg[1] + 8], 10), nearArm:{...armIKp(sh, grip, 1), hand:"fist"}, farArm:{...armIKp(sh, [grip[0] + 4, grip[1] + 2], 1), hand:"fist"},
    ha:(-6 + hold(t, 41, 4.2, {lo:-5, hi:4}, .8) + 1.2*fbm(t*.4, 42))*rad, blink:blinkAt(t, 6), glint:.5, flap:sp*(8 + 5*Math.sin(t*22)) + 1.2*fbm(t*.8, 43), breath:Math.sin(t*TAU/4)*1.2};
}
function poseFly(t){
  const bob = Math.sin(t*1.25), sway = fbm(t*.35, 51);
  const hip = [700, 390 + bob*6 + sway*4], ta = (74 + 2.2*Math.sin(t*1.25 - .6) + 1.5*sway)*rad, sh = shoulderOf(hip, ta);
  const far = shoulderFK(sh, (116 + 3*fbm(t*.5, 52) + 2*Math.sin(t*1.25 - 1))*rad, (5 + 3*fbm(t*.6, 53))*rad);
  const near = shoulderFK(sh, (-70 + 4*Math.sin(t*1.25 - 1.4))*rad, (12 + 5*Math.sin(t*1.25 - 1.9))*rad);   // trailing arm lags the body
  const kick = Math.sin(t*1.9 - 1.2);
  const fl = legFK(hip, (-80 + 2*Math.sin(t*1.25 - 1.6))*rad, (6 + 4*Math.max(0, -kick))*rad), nl = legFK(hip, (-72 + 3*kick)*rad, (30 + 10*kick)*rad);
  const toeTh = a2 => (Math.PI/2 - a2)/rad - 90 + 68;
  return {t, hip, ta, cloud:[fl.a[0] - 20, fl.a[1] + 16], farArm:{...far, hand:"fist"}, nearArm:{...near, hand:"flat"},
    farLeg:{h:hip, k:fl.k, a:fl.a, th:toeTh(fl.a2)}, nearLeg:{h:hip, k:nl.k, a:nl.a, th:toeTh(nl.a2)},
    ha:(12 + hold(t, 55, 4, {lo:-5, hi:7}, 1))*rad, blink:blinkAt(t, 5), glint:.5 + .5*Math.sin(t), flap:10 + 5*Math.sin(t*7.3) + 3*noise(t*3, 56)};
}

/* ---------- front view (3D skeleton projected with the scene camera) ---------- */
let PJ = {cx:380, gy:960, D:5.4*PPM, H:1.45*PPM};
function proj(p){ const s = PJ.D/(PJ.D - p[2]); return [PJ.cx + p[0]*s, PJ.gy - PJ.H + (PJ.H - p[1])*s, s]; }
function bootFront(c, P, A, T, lifted, th){
  // 3D boot: heel under the ankle, toe 92px ahead along the foot pitch; project its outline
  const x0 = A[0], sole = A[1] - 40, pitch = (th || 0)*rad, cs = Math.cos(pitch), sn = Math.sin(pitch);
  const at = (u, up, side) => { const z = A[2] + u*cs + up*sn, y = sole - u*sn + up*cs; return proj([x0 + side, Math.max(0, y), z]); };
  const top = proj([x0, A[1] + 34, A[2]]), ank = proj([x0, A[1], A[2]]), s0 = ank[2], w = 28*s0;
  const tb = at(98, 0, 0), tt = at(92, 26, 0), tl = at(84, 6, -30), tr = at(84, 6, 30), hb = at(-26, 0, 0);
  const bottom = Math.max(tb[1], hb[1]), wt = 31*tb[2];
  const pts = [[top[0] - w*.92, top[1]], [top[0] + w*.92, top[1]], [ank[0] + w, ank[1]], [tr[0] + wt*.1, Math.min(tr[1], bottom - 14*tb[2])], [tb[0] + wt*.75, bottom - 5*tb[2]], [tb[0], bottom], [tb[0] - wt*.75, bottom - 5*tb[2]], [tl[0] - wt*.1, Math.min(tl[1], bottom - 14*tb[2])], [ank[0] - w, ank[1]]];
  part(c, (x, dx, dy) => sm(x, pts, dx, dy), P.metal, x => {
    x.fillStyle = lifted ? P.joint : P.metalD; x.fillRect(tb[0] - wt - 4, bottom - (lifted ? Math.max(10, bottom - tt[1])*.55 : 7*tb[2]), wt*2 + 8, 40);
    x.strokeStyle = P.metalD; x.lineWidth = 2.2; x.beginPath(); x.moveTo(tt[0] - wt*.5, tt[1] + 4); x.quadraticCurveTo(tt[0], tt[1] - 2, tt[0] + wt*.5, tt[1] + 4); x.stroke(); }, {k:9});
}
function legFront(c, P, L3){
  const H = proj(L3.h), Kp = proj(L3.k), A = proj([L3.a[0], L3.a[1] + 10, L3.a[2]]);
  bootFront(c, P, L3.a, L3.toe, L3.lifted, L3.th);
  c.save(); const s = (H[2] + A[2])/2; c.translate(Kp[0], Kp[1]); c.scale(s, s); c.translate(-Kp[0], -Kp[1]);
  legPart(c, P, H, Kp, A); c.restore();
}
function armFront(c, P, a3, sd, hk){
  const S = proj(a3.s), J = proj(a3.j), E = proj(a3.e), s = (S[2] + E[2])/2;
  c.save(); c.translate(E[0], E[1]); c.scale(s, s); c.translate(-E[0], -E[1]);
  armPart(c, P, S, J, E, {hand:hk || "relax", watch:sd > 0, flip:sd < 0});
  c.restore();
}
function footWalk(p){
  const st = .6; let x, lift, th;
  if (p < st){ const u = p/st; x = STRIDE - 2*STRIDE*u; th = u < .16 ? -10*(1 - u/.16) : (u < .55 ? 0 : (u - .55)/.45*32); lift = th < 0 ? 4*(-th/10) : Math.sin(th*rad)*70; }
  else { const u = (p - st)/(1 - st), e = sstep(u), e2 = sstep(Math.min(1, u*1.35)); x = -STRIDE + 2*STRIDE*e; th = 32*(1 - e2) - 10*e2; lift = 37*(1 - e) + 4*e + 54*Math.sin(Math.PI*u); }
  return {x, lift, th};
}
function legSolve(H, sd, lift, fz, th){
  const F = [sd*40, 40 + lift, fz];
  const r = ik([H[2], -H[1]], [F[2], -F[1]], L.thigh, L.shin, -1), A = [sd*40, -r.e[1], r.e[0]], K3 = [(H[0] + A[0])/2 - sd*1.5, -r.j[1], r.j[0]];
  return {h:H, k:K3, a:A, th, toe:[A[0], A[1] - 30 + 92*Math.sin(th*rad), A[2] + 92*Math.cos(th*rad)], lifted:th > 12, z:(K3[2] + A[2])/2};
}

function poseWalkFront(t){
  const p = (t/WALK_T)%1, c1 = Math.cos(TAU*p), cs = Math.cos(TAU*(p - .3));
  const hipUp = 40 + 384 + 15*Math.cos(4*Math.PI*(p - .32)) + 2*fbm(t*.7, 4);
  const hx = -10*cs + 2*fbm(t*.3, 5);            // weight travels over the stance foot
  const tilt = 6*cs, pz = 9*c1;                  // pelvis drops on the swing side and yaws with the stride
  const legOf = (pp, sd) => { const f = footWalk(pp%1); return legSolve([hx + sd*40, hipUp - sd*tilt, -sd*pz], sd, f.lift, f.x, f.th); };
  const roll = -(tilt*.5)/90 + .006*fbm(t*.5, 6), lean = (5 + 1.2*Math.cos(4*Math.PI*(p - .1)))*rad;
  const shUp = hipUp + 246*Math.cos(lean), shZ = 246*Math.sin(lean), Aw = 27*rad;
  const armOf = (pp, sd) => { const a1 = -Aw*Math.cos(TAU*(pp - .07)), fwd = Math.max(0, a1/Aw), flex = (15 + 30*fwd)*rad;
    const S = [hx + sd*90, shUp - 14 + sd*tilt*.5, shZ + sd*pz*1.1];   // shoulders counter-rotate against the pelvis
    const J3 = [S[0] + sd*5, S[1] - L.upper*Math.cos(a1), S[2] + L.upper*Math.sin(a1)], E3 = [J3[0] - sd*(5 + 10*fwd), J3[1] - L.fore*Math.cos(a1 + flex), J3[2] + L.fore*Math.sin(a1 + flex)];
    return {s:S, j:J3, e:E3, z:E3[2], sd}; };
  return {hip:proj([hx, hipUp, 0]), roll, legs:[legOf(p, -1), legOf(p + .5, 1)], arms:[armOf(p + .5, -1), armOf(p, 1)],
    ha:-roll*.6 + 1.1*rad*Math.sin(4*Math.PI*p + .6) + 2*rad*hold(t, 3, 3.5, {lo:-1, hi:1}, .9), blink:blinkAt(t, 1), glint:.5 + .5*Math.sin(t*.7), breath:1.2*Math.sin(4*Math.PI*p)};
}

function poseCheer(t){
  const T = 1.08, k = Math.floor(t/T), u = t/T - k, amp = .55 + .45*hash(k*2.3 + 1);
  let hipDrop = 0, air = 0;
  if (u < .26){ hipDrop = 30*amp*smoother(u/.26); }                                   // anticipation squat
  else if (u < .72){ const v = (u - .26)/.46; air = 62*amp*Math.sin(Math.PI*v); hipDrop = 30*amp*(1 - smoother(v*3)); }
  else { const v = (u - .72)/.28; hipDrop = 24*amp*Math.sin(Math.PI*Math.min(1, v*1.4))*(1 - v*.5); }  // landing squash
  const tuck = air > 4 ? 12*Math.sin(Math.PI*((u - .26)/.46)) : 0;
  const hipUp = 40 + 404 - hipDrop + air;
  const legs = [-1, 1].map(sd => legSolve([sd*40, hipUp, 0], sd, air + tuck, 6 + hipDrop*.5, air > 4 ? 22 : 0));
  const shUp = hipUp + 246, reach = air > 4 ? 1 : .55 + .45*(1 - hipDrop/30);
  const arms = [-1, 1].map(sd => { const ph = u*TAU + (sd > 0 ? .5 : 0), pump = Math.sin(ph*2);
    const S = [sd*90, shUp - 12, 0], J3 = [sd*(140 + 10*reach), shUp + 40 + 80*reach + 6*pump, 30], E3 = [sd*(150 + 18*reach), shUp + 90 + 150*reach + 10*pump, 18];
    return {s:S, j:J3, e:E3, z:14, sd}; });
  return {hip:proj([0, hipUp, 0]), roll:.015*Math.sin(u*TAU + k), legs, arms, hand:"fist", ha:(air > 4 ? -3 : 1)*rad + .02*Math.sin(u*TAU), smile:true, blink:false, glint:.5 + .5*Math.sin(t*3), breath:0};
}

function figureFront(c, p){
  const legs = p.legs.slice().sort((a, b) => a.z - b.z);
  legFront(c, legs[0].z < -10 ? KF : K, legs[0]); legFront(c, K, legs[1]);
  const h = p.hip;
  torsoFront(c, h, p.roll, p);
  for (const a of p.arms.slice().sort((a, b) => a.z - b.z)) armFront(c, K, a, a.sd, p.hand);
  headFront(c, add(h, rot([0, -284], p.roll)), p.ha + p.roll, p);
}

/* ---------- back view ---------- */
function figureBack(c, p){
  const hip = p.hip;
  if (p.legs) for (const lg of p.legs){ bootBack(c, K, lg.a); legPart(c, K, lg.h, lg.k, [lg.a[0], lg.a[1] - 6]); }
  if (p.seat){ c.save(); c.translate(hip[0], hip[1]); for (const sd of [-1, 1]) part(c, (x, dx, dy) => cap(x, [sd*50, 20], [sd*56, 70], 30, 24, dx, dy), K.metal, null, {k:12}); c.restore(); }
  for (const a of p.behind || []) armPart(c, K, a.s, a.j, a.e, {hand:a.hand, handAng:a.handAng, flip:a.flip, seg:a.seg});
  torsoBack(c, hip, p);
  for (const a of p.arms) armPart(c, K, a.s, a.j, a.e, {hand:a.hand, handAng:a.handAng, flip:a.flip, watch:a.watch, seg:a.seg});
  headBack(c, add(hip, rot([p.hx || 0, -284 + (p.hy || 0)], p.roll || 0)), (p.ha || 0) + (p.roll || 0)*.4, p);
  if (p.chair){ c.save(); c.translate(hip[0], hip[1]);
    part(c, (x, dx, dy) => sm(x, [[-150, -40], [-136, -70], [136, -70], [150, -40], [146, 120], [-146, 120]], dx, dy), K.chair, x => {
      x.fillStyle = K.blue; x.fillRect(-118, -80, 24, 210); x.fillRect(94, -80, 24, 210);
      line(x, [[-140, -14], [140, -14]], 3, K.chairD);
      x.fillStyle = "#44527a"; x.beginPath(); x.arc(0, 28, 30, 0, TAU); x.fill(); x.fillStyle = "#9fb2de"; x.font = "700 26px 'IBM Plex Mono', Consolas, monospace"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("{}", 0, 29);
    }, {k:20}); c.restore(); }
}
function poseStand(t){
  const GY = 960, cx = 380, br = Math.sin(t*TAU/4.4) + .25*noise(t*.6, 2);
  const w = hold(t, 5, 6.5, {lo:-1, hi:1}, 1.6)*.85 + fbm(t*.25, 1)*.15;   // which leg carries the weight
  const hip = [cx + w*8, GY - 40 - 418 + 1.2*br + Math.abs(w)*2], ptilt = w*.035, roll = -w*.022 + .008*fbm(t*.3, 3);
  const legs = [-1, 1].map(sd => { const hy = hip[1] + 4 + sd*Math.sin(ptilt)*40, h = [hip[0] + sd*38, hy], a = [cx + sd*42, GY - 40];
    const slack = Math.max(0, (a[1] - h[1]) < 414 ? (414 - (a[1] - h[1])) : 0), m = lerp2(h, a, .5);
    return {h, k:[m[0] - sd*slack*.35, m[1]], a}; });
  const arms = [-1, 1].map((sd, i) => { const s = add(hip, rot([sd*88, -218 - br*1.4], roll)), sw = 2.2*fbm(t*.45, 7 + i);
    const j = [s[0] + sd*12 + sw*.4, s[1] + 158], e = [j[0] - sd*10 + sw, j[1] + 142];
    return {s, j, e, hand:"relax", flip:sd < 0, watch:sd < 0}; });
  const yaw = hold(t, 11, 4.6, {lo:.05, hi:.72}, .85), nod = hold(t, 13, 5.3, {lo:-4, hi:5}, 1.1);
  return {hip, legs, pelvis:true, ptilt, roll, arms, breath:br*1.3, ha:(2*fbm(t*.2, 9))*rad, hx:2*fbm(t*.3, 8), hy:nod + br*.8, yaw, blink:blinkAt(t, 2)};
}

function poseType(t){
  const br = Math.sin(t*TAU/4.1) + .2*noise(t*.7, 4), lean = hold(t, 33, 8, {lo:0, hi:1}, 2.2);
  const typing = smoother((fbm(t*.35, 31) + .25)*2.2);           // typing comes in bursts with pauses
  const hip = [390, 540 + br*1.1], dy = lean*6;
  const jig = k => (Math.sin(t*(16 + k*3.3))*2.2 + Math.sin(t*(23 + k*2.1))*1.2)*typing + .8*fbm(t*.8, 40 + k);
  const sL = [hip[0] - 90, hip[1] - 224 + dy - br*1.2], sR = [hip[0] + 90, hip[1] - 224 + dy - br*1.2];
  const eL = [hip[0] - 112 - jig(1)*.4, hip[1] - 76], eR = [hip[0] + 114 + jig(2)*.4, hip[1] - 74];
  const wL = [hip[0] - 58 + jig(0), hip[1] - 96 + jig(1)], wR = [hip[0] + 60 + jig(3), hip[1] - 94 + jig(2)];
  const yaw = hold(t, 37, 3.8, [.12, .4, .66], .7);               // glances between the three screens
  return {hip, breath:br*1.4, roll:.01*fbm(t*.3, 39), chair:true, behind:[{s:sL, j:eL, e:wL, hand:"none", seg:"fore"}, {s:sR, j:eR, e:wR, hand:"none", seg:"fore"}], arms:[{s:sL, j:eL, e:wL, seg:"upper"}, {s:sR, j:eR, e:wR, seg:"upper"}],
    ha:(2 + 2*fbm(t*.4, 35))*rad, hx:3 + 2*fbm(t*.3, 36), hy:6 + dy*1.6 + br*1.5 + typing*1.5, yaw, blink:blinkAt(t, 3)};
}

function poseSit(t){
  const br = Math.sin(t*TAU/4.6) + .2*noise(t*.5, 5), w = hold(t, 21, 7.5, {lo:-1, hi:1}, 1.8)*.7;
  const hip = [460 + w*5, 540 + br*1.2], roll = -w*.03 + .008*fbm(t*.3, 22);
  const arms = [-1, 1].map(sd => { const s = add(hip, rot([sd*92, -226 - br*1.4], roll)), hnd = [460 + sd*172, 540 + 36], r = ik(s, hnd, L.upper, L.fore, sd > 0 ? -1 : 1);
    return {s, j:r.j, e:r.e, hand:"flat", handAng:sd > 0 ? .08 : Math.PI - .08, flip:sd > 0, watch:sd < 0}; });
  const yaw = hold(t, 23, 4.8, {lo:0, hi:.78}, 1), nod = hold(t, 25, 6, {lo:-3, hi:6}, 1.3);
  return {hip, seat:true, roll, arms, breath:br*1.4, ha:2*rad*fbm(t*.25, 26), hx:2*fbm(t*.3, 27), hy:1 + nod + br, yaw, blink:blinkAt(t, 4)};
}

function draw(c, mode, t, o){
  const I = INFO[mode]; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, I.W, I.H); c.lineJoin = "round"; c.lineCap = "round";
  if (mode === "walkf"){ PJ = {cx:380, gy:960, D:5.4*PPM, H:1.45*PPM}; begin(c, LIGHTS.front); figureFront(c, poseWalkFront(t)); }
  else if (mode === "cheer"){ PJ = {cx:410, gy:1220, D:1e9, H:0}; begin(c, LIGHTS.front); figureFront(c, poseCheer(t)); }
  else if (mode === "stand" || mode === "type" || mode === "sit"){ begin(c, LIGHTS.back); figureBack(c, mode === "stand" ? poseStand(t) : mode === "type" ? poseType(t) : poseSit(t)); }
  else { begin(c, LIGHTS.side); figureSide(c, mode === "ride" ? poseRide(t, o) : poseFly(t)); }
  end(c); return true;
}
return {draw, INFO, PPM, WALK_V, WALK_T, STRIDE, motion:{noise, fbm, hold, blinkAt, footWalk, smoother}};
})();
