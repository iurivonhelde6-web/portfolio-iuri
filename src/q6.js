/* ================= ZONES 4–6 ================= */
const SHOT_PAINTERS = [];
function onShotLoaded(src){ SHOT_PAINTERS.forEach(([s, f]) => { if (s === src) f(); }); }
function codeCanvas(seed){
  const c = document.createElement("canvas"); c.width = 512; c.height = 320; const t = new THREE.CanvasTexture(c); t.anisotropy = ANISO;
  const cols = ["#7fd4ff","#ff7aa6","#c5f28c","#ffcf6b","#b69cff","#f4effc"];
  const lines = []; for (let i = 0; i < 60; i++){ const segs = []; let x = 34 + ((i*seed) % 4)*18; const n = 1 + (i*7 + seed) % 4;
    for (let j = 0; j < n; j++){ const w = 20 + ((i*31 + j*17 + seed*13) % 90); segs.push([x, w, cols[(i + j + seed) % 6]]); x += w + 10; if (x > 470) break; } lines.push(segs); }
  return {tex:t, draw(off){ const g = c.getContext("2d"); g.fillStyle = "#0c1030"; g.fillRect(0, 0, 512, 320); g.fillStyle = "#151a44"; g.fillRect(0, 0, 512, 22);
    g.fillStyle = "#ff6b7d"; g.beginPath(); g.arc(14, 11, 4, 0, 7); g.fill(); g.fillStyle = "#ffcf6b"; g.beginPath(); g.arc(28, 11, 4, 0, 7); g.fill(); g.fillStyle = "#7bd66a"; g.beginPath(); g.arc(42, 11, 4, 0, 7); g.fill();
    const o = Math.floor(off);
    for (let k = 0; k < 20; k++){ const L = lines[(k + o) % lines.length], y = 34 + k*14; g.fillStyle = "#3a3f75"; g.fillRect(10, y, 12, 6); L.forEach(([x, w, cl]) => { g.fillStyle = cl; g.fillRect(x, y, w, 6); }); }
    g.fillStyle = "#f4effc"; if (Math.floor(off*4) % 2) g.fillRect(40, 34 + 19*14, 8, 8); t.needsUpdate = true; }};
}

