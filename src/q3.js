/* ================= ILLUSTRATED CHARACTER (original, drawn on canvas) ================= */
const CH = (() => {
  const SIZE = 800, HIP = {x:400, y:440}, K = .95;
  const C = {
    ol:"#1a1230", skin:"#f2c39e", skinSh:"#d4977a", hair:"#24192f", hairHi:"#4a3a66",
    jk:"#8f929d", jkSh:"#686b77", jkHi:"#b7bac5", tee:"#25242c", teeSh:"#18171e",
    pt:"#22222a", ptSh:"#16161c", shoe:"#1d1d24", shoeSh:"#131318", sole:"#4a4a58", blush:"rgba(230,120,110,.12)"
  };
  const OLW = 3.6;
  const cv = document.createElement("canvas"); cv.width = cv.height = SIZE;
  const g = cv.getContext("2d");
  const dir = a => ({x:Math.sin(a), y:Math.cos(a)});
  const add = (p, v, s) => ({x:p.x + v.x*s, y:p.y + v.y*s});

  function poly(pts){ g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y); }
  function limb(pts, w, fill, shade){
    g.lineCap = "round"; g.lineJoin = "round";
    poly(pts); g.strokeStyle = C.ol; g.lineWidth = w + OLW*2; g.stroke();
    poly(pts); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
    if (!shade) return;
    g.lineCap = "butt"; g.strokeStyle = shade; g.lineWidth = w*.34;
    for (let i = 0; i < pts.length - 1; i++){
      const a = pts[i], b = pts[i+1], dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
      let nx = dy/L, ny = -dx/L; if (Math.abs(nx) < .25 ? ny < 0 : nx < 0){ nx = -nx; ny = -ny; }
      const o = w*.3, ux = dx/L, uy = dy/L, cut = i === 0 ? w*.25 : 0, cutE = i === pts.length - 2 ? w*.3 : -w*.1;
      g.beginPath(); g.moveTo(a.x + nx*o + ux*cut, a.y + ny*o + uy*cut); g.lineTo(b.x + nx*o - ux*cutE, b.y + ny*o - uy*cutE); g.stroke();
    }
  }
  function blob(fn, fill, stroke){ g.beginPath(); fn(); if (fill){ g.fillStyle = fill; g.fill(); } if (stroke !== false){ g.strokeStyle = C.ol; g.lineWidth = OLW; g.lineJoin = "round"; g.stroke(); } }
  function ell(x, y, rx, ry, fill, stroke, rot){ blob(() => g.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI*2), fill, stroke); }

  /* ---- limbs ---- */
  function arm(sh, a, far){
    const e = add(sh, dir(a.a1), 148*(a.s1 ?? 1)), w = add(e, dir(a.a2), 132*(a.s2 ?? 1));
    limb([sh, e, w], 38, far ? C.jkSh : C.jk, far ? null : C.jkSh);
    const cuff = add(w, dir(a.a2), 2);
    g.lineCap = "round"; g.strokeStyle = C.ol; g.lineWidth = 40 + OLW; g.beginPath(); g.moveTo(cuff.x, cuff.y); g.lineTo(cuff.x + .01, cuff.y); g.stroke();
    g.strokeStyle = far ? "#50535e" : C.jkSh; g.lineWidth = 36; g.stroke();
    const h = add(w, dir(a.a2), 20*(a.s2 ?? 1) + 4);
    ell(h.x, h.y, 17, 18, far ? C.skinSh : C.skin);
    if (!far){ g.fillStyle = C.skinSh; g.beginPath(); g.ellipse(h.x + 5, h.y + 4, 8, 9, 0, 0, 7); g.fill(); }
  }
  function leg(hp, l, far, view, side){
    const k = add(hp, dir(l.a1), 166*(l.s1 ?? 1)), an = add(k, dir(l.a2), 170*(l.s2 ?? 1));
    limb([hp, k, an], 46, far ? C.ptSh : C.pt, far ? null : C.ptSh);
    if (l.noFoot) return;
    if (view === "side"){
      const fa = l.a2 - Math.PI/2*0 , f = dir(fa + Math.PI/2);  // foot points forward (perpendicular to shin)
      const toe = add(an, {x:-f.x, y:-f.y}, -56), up = dir(fa);
      g.save(); g.translate(an.x, an.y); g.rotate(-l.a2);
      blob(() => { g.moveTo(-18, -4); g.lineTo(24, -6); g.quadraticCurveTo(60, -2, 62, 18); g.lineTo(-20, 22); g.closePath(); }, far ? C.shoeSh : C.shoe);
      g.fillStyle = C.sole; g.fillRect(-19, 14, 80, 6);
      g.restore(); void toe; void up;
    } else {
      const bx = an.x + side*5, by = an.y + 10;
      ell(bx, by, 27, 16, view === "back" ? C.shoeSh : C.shoe);
      g.fillStyle = C.sole; g.beginPath(); g.ellipse(bx, by + 9, 24, 6, 0, 0, Math.PI); g.fill();
    }
  }

  /* ---- two-bone IK (used by the walk cycle) ---- */
  function ik(a, b, L1, L2, bend){
    let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1; const mx = L1 + L2 - .5;
    const e2 = d > mx ? {x:a.x + dx/d*mx, y:a.y + dy/d*mx} : {x:b.x, y:b.y}; if (d > mx) d = mx;
    const th = Math.atan2(e2.y - a.y, e2.x - a.x), c = (L1*L1 + d*d - L2*L2)/(2*L1*d), al = Math.acos(Math.max(-1, Math.min(1, c)));
    return [{x:a.x + L1*Math.cos(th + bend*al), y:a.y + L1*Math.sin(th + bend*al)}, e2];
  }
  function armIK(sh, hand, L2s, hs, bend){
    const [e, w] = ik(sh, hand, 148, 132*L2s, bend);
    limb([sh, e, w], 38, C.jk, C.jkSh);
    g.lineCap = "round"; g.strokeStyle = C.ol; g.lineWidth = 40 + OLW; g.beginPath(); g.moveTo(w.x, w.y); g.lineTo(w.x + .01, w.y); g.stroke();
    g.strokeStyle = C.jkSh; g.lineWidth = 36; g.stroke();
    const dx = w.x - e.x, dy = w.y - e.y, L = Math.hypot(dx, dy) || 1, hx = w.x + dx/L*22*hs, hy = w.y + dy/L*22*hs;
    ell(hx, hy, 17*hs, 18*hs, C.skin); g.fillStyle = C.skinSh; g.beginPath(); g.ellipse(hx + 5*hs, hy + 4*hs, 8*hs, 9*hs, 0, 0, 7); g.fill();
  }
  function legIK(hp, ank, fs, bend, view, side, L1s){
    // front view: the knee bends toward the camera, so it reads as a shorter leg, not a sideways kink
    let dx = ank.x - hp.x, dy = ank.y - hp.y, d = Math.hypot(dx, dy); const mx = 166*(L1s || 1) + 170;
    const an = d > mx ? {x:hp.x + dx/d*mx, y:hp.y + dy/d*mx} : ank; void bend;
    const k = {x:hp.x + (an.x - hp.x)*.5 - side*2.5, y:hp.y + (an.y - hp.y)*.49};
    limb([hp, k, an], 46, C.pt, C.ptSh);
    const bx = an.x + side*5*fs, by = an.y + 10*fs;
    ell(bx, by, 27*fs, 16*fs, view === "back" ? C.shoeSh : C.shoe);
    g.fillStyle = C.sole; g.beginPath(); g.ellipse(bx, by + 9*fs, 24*fs, 6*fs, 0, 0, Math.PI); g.fill();
  }

  /* ---- torso ---- */
  function torsoPath(){
    g.moveTo(-26, -214);
    g.quadraticCurveTo(-62, -214, -78, -194);
    g.quadraticCurveTo(-84, -150, -70, -110);
    g.quadraticCurveTo(-62, -40, -64, 22);
    g.quadraticCurveTo(0, 34, 64, 22);
    g.quadraticCurveTo(62, -40, 70, -110);
    g.quadraticCurveTo(84, -150, 78, -194);
    g.quadraticCurveTo(62, -214, 26, -214);
    g.quadraticCurveTo(0, -200, -26, -214);
    g.closePath();
  }
  function torsoFront(){
    ell(0, -212, 60, 24, C.jkSh);                          // hood rim behind neck
    blob(torsoPath, C.jk, false);
    g.save(); g.beginPath(); torsoPath(); g.clip();
    g.fillStyle = C.tee; g.beginPath(); g.moveTo(-24, -216); g.lineTo(24, -216); g.lineTo(30, 40); g.lineTo(-30, 40); g.fill();
    g.fillStyle = C.teeSh; g.fillRect(10, -216, 20, 260);
    g.fillStyle = C.jkSh; g.beginPath(); g.moveTo(52, -200); g.quadraticCurveTo(40, -90, 50, 40); g.lineTo(90, 40); g.lineTo(90, -200); g.fill();
    g.fillStyle = C.jkHi; g.beginPath(); g.moveTo(-70, -186); g.quadraticCurveTo(-60, -150, -62, -120); g.lineTo(-54, -122); g.quadraticCurveTo(-54, -160, -62, -190); g.fill();
    g.fillStyle = C.jkSh; g.fillRect(-90, 6, 180, 30);
    g.restore();
    g.strokeStyle = C.ol; g.lineWidth = 3;
    g.beginPath(); g.moveTo(-24, -214); g.lineTo(-30, 24); g.moveTo(24, -214); g.lineTo(30, 24); g.stroke();
    g.beginPath(); g.moveTo(-56, -40); g.quadraticCurveTo(-44, -30, -36, -44); g.moveTo(56, -40); g.quadraticCurveTo(44, -30, 36, -44); g.stroke();
    blob(torsoPath, null);
      }
  function torsoBack(){
    blob(torsoPath, C.jk, false);
    g.save(); g.beginPath(); torsoPath(); g.clip();
    g.fillStyle = C.jkSh; g.beginPath(); g.moveTo(44, -210); g.quadraticCurveTo(34, -90, 46, 40); g.lineTo(90, 40); g.lineTo(90, -210); g.fill();
    g.fillStyle = C.jkHi; g.beginPath(); g.moveTo(-72, -184); g.quadraticCurveTo(-62, -150, -64, -118); g.lineTo(-56, -120); g.quadraticCurveTo(-56, -160, -64, -188); g.fill();
    g.fillStyle = C.jkSh; g.fillRect(-90, 6, 180, 30);
    g.restore();
    blob(torsoPath, null);
    g.strokeStyle = C.ol; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -150); g.lineTo(0, 20); g.stroke();
    blob(() => { g.moveTo(-50, -216); g.quadraticCurveTo(-54, -160, 0, -132); g.quadraticCurveTo(54, -160, 50, -216); g.quadraticCurveTo(0, -196, -50, -216); }, C.jkSh);   // hood
    g.strokeStyle = "#50535e"; g.lineWidth = 3; g.beginPath(); g.moveTo(-34, -200); g.quadraticCurveTo(0, -150, 34, -200); g.stroke();
  }
  function torsoSide(){
    const p = () => { g.moveTo(-40, -206); g.quadraticCurveTo(10, -222, 34, -204); g.quadraticCurveTo(52, -160, 44, -110); g.quadraticCurveTo(40, -40, 44, 22); g.quadraticCurveTo(0, 32, -42, 22); g.quadraticCurveTo(-46, -60, -48, -110); g.quadraticCurveTo(-54, -176, -40, -206); g.closePath(); };
    ell(-34, -204, 30, 22, C.jkSh);
    blob(p, C.jk, false);
    g.save(); g.beginPath(); p(); g.clip();
    g.fillStyle = C.jkSh; g.beginPath(); g.moveTo(-60, -210); g.quadraticCurveTo(-30, -100, -60, 40); g.lineTo(-80, 40); g.lineTo(-80, -210); g.fill();
    g.fillStyle = C.tee; g.beginPath(); g.moveTo(26, -210); g.quadraticCurveTo(46, -150, 38, -60); g.lineTo(60, -60); g.lineTo(60, -210); g.fill();
    g.fillStyle = C.jkSh; g.fillRect(-80, 6, 160, 30);
    g.restore(); blob(p, null);
  }

  /* ---- heads ---- */
  function spikes(cx, cy, r1, r2, a0, a1, n){
    const pts = [];
    for (let i = 0; i <= n*2; i++){ const a = a0 + (a1 - a0)*i/(n*2), r = i % 2 ? r1 : r2; pts.push({x:cx + Math.cos(a)*r, y:cy + Math.sin(a)*r}); }
    return pts;
  }
  function smoothPoly(pts, close, cont){
    if (cont) g.lineTo(pts[0].x, pts[0].y); else g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i += 2) g.quadraticCurveTo(pts[i].x, pts[i].y, pts[i+1].x, pts[i+1].y);
    if (close) g.closePath();
  }
  function neck(){ blob(() => { g.moveTo(-17, -238); g.lineTo(-18, -204); g.quadraticCurveTo(0, -196, 18, -204); g.lineTo(17, -238); }, C.skin); g.fillStyle = C.skinSh; g.fillRect(-15, -234, 30, 12); }
  /* fade haircut: short textured top, sides faded to skin */
  const HR = "36,25,47";
  function fade(x0, x1, yTop, yBot, a){
    const gr = g.createLinearGradient(0, yTop, 0, yBot);
    gr.addColorStop(0, `rgba(${HR},${a})`); gr.addColorStop(.55, `rgba(${HR},${a*.45})`); gr.addColorStop(1, `rgba(${HR},0)`);
    g.fillStyle = gr; g.fillRect(x0, yTop, x1 - x0, yBot - yTop);
  }
  function stubble(x0, x1, y0, y1, n){ g.fillStyle = `rgba(${HR},.22)`; for (let i = 0; i < n; i++){ const x = x0 + ((i*37) % 100)/100*(x1 - x0), y = y0 + ((i*53) % 100)/100*(y1 - y0); g.fillRect(x, y, 1.6, 1.6); } }
  function texture(pts){ g.strokeStyle = C.hairHi; g.lineWidth = 3; g.lineCap = "round"; g.beginPath(); pts.forEach(([x, y, dx, dy]) => { g.moveTo(x, y); g.quadraticCurveTo(x + dx*.6, y + dy - 3, x + dx, y + dy); }); g.stroke(); }
  function eye(x, y, rx, ry, blink){
    const k = 1 - blink;
    if (k < .2){ g.strokeStyle = C.ol; g.lineWidth = 3.4; g.lineCap = "round"; g.beginPath(); g.moveTo(x - rx - 1, y + 2); g.quadraticCurveTo(x, y + 5, x + rx + 1, y + 2); g.stroke(); return; }
    rx *= .82; ry *= .66;
    g.fillStyle = "#fbf6f0"; g.beginPath(); g.ellipse(x, y, rx*1.7, ry*k*.95, 0, 0, 7); g.fill();
    g.fillStyle = "#2a1d18"; g.beginPath(); g.ellipse(x + 1, y + ry*(1 - k)*.4, rx, ry*k, 0, 0, 7); g.fill();
    g.fillStyle = "#fff"; g.beginPath(); g.arc(x + 2.5, y - ry*.35*k, 1.8*k, 0, 7); g.fill();
    g.strokeStyle = C.ol; g.lineWidth = 3.2; g.lineCap = "round"; g.beginPath(); g.moveTo(x - rx*1.9, y - ry*.3); g.quadraticCurveTo(x, y - ry*1.25*k - 1, x + rx*1.9, y - ry*.5); g.stroke();
  }
  function headFront(face, h){
    g.save(); g.translate(h.dx || 0, h.dy || 0); g.translate(0, -228); g.rotate(h.rot || 0); g.translate(0, 228);
    neck();
    ell(-50, -276, 11, 16, C.skin); ell(50, -276, 11, 16, C.skin);
    const jaw = () => { g.moveTo(-50, -292); g.bezierCurveTo(-52, -252, -30, -228, 0, -224); g.bezierCurveTo(30, -228, 52, -252, 50, -292); g.bezierCurveTo(52, -344, -52, -344, -50, -292); g.closePath(); };
    blob(jaw, C.skin, false);
    g.save(); g.beginPath(); jaw(); g.clip();
    g.fillStyle = C.skinSh; g.beginPath(); g.ellipse(54, -262, 22, 46, 0, 0, 7); g.fill();
    fade(-60, -33, -320, -268, .9); fade(33, 60, -320, -268, .9);
    stubble(-50, -36, -290, -270, 18); stubble(36, 50, -290, -270, 18);
    g.restore();
    blob(jaw, null);
    const bl = h.blink || 0;
    for (const s of [-1, 1]){
      eye(s*20 + (h.look || 0)*3, -274, 6.5, 10.5, bl);
      g.strokeStyle = C.hair; g.lineWidth = 4; g.lineCap = "round"; g.beginPath(); g.moveTo(s*12, -291); g.lineTo(s*30, -293 + (face === "open" ? -4 : 0)); g.stroke();
      g.fillStyle = C.blush; g.beginPath(); g.ellipse(s*30, -256, 9, 5, 0, 0, 7); g.fill();
    }
    g.strokeStyle = C.skinSh; g.lineWidth = 3; g.beginPath(); g.moveTo(3, -268); g.lineTo(6, -258); g.lineTo(1, -256); g.stroke();
    if (face === "open"){ blob(() => { g.moveTo(-13, -246); g.quadraticCurveTo(0, -244, 13, -246); g.quadraticCurveTo(10, -230, 0, -230); g.quadraticCurveTo(-10, -230, -13, -246); }, "#7a2b3a"); }
    else { g.strokeStyle = C.ol; g.lineWidth = 3.2; g.beginPath(); g.moveTo(-9, -244); g.quadraticCurveTo(0, -238, 9, -244); g.stroke(); }
    // short top: sits close to the skull, soft hairline with a slight part
    blob(() => { g.moveTo(-48, -300); g.bezierCurveTo(-58, -356, 58, -360, 49, -302); g.quadraticCurveTo(44, -310, 36, -308); g.lineTo(28, -313); g.lineTo(16, -309); g.lineTo(6, -315); g.lineTo(-6, -310); g.lineTo(-18, -314); g.lineTo(-30, -308); g.quadraticCurveTo(-42, -310, -48, -300); g.closePath(); }, C.hair);
    texture([[-30, -330, 10, -8], [-12, -338, 12, -6], [8, -338, 12, -4], [26, -330, 10, -2], [-20, -320, 12, -4], [2, -324, 12, -4]]);
    g.restore();
  }
  function headBack(h){
    g.save(); g.translate(h.dx || 0, h.dy || 0); g.translate(0, -228); g.rotate(h.rot || 0); g.translate(0, 228);
    neck();
    ell(-53, -276, 10, 15, C.skin); ell(53, -276, 10, 15, C.skin);
    const sk = () => { g.ellipse(0, -284, 55, 60, 0, 0, Math.PI*2); };
    blob(sk, C.skin, false);
    g.save(); g.beginPath(); sk(); g.clip();
    { const gr = g.createLinearGradient(0, -318, 0, -244); gr.addColorStop(0, `rgba(${HR},.97)`); gr.addColorStop(.5, `rgba(${HR},.86)`); gr.addColorStop(.8, `rgba(${HR},.4)`); gr.addColorStop(1, `rgba(${HR},0)`); g.fillStyle = gr; g.fillRect(-70, -318, 140, 74); }
    stubble(-44, 44, -262, -244, 40);
    g.fillStyle = C.skinSh; g.globalAlpha = .45; g.beginPath(); g.ellipse(46, -268, 16, 40, 0, 0, 7); g.fill(); g.globalAlpha = 1;
    g.restore();
    blob(sk, null);
    blob(() => { g.moveTo(-54, -296); g.bezierCurveTo(-62, -358, 62, -358, 54, -296); g.quadraticCurveTo(28, -306, 0, -304); g.quadraticCurveTo(-28, -306, -54, -296); g.closePath(); }, C.hair, false);
    g.strokeStyle = C.ol; g.lineWidth = OLW; g.beginPath(); g.moveTo(-54, -296); g.bezierCurveTo(-62, -358, 62, -358, 54, -296); g.stroke();
    texture([[-34, -326, 12, -6], [-10, -336, 12, -4], [14, -334, 12, -2], [-24, -312, 14, -4], [6, -316, 14, -2], [30, -316, 10, 0]]);
    g.restore();
  }
  function headSide(face, h){
    g.save(); g.translate(h.dx || 0, h.dy || 0); g.translate(0, -228); g.rotate(h.rot || 0); g.translate(0, 228);
    neck();
    const hd = () => { g.moveTo(-50, -270); g.bezierCurveTo(-58, -338, 34, -352, 48, -300); g.quadraticCurveTo(52, -286, 58, -276); g.quadraticCurveTo(60, -268, 50, -266); g.quadraticCurveTo(48, -250, 40, -242); g.quadraticCurveTo(30, -226, 8, -228); g.quadraticCurveTo(-12, -232, -20, -244); g.closePath(); };
    blob(hd, C.skin, false);
    g.save(); g.beginPath(); hd(); g.clip();
    g.fillStyle = C.skinSh; g.fillRect(-60, -262, 60, 40);
    fade(-64, 18, -318, -258, .92); stubble(-44, 8, -284, -262, 24);
    g.restore();
    blob(hd, null);
    ell(-6, -272, 9, 13, C.skin); g.strokeStyle = C.skinSh; g.lineWidth = 2.5; g.beginPath(); g.arc(-5, -272, 4.5, -1.2, 1.4); g.stroke();
    eye(32, -278, 5.5, 10, h.blink || 0);
    g.strokeStyle = C.hair; g.lineWidth = 5; g.lineCap = "round"; g.beginPath(); g.moveTo(24, -296); g.lineTo(44, -298); g.stroke();
    g.fillStyle = C.blush; g.beginPath(); g.ellipse(28, -256, 8, 5, 0, 0, 7); g.fill();
    g.strokeStyle = C.ol; g.lineWidth = 3; g.beginPath(); g.moveTo(36, -244); g.quadraticCurveTo(42, -242, 46, -246); g.stroke();
    blob(() => { g.moveTo(47, -304); g.quadraticCurveTo(40, -316, 30, -312); g.bezierCurveTo(22, -362, -52, -356, -52, -306); g.quadraticCurveTo(-30, -310, -8, -306); g.quadraticCurveTo(20, -304, 47, -304); g.closePath(); }, C.hair);
    texture([[-30, -330, 12, -6], [-6, -340, 12, -4], [16, -336, 12, -2], [-16, -318, 14, -4]]);
    g.restore();
  }

  function bigHead(fn){ g.save(); g.translate(0, -214); g.scale(1.03, 1.03); g.translate(0, 214); fn(); g.restore(); }

  /* ---- poses ---- */
  const PI = Math.PI;
  const nz = (t, s) => Math.sin(t*s)*.6 + Math.sin(t*s*2.31 + 1.3)*.3 + Math.sin(t*s*4.17 + 2.1)*.1;
  const blink = t => { const p = (t + Math.sin(t*.13)*.9) % 3.9; return p < .17 ? Math.sin(p/.17*PI) : 0; };
  const pos = x => Math.pow(Math.max(0, x), 1.3);
  const POSES = {
    stand: t => { const w = nz(t, .35); return {view:"back", dx:4*w, rot:.01*w, bob:1.4*Math.sin(t*1.7),
      head:{dx:5*nz(t, .21), rot:.05*nz(t, .27) - .01*w},
      aL:{a1:-.1 - .02*Math.sin(t*1.7) - .02*w, a2:-.04 - .02*w}, aR:{a1:.1 + .02*Math.sin(t*1.7) - .02*w, a2:.04 - .02*w},
      lL:{a1:-.06 + .03*Math.max(0, w), a2:-.03 + .05*Math.max(0, w), s1:1 - .03*Math.max(0, w)}, lR:{a1:.06 + .03*Math.min(0, w), a2:.03 + .05*Math.min(0, w), s1:1 + .03*Math.min(0, w)}}; },
    walk: t => {
      const ph = t*5.6, bob = -4.5*Math.cos(2*ph), dx = 4.2*Math.cos(ph);
      const o = {view:"front", ik:true, dx, bob, rot:.014*Math.cos(ph), face:"calm",
        head:{rot:-.01*Math.cos(ph) + .015*nz(t, .3), dy:1.2*Math.cos(2*ph), blink:blink(t), look:.35*nz(t, .2)}, legs:[], arms:[]};
      [[-1, 0], [1, PI]].forEach(([sd, off]) => {
        const p = ph + off, f = Math.sin(p), lift = Math.pow(Math.max(0, Math.cos(p)), 1.6);
        o.legs.push({hip:{x:sd*27, y:6 + 5*lift}, ank:{x:sd*31 - dx*.9 - sd*3*Math.max(0, f), y:6 + 330 + 16*f - 40*lift - bob}, fs:1 + .14*f, bend:sd > 0 ? -1 : 1, L1s:1 - .06*lift, side:sd});
        const a2 = -f, fw = Math.max(0, a2), bk = Math.max(0, -a2);
        o.arms.push({sh:{x:sd*62, y:-188 + 1.5*Math.cos(2*ph)}, hand:{x:sd*(67 + 7*bk - 10*fw), y:-188 + 277 - 34*fw - 4*bk}, L2s:1 - .06*fw, hs:1 + .1*fw, bend:sd > 0 ? -1 : 1});
      });
      return o;
    },
    fly: t => { const u = Math.sin(t*1.6); return {view:"side", k:.84, dx:-40, bob:40, rot:1.0 + .035*u, tilt:.02*Math.sin(t*1.6 + 1),
      head:{rot:-.72 + .05*Math.sin(t*1.6 + .6), blink:blink(t)},
      aF:{a1:PI - .52 + .03*u, a2:PI - .42 + .02*u}, aB:{a1:-.32 + .05*Math.sin(t*1.6 + 2), a2:-.16},
      lF:{a1:-.06 + .09*Math.sin(t*2.8), a2:-.3 + .12*Math.sin(t*2.8 - .7)}, lB:{a1:.1 - .09*Math.sin(t*2.8), a2:-.14 - .1*Math.sin(t*2.8 + 1)}}; },
    drive: t => { const look = pos(Math.sin(t*.37 - 1))*.18; return {view:"side", tilt:-.08 + .02*Math.sin(t*9)*.3,
      head:{rot:.04*nz(t, .6) - look, dy:Math.sin(t*9)*.9, blink:blink(t)},
      aF:{a1:.78 + .03*Math.sin(t*1.1), a2:1.42 + .04*Math.sin(t*1.1)}, aB:{a1:.72 - .03*Math.sin(t*1.1), a2:1.36 - .04*Math.sin(t*1.1)},
      lF:{a1:1.45, a2:.3}, lB:{a1:1.42, a2:.28}}; },
    type: t => { const burst = Math.sin(t*.8) > -.35 ? 1 : .15; return {view:"back", armsBehind:true,
      head:{dx:6*nz(t, .23), rot:.05*nz(t, .31), dy:2*Math.sin(t*.7)}, dx:1.5*nz(t, .4), bob:.8*Math.sin(t*1.6),
      aL:{a1:-.38, a2:1.05 + .07*Math.sin(t*12)*burst, s1:.9, s2:.6 + .03*Math.sin(t*6)*burst}, aR:{a1:.38, a2:-1.05 - .07*Math.sin(t*12 + 1.7)*burst, s1:.9, s2:.6 + .03*Math.sin(t*6 + 2)*burst},
      lL:{a1:-.14, a2:-.05, s1:.3, s2:.85}, lR:{a1:.14, a2:.05, s1:.3, s2:.85}}; },
    cheer: t => { const c = (t*1.05) % 1, air = Math.sin(c*PI), land = c < .18 ? 1 - c/.18 : c > .9 ? (c - .9)/.1 : 0;
      return {view:"front", face:"open", bob:-24*air + 10*land, head:{rot:.05*Math.sin(t*3.3), dy:3*land, blink:blink(t)},
      aL:{a1:-(PI - .8) + .14*Math.sin(t*6.6), a2:-(PI - .3) + .1*Math.sin(t*6.6 + .5), s1:.86, s2:.8}, aR:{a1:PI - .8 + .14*Math.sin(t*6.6 + PI), a2:PI - .3 + .1*Math.sin(t*6.6 + PI + .5), s1:.86, s2:.8},
      lL:{a1:-.1 - .05*air + .06*land, a2:-.06 - .1*land, s1:1 - .12*land, s2:1 - .04*air}, lR:{a1:.1 + .05*air - .06*land, a2:.06 + .1*land, s1:1 - .12*land, s2:1 - .04*air}}; },
    edge: t => { const w = nz(t, .3); return {view:"back", noLegs:true, dx:2.5*w, rot:.012*w, bob:1.2*Math.sin(t*1.5),
      head:{dx:6*nz(t, .19), rot:.07*nz(t, .23)},
      aL:{a1:-.62 + .03*w, a2:-.1, s1:.9, s2:.8}, aR:{a1:.62 + .03*w, a2:.1, s1:.9, s2:.8}}; }
  };

  function draw(name, t){
    const P = POSES[name](t);
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, SIZE, SIZE);
    g.translate(HIP.x + (P.dx || 0)*K, HIP.y + (P.bob || 0)*K); g.scale(K*(P.k || 1)*(P.flip ? -1 : 1), K*(P.k || 1)); g.rotate(P.rot || 0);
    const h = P.head || {};
    if (P.view === "side"){
      const tilt = P.tilt || 0, shF = add({x:0, y:0}, dir(PI + tilt), 192), shB = add({x:-10, y:0}, dir(PI + tilt), 192);
      arm(shB, P.aB, true);
      leg({x:-6, y:-2}, P.lB, true, "side", 1);
      leg({x:4, y:2}, P.lF, false, "side", 1);
      g.save(); g.rotate(-tilt); torsoSide(); bigHead(() => headSide("calm", h)); g.restore();
      arm(shF, P.aF, false);
    } else {
      const back = P.view === "back";
      if (P.ik) P.legs.forEach(l => legIK(l.hip, l.ank, l.fs, l.bend, P.view, l.side, l.L1s));
      else if (!P.noLegs){ leg({x:-28, y:6}, P.lL, false, P.view, -1); leg({x:28, y:6}, P.lR, false, P.view, 1); }
      if (P.armsBehind){ arm({x:-60, y:-188}, P.aL, false); arm({x:60, y:-188}, P.aR, false); }
      back ? torsoBack() : torsoFront();
      bigHead(() => back ? headBack(h) : headFront(P.face, h));
      if (P.ik) P.arms.forEach(a => armIK(a.sh, a.hand, a.L2s, a.hs, a.bend));
      else if (!P.armsBehind){ arm({x:-62, y:-188}, P.aL, false); arm({x:62, y:-188}, P.aR, false); }
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
  }
  return {canvas:cv, draw, SIZE, HIP, K, poses:Object.keys(POSES)};
})();