/* 4 · PROJETOS — the desk at home */
zone({
  sky:["#0b0d2a", "#232a66", "#0b0d2a"], sunDir:[0, 1, 0], sunCol:"#000000", sunK:0, fog:["#1a1f4a", 40, 200], stars:0,
  hemi:["#a9b4ff", "#3a2a3a", .75], light:{pos:[-6, 10, 6], color:"#9fb2ff", i:.45}, tint:0xdfe2ff,
  pose:"type", hip:[0, .66, -2.4], shadow:false, sprite:{robot:{mode:"type", yaw:Math.PI, seatH:.69, kbX:.16, kbY:.2, kbZ:.58}, base:[0, .69, -2.67]},
  cam:{p:[1.35, 1.72, -.15], l:[-.15, 1.0, -2.7]}, entry:{p:[1.4, .6, 2], l:[0, .2, 0]}, sway:.05,
  build(g, z){
    const woodT = cvs(256, 256, (x) => { for (let i = 0; i < 8; i++){ x.fillStyle = ["#c98a3e","#b87a33","#d49848","#c08238"][i % 4]; x.fillRect(0, i*32, 256, 32); x.fillStyle = "rgba(80,40,10,.35)"; x.fillRect(0, i*32, 256, 2); x.fillRect((i*97) % 256, i*32, 2, 32); }
      x.fillStyle = "rgba(255,230,180,.08)"; for (let k = 0; k < 40; k++) x.fillRect(rnd(0, 256), rnd(0, 256), rnd(20, 60), 1); });
    woodT.wrapS = woodT.wrapT = THREE.RepeatWrapping; woodT.repeat.set(4, 4);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(14, 12), new THREE.MeshToonMaterial({map:woodT, gradientMap:GRAD})); fl.rotation.x = -Math.PI/2; fl.position.set(0, 0, -.5); g.add(fl);
    const wallT = cvs(256, 256, (x) => { x.fillStyle = "#3d52c4"; x.fillRect(0, 0, 256, 256); for (let k = 0; k < 900; k++){ x.fillStyle = Math.random() < .5 ? "rgba(255,255,255,.05)" : "rgba(0,0,40,.07)"; x.fillRect(rnd(0, 256), rnd(0, 256), rnd(1, 4), rnd(1, 4)); } });
    wallT.wrapS = wallT.wrapT = THREE.RepeatWrapping; wallT.repeat.set(3, 2);
    const wm = new THREE.MeshToonMaterial({map:wallT, gradientMap:GRAD});
    const bw = new THREE.Mesh(new THREE.BoxGeometry(14, 7, .3), wm); bw.position.set(0, 3.5, -4.35); g.add(bw);
    const lw = new THREE.Mesh(new THREE.BoxGeometry(.3, 7, 12), wm); lw.position.set(-5.6, 3.5, -.5); g.add(lw);
    box(g, 14, .18, .06, "#2a3a9a", 0, .09, -4.17); box(g, .06, .18, 12, "#2a3a9a", -5.43, .09, -.5);
    // window on the left wall with the city at night
    const winT = cvs(512, 320, (x) => { const gr = x.createLinearGradient(0, 0, 0, 320); gr.addColorStop(0, "#130f3a"); gr.addColorStop(1, "#6a2f7e"); x.fillStyle = gr; x.fillRect(0, 0, 512, 320);
      for (let k = 0; k < 60; k++){ x.fillStyle = "rgba(255,255,255,.8)"; x.fillRect(rnd(0, 512), rnd(0, 150), 1.5, 1.5); }
      for (let b = 0; b < 16; b++){ const bx = b*34 + rnd(-6, 6), bh = rnd(80, 200); x.fillStyle = pick(["#2a2466","#35307a","#241e58"]); x.fillRect(bx, 320 - bh, 36, bh);
        for (let wy = 320 - bh + 10; wy < 310; wy += 16) for (let wx = bx + 5; wx < bx + 32; wx += 10) if (Math.random() < .35){ x.fillStyle = Math.random() < .7 ? "#ffcf7a" : "#ff9ec4"; x.fillRect(wx, wy, 5, 7); } } });
    const win = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2), new THREE.MeshBasicMaterial({map:winT})); win.position.set(-5.44, 2.4, -.2); win.rotation.y = Math.PI/2; g.add(win);
    [[0, 1.05, 0, 3.4, .12], [0, -1.05, 0, 3.4, .12], [0, 0, 1.65, .12, 2.2], [0, 0, -1.65, .12, 2.2], [0, 0, 0, .08, 2.1]].forEach(([dx, dy, dz, w, h]) => box(g, .12, h, w, "#eef0ff", -5.4, 2.4 + dy, -.2 + dz));
    box(g, .5, .1, 3.6, "#eef0ff", -5.2, 1.3, -.2);
    // posters (original art)
    const poster = (fn, x, y, w, h) => { const t = cvs(256, Math.round(256*h/w), fn); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshToonMaterial({map:t, gradientMap:GRAD, emissive:new THREE.Color(0x333333), emissiveMap:t})); m.position.set(x, y, -4.19); g.add(m); box(g, w + .1, h + .1, .04, "#1b1840", x, y, -4.21); };
    poster((x, W, H) => { x.fillStyle = "#ffb43a"; x.fillRect(0, 0, W, H); x.fillStyle = "#1a1230"; x.beginPath(); x.arc(W/2, H*.42, W*.3, 0, 7); x.fill(); x.fillStyle = "#ff7aa6"; x.fillRect(0, H*.78, W, H*.22); x.fillStyle = "#1a1230"; x.font = "900 40px Arial Narrow, Arial"; x.textAlign = "center"; x.fillText("CODE", W/2, H*.93); }, -3.6, 3.1, 1.1, 1.5);
    poster((x, W, H) => { x.fillStyle = "#101433"; x.fillRect(0, 0, W, H); for (let i = 0; i < 7; i++){ x.strokeStyle = ["#5ec8ff","#c5f28c","#ff7aa6"][i % 3]; x.lineWidth = 8; x.beginPath(); x.arc(W/2, H/2, 20 + i*14, i, i + 3); x.stroke(); } }, -2.2, 3.35, 1, 1);
    // bed
    box(g, 2.4, .45, 4.2, "#2a2466", -4.1, .22, 1.2); const mat = box(g, 2.3, .35, 4.1, "#eef0ff", -4.1, .6, 1.2);
    const blanket = box(g, 2.36, .2, 2.8, "#3a4fd0", -4.1, .82, 1.9); blanket.rotation.x = -.02; box(g, 1.4, .25, .8, "#f7f3ff", -4.1, .9, -.4); void mat;
    // desk
    box(g, 3.8, .09, 1.15, "#2a2f66", 0, .8, -3.55); [[-1.8, -3.05], [1.8, -3.05], [-1.8, -4.05], [1.8, -4.05]].forEach(([x, zz]) => box(g, .08, .8, .08, "#1b1f48", x, .4, zz));
    box(g, .9, .6, 1, "#262a5c", 1.3, .45, -3.6);
    z.codes = [codeCanvas(3), codeCanvas(5)]; z.codes.forEach(c => c.draw(0));
    const pv = document.createElement("canvas"); pv.width = 640; pv.height = 320; z.pvCanvas = pv; z.pvTex = new THREE.CanvasTexture(pv); z.pvTex.anisotropy = ANISO;
    [[-1.25, .45, z.codes[0].tex, 1.05], [0, 0, z.pvTex, 1.4], [1.25, -.45, z.codes[1].tex, 1.05]].forEach(([x, ry, tex, w]) => {
      const m = new THREE.Group(); m.position.set(x, 1.45, -3.75 + Math.abs(x)*.12); m.rotation.y = ry; g.add(m);
      box(m, w + .08, w*.56 + .08, .06, "#0a0c22", 0, 0, -.04);
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(w, w*.56), new THREE.MeshBasicMaterial({map:tex})); m.add(scr);
      box(m, .06, .5, .06, "#0a0c22", 0, -.45, -.08); box(m, .35, .03, .25, "#0a0c22", 0, -.66, -.08);
      glow(m, 0x6a8cff, w*2.2, 0, 0, .15, .18);
    });
    const kbT = cvs(256, 64, (x) => { const gr = x.createLinearGradient(0, 0, 256, 0); ["#ff5d8f","#ffb43a","#c5f28c","#5ec8ff","#b69cff"].forEach((c, i) => gr.addColorStop(i/4, c)); x.fillStyle = "#0e0f24"; x.fillRect(0, 0, 256, 64);
      for (let r = 0; r < 4; r++) for (let k = 0; k < 16; k++){ x.fillStyle = gr; x.globalAlpha = .9; x.fillRect(6 + k*15.5, 6 + r*14.5, 12, 11); } });
    const kb = new THREE.Mesh(new THREE.BoxGeometry(1, .04, .32), [TM("#0e0f24"), TM("#0e0f24"), new THREE.MeshBasicMaterial({map:kbT}), TM("#0e0f24"), TM("#0e0f24"), TM("#0e0f24")]); kb.position.set(0, .87, -3.25); g.add(kb);
    box(g, .12, .04, .18, "#0e0f24", .72, .86, -3.25); glow(g, 0xb69cff, 1.6, 0, .9, -3.25, .35);
    cyl(g, .07, .06, .16, "#f4efe6", -1.1, .92, -3.2, 12);
    // desk lamp + lights
    cyl(g, .12, .14, .04, "#1b1f48", 1.55, .86, -3.8); const arm = box(g, .04, .7, .04, "#1b1f48", 1.5, 1.2, -3.8); arm.rotation.z = .3;
    const head = cyl(g, .05, .16, .2, "#ffb43a", 1.35, 1.55, -3.75, 12); head.rotation.z = -.9; glow(g, 0xffc27a, 1.8, 1.3, 1.45, -3.7, .7);
    const pl = new THREE.PointLight(0xffb870, 1.1, 8); pl.position.set(1.3, 1.5, -3.4); g.add(pl);
    const ml = new THREE.PointLight(0x6d8cff, 1.4, 9); ml.position.set(0, 1.6, -2.8); g.add(ml);
    // shelf + books + plant
    box(g, 2, .06, .35, "#1b1f48", 3.4, 2.4, -4.05);
    for (let k = 0; k < 9; k++) box(g, .14, rnd(.3, .45), .26, pick(["#ff7aa6","#ffb43a","#5ec8ff","#c5f28c","#b69cff","#f4efe6"]), 2.6 + k*.17, 2.6, -4.05);
    planter(g, 3.9, -3.6).scale.setScalar(.9);
    // gaming chair (between camera and hero)
    const ch = new THREE.Group(); ch.position.set(0, 0, -2.55); g.add(ch);
    box(ch, .85, .14, .8, "#1b2052", 0, .52, -.12); const back = box(ch, .8, .62, .14, "#1b2052", 0, .84, .26); back.rotation.x = -.08;
    box(ch, .13, .56, .02, "#2e5cff", -.2, .84, .345).rotation.x = -.08; box(ch, .13, .56, .02, "#2e5cff", .2, .84, .345).rotation.x = -.08;
    box(ch, .12, .3, .5, "#141840", -.48, .68, -.1); box(ch, .12, .3, .5, "#141840", .48, .68, -.1);
    cyl(ch, .05, .05, .42, "#141840", 0, .26, -.1, 8);
    for (let k = 0; k < 5; k++){ const a = k/5*TAU, l = box(ch, .5, .05, .07, "#141840", Math.cos(a)*.25, .06, -.1 + Math.sin(a)*.25); l.rotation.y = -a; ball(ch, .05, "#0a0c22", Math.cos(a)*.48, .04, -.1 + Math.sin(a)*.48, 0); }
    // floating project windows
    z.floats = [];
    const shots = ["img/padaria.jpg", "img/hortifruti.jpg", "img/replay.jpg"];
    [[-2.9, 3.9, -3.9, .12], [2.5, 4.3, -3.9, -.1], [.2, 4.6, -4.0, 0]].forEach(([x, y, zz, ry], i) => {
      const c = document.createElement("canvas"); c.width = 512; c.height = 320; const t = new THREE.CanvasTexture(c); t.anisotropy = ANISO;
      const paint = () => { const cx = c.getContext("2d"), im = IMGS[shots[i]]; cx.fillStyle = "#1b1840"; cx.fillRect(0, 0, 512, 320); cx.fillStyle = "#2a2660"; cx.fillRect(0, 0, 512, 22);
        ["#ff6b7d", "#ffcf6b", "#7bd66a"].forEach((col, k) => { cx.fillStyle = col; cx.beginPath(); cx.arc(14 + k*14, 11, 4, 0, 7); cx.fill(); });
        if (im && im.complete && im.naturalWidth) cx.drawImage(im, 0, 22, 512, 298); t.needsUpdate = true; };
      paint(); SHOT_PAINTERS.push([shots[i], paint]);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.06), new THREE.MeshBasicMaterial({map:t, transparent:true, opacity:.94})); m.position.set(x, y, zz); m.rotation.y = ry; g.add(m);
      m.userData.y = y; m.userData.ph = i*1.9; z.floats.push(m); glow(g, 0x8aa0ff, 3, x, y, zz - .05, .15);
    });
    z.dust = motes(g, 70, 0, 2.5, -1.5, 5, 2.4, 3, 0xaab8ff, .05, .6);
    z.codeT = 0;
  },
  update(t, dt, z){
    z.codeT += dt*SP; if (z.codeT > .12){ z.codeT = 0; z.codes[0].draw(t*3); z.codes[1].draw(t*2.2 + 7); }
    z.floats.forEach(m => m.position.y = m.userData.y + Math.sin(t*.8 + m.userData.ph)*.08);
  }
});
function setProjectScreen(){
  const z = ZONES[4]; if (!z || !z.pvCanvas) return;
  const src = document.getElementById("pv");
  const g = z.pvCanvas.getContext("2d"); if (src) g.drawImage(src, 0, 0, 1280, 640, 0, 0, 640, 320); else { g.fillStyle = "#0c1030"; g.fillRect(0, 0, 640, 320); }
  z.pvTex.needsUpdate = true;
}

/* 5 · FORMAÇÃO — on the podium */
function plaqueTex(title, sub, col){ return cvs(512, 320, (g) => { g.fillStyle = "#f7f2ff"; g.fillRect(0, 0, 512, 320); g.fillStyle = col; g.fillRect(0, 0, 512, 24); g.fillRect(0, 296, 512, 24);
  g.fillStyle = "#1c1636"; g.textAlign = "center"; g.textBaseline = "middle"; let fs = 120; g.font = "900 " + fs + "px 'Big Shoulders Display','Arial Narrow',Arial"; while (g.measureText(title).width > 450) { fs -= 6; g.font = "900 " + fs + "px 'Big Shoulders Display','Arial Narrow',Arial"; }
  g.fillText(title, 256, 140); g.font = "600 34px 'IBM Plex Mono', monospace"; g.fillStyle = "#5a5280"; g.fillText(sub, 256, 236); }); }
zone({
  sky:["#12082a", "#3a1766", "#12082a"], sunDir:[0, .3, -1], sunCol:"#ff7ad0", sunK:.25, fog:["#2a1250", 30, 150], stars:.25,
  hemi:["#d6c4ff", "#2a1640", .95], light:{pos:[4, 20, 14], color:"#fff0e0", i:.7}, tint:0xfff6ff,
  pose:"cheer", hip:[0, 1.25 + HIP_H, 0], shadow:true, sprite:{robot:{mode:"cheer"}, base:[0, 1.29, 0]},
  cam:{p:[0, 2.35, 6.0], l:[0, 2.1, 0]}, entry:{p:[0, 3, 4], l:[0, 1.5, 0]}, sway:.14,
  build(g, z){
    const curtain = new THREE.PlaneGeometry(46, 16, 120, 1); const pa = curtain.attributes.position;
    for (let i = 0; i < pa.count; i++) pa.setZ(i, Math.sin(pa.getX(i)*1.6)*.35 + Math.sin(pa.getX(i)*.5)*.3);
    curtain.computeVertexNormals(); const cu = new THREE.Mesh(curtain, TM("#5a2380")); cu.position.set(0, 6, -9); g.add(cu);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(9, 9.4, .5, 48), TM("#2c2356")); st.position.y = -.25; g.add(st);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(9.1, .07, 6, 64), new THREE.MeshBasicMaterial({color:0xffcf6b})); rim.rotation.x = Math.PI/2; rim.position.y = .01; g.add(rim);
    const pod = (x, h, n, col) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1.9, h, 1.6), [TM(col), TM(col), TM("#f4eefc"), TM(col), new THREE.MeshToonMaterial({map:labelTex(n, col, "#f7f2ff", 256, 256), gradientMap:GRAD}), TM(col)]);
      m.position.set(x, h/2, 0); g.add(m); box(g, 1.98, .08, 1.68, "#f4eefc", x, h, 0); return m; };
    pod(0, 1.25, "1", "#6a56d8"); pod(-2, .82, "2", "#4f8fd8"); pod(2, .56, "3", "#d85a8a");
    const cup = [V3(0, 0), V3(.22, 0), V3(.22, .05), V3(.08, .1), V3(.06, .35), V3(.1, .4), V3(.3, .55), V3(.34, .85), V3(.3, .88), V3(0, .6)].map(v => new THREE.Vector2(v.x, v.y));
    [[-2, .86], [2, .6]].forEach(([x, y]) => { const tr = new THREE.Mesh(new THREE.LatheGeometry(cup, 24), TM("#ffc43a")); tr.position.set(x, y, .1); tr.scale.setScalar(.8); g.add(tr); glow(g, 0xffd27a, 1.4, x, y + .6, .2, .35); });
    const P = [["FIAP", "Eng. de Software", "#ffb43a", 0, 5.7, -5], ["UVA", "Análise e Des. Sist.", "#5ec8ff", -4.6, 4.2, -2.4], ["IBSEC", "Ethical Hacker", "#ff7aa6", 4.6, 4.4, -2.4], ["FIAP", "CyberSecurity", "#c5f28c", 7.6, 2.7, -4]];
    z.plaques = P.map(([t, s, c, x, y, zz], i) => { const geo = new THREE.ExtrudeGeometry(rrShape(2.4, 1.5, .16), {depth:.12, bevelEnabled:true, bevelThickness:.04, bevelSize:.04, bevelSegments:2, curveSegments:6});
      const tex = plaqueTex(t, s, c); tex.repeat.set(1/2.48, 1/1.58); tex.offset.set(.5, .5);
      const m = new THREE.Mesh(geo, [new THREE.MeshToonMaterial({map:tex, gradientMap:GRAD, emissive:new THREE.Color(0x303030), emissiveMap:tex}), TM(c)]);
      m.position.set(x, y, zz); m.rotation.y = -x*.05; m.userData = {y, ph:i*1.3}; g.add(m); return m; });
    for (const sx of [-1, 1]){ const beam = new THREE.Mesh(new THREE.CylinderGeometry(.25, 2.6, 13, 24, 1, true), new THREE.MeshBasicMaterial({color:0xffe8b0, transparent:true, opacity:.1, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide, fog:false}));
      beam.position.set(sx*3.2, 6.8, 1); beam.rotation.z = sx*.26; g.add(beam); cyl(g, .3, .4, .6, "#1a1530", sx*4.9, 13, 1).rotation.z = sx*.26; }
    const sp = new THREE.SpotLight(0xfff0d8, 1.2, 30, .5, .6); sp.position.set(0, 12, 5); sp.target.position.set(0, 1.5, 0); g.add(sp); g.add(sp.target);
    const N = 320, conf = new THREE.InstancedMesh(new THREE.PlaneGeometry(.13, .08), new THREE.MeshBasicMaterial({side:THREE.DoubleSide}), N), cc = new THREE.Color();
    z.conf = conf; z.cd = [];
    for (let i = 0; i < N; i++){ z.cd.push({x:rnd(-10, 10), y:rnd(0, 13), z:rnd(-6, 5), r:rnd(0, TAU), s:rnd(.6, 1.4), w:rnd(1, 4)}); conf.setColorAt(i, cc.set(pick(["#ff7aa6","#ffb43a","#5ec8ff","#c5f28c","#b69cff","#fff"]))); }
    g.add(conf); z.m4 = new THREE.Matrix4(); z.q = new THREE.Quaternion(); z.e = new THREE.Euler();
  },
  update(t, dt, z){
    z.plaques.forEach(m => { m.position.y = m.userData.y + Math.sin(t*1.1 + m.userData.ph)*.18; m.rotation.x = Math.sin(t*.7 + m.userData.ph)*.05; });
    z.cd.forEach((c, i) => { c.y -= dt*c.s*1.3*SP; c.x += Math.sin(t*c.w + i)*dt*.4; c.r += dt*c.w*SP; if (c.y < -.2) c.y += 13;
      z.e.set(c.r, c.r*.7, c.r*.3); z.q.setFromEuler(z.e); z.m4.compose(V3(c.x, c.y, c.z), z.q, V3(1, 1, 1)); z.conf.setMatrixAt(i, z.m4); });
    z.conf.instanceMatrix.needsUpdate = true;
  }
});

/* 6 · CONTATO — sitting on the rooftop edge at sunset */
zone({
  sky:["#2a1454", "#ff8a52", "#4a1d5c"], sunDir:[.12, .02, 1], sunCol:"#ffc27a", sunK:1.0, fog:["#d9705e", 60, 360], stars:.15,
  hemi:["#ffd8c8", "#3a1f4a", 1.0], light:{pos:[10, 12, 60], color:"#ffb880", i:.7}, tint:0xfff0ea,
  pose:"edge", hip:[-.9, .2, -.3], shadow:false, sprite:{robot:{mode:"sit", ledge:.1}, base:[-.9, .22, .1]},
  cam:{p:[-.8, 1.35, -4.1], l:[.3, .35, 10]}, entry:{p:[-2, 2.2, -3], l:[0, -.6, 0]}, sway:.1,
  build(g, z){
    box(g, 60, 1.2, .6, "#6c64ae", 0, -.6, 0); box(g, 60, .12, .78, "#aaa3e6", 0, .06, 0);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(60, .3, 14), TM("#4f4a8a")); roof.position.set(0, -1.35, -7); g.add(roof);
    const acu = (x, zz) => { const a = new THREE.Group(); a.position.set(x, -1.2, zz); g.add(a); box(a, 1.6, 1.1, 1.1, "#8f88c8", 0, .55, 0); cyl(a, .38, .38, .06, "#3a3566", 0, 1.12, 0, 16); box(a, .7, .04, .06, "#6c64ae", 0, 1.16, 0); };
    acu(-3.5, -3.2); acu(2.6, -4.6);
    cyl(g, 1, 1, 2.2, "#7a72b8", 5.2, -.1, -6, 16); const ant = cyl(g, .04, .06, 4.5, "#2e2856", -6, 1, -3.5, 6); void ant;
    z.blink = new THREE.Mesh(new THREE.SphereGeometry(.09, 8, 6), new THREE.MeshBasicMaterial({color:0xff3b4a})); z.blink.position.set(-6, 3.3, -3.5); g.add(z.blink);
    z.blinkGlow = glow(g, 0xff3b4a, 1.2, -6, 3.3, -3.5, .8);
    z.city = city(g, {x0:-170, x1:170, z0:16, z1:280, y:-60, sp:12, hmin:12, hmax:42, tall:.16, cars:140, lampSize:1.9});
    // neighbour building with neon sign
    const nb = new THREE.Group(); nb.position.set(-9.5, 0, 17); g.add(nb);
    box(nb, 10, 40, 10, "#6a4a9a", 0, -24, 0); box(nb, 10.6, .5, 10.6, "#b9a6e6", 0, -3.8, 0);
    const neon = labelTex("IURI.DEV", "rgba(0,0,0,0)", "#ff6fae", 512, 128, "900 ");
    const nm = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), new THREE.MeshBasicMaterial({map:neon, transparent:true, fog:false})); nm.position.set(0, -2.2, -5.1); nm.rotation.y = Math.PI; nb.add(nm);
    z.neon = glow(nb, 0xff4f9a, 9, 0, -2.2, -5.4, .45);
    const sunD = new THREE.Mesh(new THREE.CircleGeometry(26, 48), new THREE.MeshBasicMaterial({color:0xffd9a0, fog:false})); sunD.position.set(80, -10, 700); sunD.rotation.y = Math.PI; g.add(sunD);
    glow(g, 0xffb070, 260, 80, -8, 690, .55);
    z.flies = motes(g, 50, 0, 1, 12, 20, 4, 10, 0xffd8a0, .12, .6);
  },
  update(t, dt, z){ z.city.update(t, dt); const on = (t % 1.6) < .8; z.blink.visible = on; z.blinkGlow.visible = on; z.neon.material.opacity = .38 + .1*Math.sin(t*9) + (Math.sin(t*23) > .97 ? -.3 : 0); }
});
