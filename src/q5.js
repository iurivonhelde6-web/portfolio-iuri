/* ================= ZONES 0–3 ================= */
const ZONES = [];
function zone(cfg){ cfg.movers = []; ZONES.push(cfg); return cfg; }
/* the user's own character art, cut out per pose (w × h in px, height in metres, bottom-centre anchor) */
const SPRITES = {
  stand:{src:"spr/stand.png", w:408, h:1414}, walk:{src:"spr/walk.png", w:444, h:1336}, fly:{src:"spr/fly.png", w:480, h:1114},
  sit:{src:"spr/sit.png", w:556, h:818}, type:{src:"spr/type.png", w:512, h:914}
};
const SPRITE_TEX = {};
function spriteTex(key){ if (SPRITE_TEX[key]) return SPRITE_TEX[key];
  const t = new THREE.TextureLoader().load(SPRITES[key].src); t.anisotropy = ANISO; SPRITE_TEX[key] = t; return t; }
function buildZone(cfg){ const g = new THREE.Group(); g.visible = false; scene.add(g); cfg.g = g; cfg.build(g, cfg);
  const h = cfg.hero = makeHero(); (cfg.heroParent || g).add(h.group); h.mat.color.setHex(cfg.tint);
  const sp = cfg.sprite, S = SPRITES[sp.key] || {w:1, h:1}, crop = sp.crop || 1;
  let tex = (sp.rg || sp.robot) ? null : spriteTex(sp.key); if (crop < 1){ tex = tex.clone(); tex.repeat.set(1, crop); tex.offset.set(0, 1 - crop); const src = SPRITE_TEX[sp.key]; const upd = () => { tex.image = src.image; tex.needsUpdate = true; }; if (src.image && src.image.complete) upd(); else setTimeout(function wait(){ src.image && src.image.complete ? upd() : setTimeout(wait, 150); }, 150); }
  let ph = sp.height || 1, pw = ph*S.w/(S.h*crop);
  if (sp.rig){ const RS = rigCanvasSize(sp.rig), c = document.createElement("canvas"); c.width = RS.W; c.height = RS.H;
    tex = new THREE.CanvasTexture(c); tex.anisotropy = ANISO; cfg.rig = {key:sp.rig, mode:sp.mode || "", ctx:c.getContext("2d"), tex};
    const D = RIGDATA[sp.rig]; ph = sp.height*RS.H/D.h; pw = ph*RS.W/RS.H; sp.planeH = ph;
    if (sp.anchor === "hip"){ const ax = RS.ox + D.piv.hip[0], ay = RS.oy + D.piv.hip[1]; sp.off = [-(ax/RS.W - .5)*pw, -(.5 - ay/RS.H)*ph]; } }
  if (sp.robot){ cfg.robot = ROBOT.create(cfg, sp.robot); h.group.add(cfg.robot.root); h.plane.visible = false; }
  else if (sp.rg){ const I = RG.INFO[sp.rg], k = sp.k || 1, c = document.createElement("canvas"); c.width = I.W; c.height = I.H;
    tex = new THREE.CanvasTexture(c); tex.anisotropy = ANISO; cfg.rig = {rg:sp.rg, ctx:c.getContext("2d"), tex};
    ph = I.H/RG.PPM*k; pw = I.W/RG.PPM*k; sp.planeH = ph;
    sp.off = sp.anchor === "hip" ? [(I.W/2 - I.hip[0])/RG.PPM*k, (I.hip[1] - I.H/2)/RG.PPM*k] : [0, (I.gy - I.H/2)/RG.PPM*k];
    RG.draw(cfg.rig.ctx, sp.rg, 0, {}); }
  if (sp.onTop){ h.mat.depthTest = false; h.plane.renderOrder = 20; }
  if (tex){ h.mat.map = tex; h.mat.alphaTest = .12; } h.mat.needsUpdate = true;
  h.plane.geometry.dispose(); h.plane.geometry = new THREE.PlaneGeometry(pw, ph); h.plane.position.set(sp.dx || 0, ph/2, 0);
  h.group.position.set(...sp.base); if (sp.flip) h.plane.scale.x = -1;
  if (cfg.shadow){ g.add(h.shadow); h.shadow.position.set(sp.base[0], sp.base[1] + .03, sp.base[2]); }
  cfg.cp = V3(0, 0, 0); cfg.cl = V3(0, 0, 0); cfg.camT = 1; cfg.exitT = -1; cfg.t = Math.random()*10; }
function mover(cfg, obj, axis, speed, min, max){ cfg.movers.push({obj, axis, speed, min, max}); return obj; }

/* 0 · INÍCIO — hilltop over a misty city */
zone({
  sky:["#1a0a38", "#86309a", "#3a1858"], sunDir:[0, .04, 1], sunCol:"#c04cc0", sunK:.45, fog:["#5e2a82", 18, 150], stars:.7,
  hemi:["#b8a8f0", "#24183e", 1.0], light:{pos:[-25, 30, 40], color:"#ffd6e8", i:.5}, tint:0xe6e0f6,
  pose:"stand", hip:[0, HIP_H, 0], shadow:true, sprite:{robot:{mode:"stand"}, base:[0, 0, 0]},
  cam:{p:[.6, 1.2, -4.6], l:[-.1, .4, 8]}, entry:{p:[.8, 2.6, -4], l:[0, -1, 0]}, sway:.16,
  build(g, z){
    const R = 15, SY = .34, C = V3(0, -R*SY, -5.5);
    const hy = (x, zz) => { const q = 1 - ((x - C.x)**2 + (zz - C.z)**2)/(R*R); return q > 0 ? C.y + Math.sqrt(q)*R*SY : -99; };
    const top = hy(0, 0); z.hip = [0, top + HIP_H, 0]; z.sprite.base = [0, top, 0];
    const gT = cvs(256, 256, (x) => { x.fillStyle = "#1d565c"; x.fillRect(0, 0, 256, 256);
      for (let k = 0; k < 5200; k++){ x.fillStyle = pick(["#2a767a", "#15454c", "#23676b", "#123c43", "#2f8484"]); const w = rnd(1, 3), h = rnd(2, 6); x.fillRect(rnd(0, 256), rnd(0, 256), w, h); } });
    gT.wrapS = gT.wrapT = THREE.RepeatWrapping; gT.repeat.set(9, 9);
    const hill = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 32), new THREE.MeshToonMaterial({map:gT, gradientMap:GRAD})); hill.scale.y = SY; hill.position.copy(C); g.add(hill);
    // tall grass clumps only along the rim, like tufts at the edge of a lawn
    const N = 2400, blade = new THREE.ConeGeometry(.035, 1, 3); blade.translate(0, .5, 0);
    const grass = new THREE.InstancedMesh(blade, TM("#133f40"), N), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = V3(1, 1, 1), c = new THREE.Color();
    const GC = ["#0f3436", "#15463f", "#1c5448", "#0c2a30", "#22604f"];
    let i = 0;
    while (i < N){
      const a = rnd(0, TAU), r = R*rnd(.83, .99), cx = C.x + Math.cos(a)*r, cz = C.z + Math.sin(a)*r;
      if (cz < -2) continue;
      const n = 4 + Math.floor(Math.random()*6);
      for (let k = 0; k < n && i < N; k++, i++){
        const x = cx + rnd(-.25, .25), zz = cz + rnd(-.25, .25); const y = hy(x, zz); if (y < -90){ k--; i--; continue; }
        e.set(rnd(-.45, .45), rnd(0, TAU), rnd(-.45, .45)); q.setFromEuler(e); const h = rnd(.35, 1.1);
        m4.compose(V3(x, y - .05, zz), q, s.set(1, h, 1)); grass.setMatrixAt(i, m4); grass.setColorAt(i, c.set(pick(GC)));
      }
    }
    g.add(grass);
    // a few short sparse tufts on the lawn
    const M = 260, tuft = new THREE.InstancedMesh(blade, TM("#1b5652"), M);
    for (let k = 0; k < M; k++){ let x, zz; do { const a = rnd(0, TAU), r = R*Math.sqrt(Math.random())*.8; x = C.x + Math.cos(a)*r; zz = C.z + Math.sin(a)*r; } while (Math.hypot(x, zz) < 1.8 || (Math.abs(x) < 1.6 && zz < 0));
      e.set(rnd(-.3, .3), rnd(0, TAU), rnd(-.3, .3)); q.setFromEuler(e); m4.compose(V3(x, hy(x, zz) - .03, zz), q, s.set(1, rnd(.15, .3), 1)); tuft.setMatrixAt(k, m4); }
    g.add(tuft);
    z.city = city(g, {x0:-120, x1:120, z0:14, z1:200, y:-24, sp:9, hmin:9, hmax:24, tall:.08, cars:120, lampSize:2.2, muted:true});
    z.flies = motes(g, 60, 0, 6, 16, 22, 5, 14, 0xffc860, .5, .9);
    z.flyBase = z.flies.geometry.attributes.position.array.slice();
  },
  update(t, dt, z){ z.city.update(t, dt);
    const a = z.flies.geometry.attributes.position, b = z.flyBase;
    for (let i = 0; i < a.count; i++){ a.setXYZ(i, b[i*3] + Math.sin(t*.4 + i)*.8, b[i*3+1] + Math.sin(t*.6 + i*1.7)*.5, b[i*3+2] + Math.cos(t*.35 + i)*.8); }
    a.needsUpdate = true; z.flies.material.opacity = .65 + .3*Math.sin(t*1.7); }
});

/* 1 · PERFIL — walking down a night street under the moon */
zone({
  sky:["#0a0c2e", "#6a2c8c", "#1a1236"], sunDir:[-.2, .12, -1], sunCol:"#c070d0", sunK:.3, fog:["#3e2a6c", 45, 210], stars:1,
  hemi:["#b4b4f0", "#221a40", 1.0], light:{pos:[-25, 30, -20], color:"#e8e0ff", i:.5}, tint:0xefeaff,
  pose:"walk", hip:[0, HIP_H, 0], shadow:true, sprite:{robot:{mode:"walk"}, base:[0, 0, 0]},
  cam:{p:[0, 1.45, 5.4], l:[0, 1.15, -10]}, entry:{p:[-2, .6, 3.5], l:[0, .3, 0]}, sway:.05,
  build(g, z){
    // he walks toward the camera; the street recedes behind him at exactly his stride speed, so planted feet never slide
    const L = 240, Z0 = -222, Z1 = 18, SPD = -RG.WALK_V;
    const road = new THREE.Mesh(new THREE.PlaneGeometry(15, L), TM("#3a3e5e")); road.rotation.x = -Math.PI/2; road.position.set(0, 0, (Z0 + Z1)/2); g.add(road);
    const lineM = new THREE.MeshBasicMaterial({color:0xe8b545});
    for (const sd of [-1, 1]){
      const ln = new THREE.Mesh(new THREE.BoxGeometry(.16, .02, L), lineM); ln.position.set(sd*6.1, .012, (Z0 + Z1)/2); g.add(ln);
      box(g, 2.2, .2, L, "#4b4570", sd*8.6, .1, (Z0 + Z1)/2); box(g, .22, .22, L, "#7c76b0", sd*7.5, .11, (Z0 + Z1)/2);
      let zc = Z1;
      while (zc > Z0){ const w = rnd(7.5, 11.5), d = 9, h = rnd(10, 16.5);
        mover(z, chunkyBuilding(g, w, h, d, sd*(9.7 + d/2), zc - w/2, sd < 0 ? Math.PI/2 : -Math.PI/2), "z", SPD, Z0, Z1); zc -= w + rnd(.1, .5); }
      for (let zz = Z1 - 8; zz > Z0; zz -= 22) mover(z, lamp(g, sd*7.9, zz, sd < 0 ? 0 : Math.PI), "z", SPD, Z0, Z1);
      for (let zz = Z1 - 14; zz > Z0; zz -= rnd(14, 30)) mover(z, hydrant(g, sd*8.2, zz), "z", SPD, Z0, Z1);
    }
    const dashM = new THREE.MeshBasicMaterial({color:0xf2eeff});
    for (let zz = Z1; zz > Z0; zz -= 5){ const d = new THREE.Mesh(new THREE.BoxGeometry(.2, .02, 2.2), dashM); d.position.set(0, .014, zz); g.add(d); mover(z, d, "z", SPD, Z0, Z1); }
    const moon = new THREE.Mesh(new THREE.CircleGeometry(11, 48), new THREE.MeshBasicMaterial({color:0xfbf6ee, fog:false})); moon.position.set(-24, 30, -150); g.add(moon);
    glow(g, 0xffffff, 55, -24, 30, -151, .35);
    z.dust = motes(g, 90, 0, 6, -30, 14, 6, 40, 0xffd9a0, .14, .6);
  },
  update(){}
});

/* 2 · HABILIDADES — flying up through a calm violet sky */
const BADGES = [["JS","#e8c83a",-9.5,5.2,-9],["Java","#e07b3c",-12,-1.5,-12],["C#","#8a6cd8",6.5,6.2,-12],["Python","#3f7fc0",-5.5,-4.2,-7],["React","#4fb8d8",11,-3.5,-14],["Node","#5fae45",-15,3.5,-16],[".NET","#6a52d0",2.2,-5.5,-10]];
zone({
  sky:["#240c46", "#6d2c8e", "#221044"], sunDir:[.3, .25, -1], sunCol:"#a050c0", sunK:.25, fog:["#3a1a60", 25, 120], stars:.35,
  hemi:["#e6d8ff", "#2e1e52", 1.05], light:{pos:[10, 40, 30], color:"#ffffff", i:.55}, tint:0xf6f0ff,
  pose:"fly", hip:[-.4, .5, 0], shadow:false, sprite:{robot:{mode:"fly", yaw:Math.PI/2, pitch:74*Math.PI/180, scale:1.5}, base:[-.5, .9, 0]},
  cam:{p:[.3, .75, 8.4], l:[.3, .6, 0]}, entry:{p:[-5, 3.5, 3], l:[-1.5, .8, 0]}, sway:.18,
  build(g, z){
    const cg = new THREE.Group(); g.add(cg); z.cityG = cg;
    z.city = city(cg, {x0:-170, x1:170, z0:-220, z1:40, y:-48, sp:11, hmin:8, hmax:24, tall:.06, cars:50, lampSize:2.4, muted:true});
    const soft = new THREE.IcosahedronGeometry(1, 2);
    const puff = (x, y, zz, sc, n) => { const c = new THREE.Group(); c.position.set(x, y, zz); g.add(c);
      for (let k = 0; k < n; k++){ const b = new THREE.Mesh(soft, TM(k % 3 ? "#efe8ff" : "#ddd2f6")); const r = rnd(.5, 1); b.scale.set(r, r*.85, r); b.position.set((k - n/2)*.55 + rnd(-.2, .2), rnd(-.15, .35), rnd(-.3, .3)); c.add(b); }
      c.scale.setScalar(sc); return c; };
    [[-17, 1.5, -6, 1.1], [16, -4.5, -9, 1.3]].forEach(([x, y, zz, sc]) => mover(z, puff(x, y, zz, sc, 7), "x", -1.2, -26, 26));
    z.badges = BADGES.map(([n, col, x, y, zz], i) => {
      const geo = new THREE.ExtrudeGeometry(rrShape(1.5, 1.5, .3), {depth:.26, bevelEnabled:true, bevelThickness:.06, bevelSize:.06, bevelSegments:3, curveSegments:8});
      const tex = labelTex(n, col, "#1c1430", 256, 256); tex.repeat.set(1/1.62, 1/1.62); tex.offset.set(.5, .5);
      const m = new THREE.Mesh(geo, [new THREE.MeshToonMaterial({map:tex, gradientMap:GRAD}), TM(new THREE.Color(col).multiplyScalar(.75).getStyle())]);
      m.position.set(x, y, zz); m.scale.setScalar(.95); m.userData = {y, ph:rnd(0, TAU), r:rnd(-.4, .4)}; g.add(m); mover(z, m, "x", -.6, -24, 24); return m;
    });
  },
  update(t, dt, z){
    z.city.update(t, dt); z.cityG.position.x = Math.sin(t*.03)*20;
    z.badges.forEach(b => { b.position.y = b.userData.y + Math.sin(t*.7 + b.userData.ph)*.35; b.rotation.y = b.userData.r + Math.sin(t*.4 + b.userData.ph)*.3; b.rotation.x = Math.sin(t*.5 + b.userData.ph)*.1; });
    const hp = z.hero.group.position; hp.y = .9 + Math.sin(t*1.2)*.16;
  }
});

/* 3 · EXPERIÊNCIA — a vintage roadster parked at each job's sign; it drives to the next one */
const SIGN_GAP = 18;
/* custom cruiser built from the side/top/front blueprint: 2365 long, 1665 wheelbase, 1230 tall, 930 at the levers (mm) */
function buildCruiser(){
  const bike = new THREE.Group();
  const PAINT = "#1b1d33", PAINT_HI = "#2c3058", CHROME = "#e6e8f0", STEEL = "#9a9aac", BLACK = "#141320", LEATHER = "#2a1e1c";
  const FX = .832, RX = -.833, FR = .34, RR = .33;
  const tube = (pts, r, col, seg) => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => V3(...p))), seg || 24, r, 8, false), TM(col)); bike.add(m); return m; };
  const rod = (a, b, r, col) => { const A = V3(...a), B = V3(...b), d = B.clone().sub(A), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 10), TM(col));
    m.position.copy(A).add(B).multiplyScalar(.5); m.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize()); bike.add(m); return m; };
  // spoked wheels
  const wheels = [];
  const wheel = (x, R, tireW, spokes) => { const w = new THREE.Group(); w.position.set(x, R, 0); bike.add(w); wheels.push(w);
    w.add(new THREE.Mesh(new THREE.TorusGeometry(R - tireW*.55, tireW*.55, 12, 36), TM(BLACK)));
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R - tireW*1.15, .014, 6, 36), TM(CHROME)); w.add(rim);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, .12, 14), TM(CHROME)); hub.rotation.x = Math.PI/2; w.add(hub);
    for (let k = 0; k < spokes; k++){ const a = k/spokes*TAU, side = k % 2 ? .04 : -.04, len = R - tireW*1.15;
      const sp = new THREE.Mesh(new THREE.CylinderGeometry(.004, .004, len, 4), TM(STEEL)); sp.position.set(Math.cos(a)*len/2, Math.sin(a)*len/2, side*.5); sp.rotation.z = a - Math.PI/2; w.add(sp); }
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(R*.42, R*.42, .01, 24), TM(STEEL)); disc.rotation.x = Math.PI/2; disc.position.z = .07; w.add(disc); return w; };
  wheel(FX, FR, .09, 40); wheel(RX, RR, .14, 40);
  // raked front fork, triple tree, headlight, bars, mirrors
  const top = [.43, 1.0], bot = [FX, FR];
  for (const z of [-.11, .11]){ rod([bot[0], bot[1], z], [top[0], top[1], z], .022, CHROME); rod([bot[0] + .02, bot[1] + .02, z], [bot[0] - .1, bot[1] + .18, z], .03, STEEL); }
  box(bike, .12, .05, .3, CHROME, .44, .99, 0); box(bike, .12, .05, .3, CHROME, .47, .92, 0);
  const hl = new THREE.Mesh(new THREE.SphereGeometry(.1, 18, 12, 0, TAU, 0, Math.PI*.6), TM(CHROME)); hl.rotation.z = -Math.PI/2; hl.position.set(.57, .9, 0); bike.add(hl);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(.088, 22), new THREE.MeshBasicMaterial({color:0xfff4d0})); lens.rotation.y = Math.PI/2; lens.position.set(.63, .9, 0); bike.add(lens);
  glow(bike, 0xfff0c8, 1.3, .7, .9, 0, .55);
  for (const sd of [-1, 1]){ const t = new THREE.Mesh(new THREE.SphereGeometry(.03, 10, 8), TM(CHROME)); t.position.set(.6, .83, sd*.15); bike.add(t); glow(bike, 0xffb040, .35, .62, .83, sd*.15, .7); }
  tube([[.4, 1.04, 0], [.4, 1.12, .08], [.33, 1.19, .26], [.24, 1.21, .42], [.2, 1.2, .46]], .014, CHROME);
  tube([[.4, 1.04, 0], [.4, 1.12, -.08], [.33, 1.19, -.26], [.24, 1.21, -.42], [.2, 1.2, -.46]], .014, CHROME);
  for (const sd of [-1, 1]){ rod([.22, 1.2, sd*.4], [.18, 1.2, sd*.5], .02, BLACK); rod([.26, 1.2, sd*.34], [.29, 1.27, sd*.36], .006, CHROME);
    const m = new THREE.Mesh(new THREE.SphereGeometry(.035, 10, 8), TM(CHROME)); m.scale.set(.5, 1, 1.4); m.position.set(.29, 1.285, sd*.37); bike.add(m); }
  // frame
  tube([[.42, .96, 0], [.2, .86, 0], [-.2, .8, 0], [-.55, .76, 0], [-.8, .72, 0]], .022, BLACK);
  tube([[.43, .94, 0], [.38, .6, 0], [.3, .24, 0], [.05, .2, 0], [-.18, .26, 0]], .022, BLACK);
  for (const z of [-.12, .12]){ rod([-.18, .28, z], [RX, RR, z], .02, BLACK); rod([RX + .08, RR + .03, z], [-.6, .74, z], .026, CHROME); }
  // teardrop tank with a pinstripe
  const tank = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), TM(PAINT)); tank.scale.set(.3, .11, .15); tank.position.set(.22, .9, 0); tank.rotation.z = -.1; bike.add(tank);
  const stripe = new THREE.Mesh(new THREE.TorusGeometry(.2, .006, 6, 40, Math.PI), TM("#d4a04a")); stripe.scale.set(1.3, .35, 1); stripe.position.set(.22, .9, .148); bike.add(stripe);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .015, 12), TM(CHROME)); cap.position.set(.28, 1.0, 0); bike.add(cap);
  // stepped seat, passenger pad, sissy bar
  const seat = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), TM(LEATHER)); seat.scale.set(.25, .05, .17); seat.position.set(-.24, .79, 0); bike.add(seat);
  const pad = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), TM(LEATHER)); pad.scale.set(.17, .045, .14); pad.position.set(-.58, .83, 0); bike.add(pad);
  tube([[-.78, .76, -.12], [-.82, 1.02, -.1], [-.82, 1.1, 0], [-.82, 1.02, .1], [-.78, .76, .12]], .012, CHROME);
  box(bike, .05, .14, .2, LEATHER, -.8, 1.0, 0);
  // fenders
  const rf = new THREE.Mesh(new THREE.CylinderGeometry(RR + .05, RR + .05, .22, 28, 1, true, Math.PI*.5, Math.PI*1.1), TM(PAINT)); rf.rotation.x = Math.PI/2; rf.rotation.y = 0; rf.position.set(RX, RR, 0); bike.add(rf);
  rf.material = new THREE.MeshToonMaterial({color:new THREE.Color(PAINT), gradientMap:GRAD, side:THREE.DoubleSide});
  const ff = new THREE.Mesh(new THREE.CylinderGeometry(FR + .04, FR + .04, .14, 24, 1, true, Math.PI*.6, Math.PI*.65), new THREE.MeshToonMaterial({color:new THREE.Color(PAINT), gradientMap:GRAD, side:THREE.DoubleSide})); ff.rotation.x = Math.PI/2; ff.position.set(FX, FR, 0); bike.add(ff);
  const tl = new THREE.Mesh(new THREE.BoxGeometry(.05, .04, .08), new THREE.MeshBasicMaterial({color:0xff3040})); tl.position.set(-1.12, .62, 0); bike.add(tl); glow(bike, 0xff3a4a, .5, -1.16, .62, 0, .6);
  box(bike, .06, .1, .16, BLACK, -1.1, .55, 0);
  // V-twin: crankcase, finned cylinders, heads, air cleaner, primary cover
  box(bike, .38, .2, .22, STEEL, .1, .34, 0);
  const cyl2 = (x, ang) => { const g = new THREE.Group(); g.position.set(x, .44, 0); g.rotation.z = ang; bike.add(g);
    for (let k = 0; k < 9; k++){ const f = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, .014, 16), TM(k % 2 ? "#b8b8c6" : "#8e8ea0")); f.position.y = .03 + k*.028; g.add(f); }
    box(g, .15, .07, .15, "#c9c9d6", 0, .3, 0); box(g, .08, .03, .16, CHROME, 0, .345, 0); return g; };
  cyl2(.2, -.38); cyl2(-.01, .38);
  const ac = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, .05, 24), TM(CHROME)); ac.rotation.x = Math.PI/2; ac.position.set(.1, .6, .16); bike.add(ac);
  const pc = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .05, 22), TM("#6a6a7c")); pc.rotation.x = Math.PI/2; pc.scale.set(1.5, 1, 1); pc.position.set(-.12, .36, -.14); bike.add(pc);
  // dual exhaust (right side)
  tube([[.26, .6, .1], [.36, .42, .16], [.26, .26, .2], [-.3, .25, .21], [-.95, .3, .21]], .03, CHROME, 40);
  tube([[.0, .62, .1], [.06, .44, .15], [0, .33, .19], [-.4, .34, .2], [-.98, .38, .2]], .03, CHROME, 40);
  for (const y of [.3, .38]){ const tip = new THREE.Mesh(new THREE.CylinderGeometry(.038, .034, .12, 14), TM(CHROME)); tip.rotation.z = Math.PI/2; tip.position.set(-1.0, y, .21 - (y > .33 ? .01 : 0)); bike.add(tip); }
  // forward controls
  for (const sd of [-1, 1]){ rod([.36, .42, sd*.14], [.48, .42, sd*.24], .012, CHROME); rod([.44, .42, sd*.24], [.52, .42, sd*.24], .02, BLACK); }
  bike.userData.wheels = wheels; bike.userData.radius = [FR, RR];
  return bike;
}

function signBoard(g, x, job){
  const sg = new THREE.Group(); sg.position.set(x, 0, -5.4); g.add(sg);
  cyl(sg, .08, .1, 3.6, "#eee8f6", 0, 1.8, 0, 10); box(sg, 2.1, .09, .09, "#eee8f6", 1.0, 3.5, 0); cyl(sg, .18, .22, .2, "#d8d0ea", 0, .1, 0, 10);
  const c = document.createElement("canvas"); c.width = 512; c.height = 320; const tex = new THREE.CanvasTexture(c); tex.anisotropy = ANISO;
  const board = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.45, .1), [TM("#3a2f28"), TM("#3a2f28"), TM("#3a2f28"), TM("#3a2f28"), new THREE.MeshToonMaterial({map:tex, gradientMap:GRAD, emissive:new THREE.Color(0x3a3a3a), emissiveMap:tex}), TM("#3a2f28")]);
  board.position.set(1.35, 2.55, 0); sg.add(board);
  [.4, 2.3].forEach(xx => cyl(sg, .012, .012, .25, "#8a8098", xx, 3.35, 0, 4));
  sg.userData = {c, tex}; return sg;
}
function paintSign(sg, job){
  const g = sg.userData.c.getContext("2d");
  g.fillStyle = "#f1e9df"; g.fillRect(0, 0, 512, 320); g.fillStyle = "rgba(120,90,70,.08)"; for (let i = 0; i < 40; i++) g.fillRect(Math.random()*512, Math.random()*320, 60, 2);
  g.strokeStyle = "#3a2f28"; g.lineWidth = 10; g.strokeRect(12, 12, 488, 296);
  g.fillStyle = "#2a2230"; g.textAlign = "center"; g.textBaseline = "middle";
  const words = job.n.split(" "); let fs = 112; g.font = "800 " + fs + "px 'Big Shoulders Display','Arial Narrow',Arial";
  const lines = words.length > 1 && g.measureText(job.n).width > 440 ? [words.slice(0, Math.ceil(words.length/2)).join(" "), words.slice(Math.ceil(words.length/2)).join(" ")] : [job.n];
  while (lines.some(l => g.measureText(l).width > 440) && fs > 30){ fs -= 6; g.font = "800 " + fs + "px 'Big Shoulders Display','Arial Narrow',Arial"; }
  lines.forEach((l, i) => g.fillText(l, 256, 140 + (i - (lines.length - 1)/2)*fs*.92));
  g.font = "500 24px 'IBM Plex Mono', monospace"; g.fillStyle = "#6a5a50"; g.fillText(job.d.split(" · ")[0], 256, 262);
  sg.userData.tex.needsUpdate = true;
}
/* sculpted car hull: lofted superellipse sections along x */
const HULL = (() => {
  const FW = 1.45, RW = -1.42, AR = .45, WY = .36;
  const cr = (pts, x) => { // monotone-ish Catmull-Rom through [x,y] keys (x descending order not required)
    const P = pts.slice().sort((a, b) => a[0] - b[0]); if (x <= P[0][0]) return P[0][1]; if (x >= P[P.length - 1][0]) return P[P.length - 1][1];
    let i = 0; while (x > P[i + 1][0]) i++;
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)], t = (x - p1[0])/(p2[0] - p1[0]);
    const m1 = (p2[1] - p0[1])/(p2[0] - p0[0])*(p2[0] - p1[0]), m2 = (p3[1] - p1[1])/(p3[0] - p1[0])*(p2[0] - p1[0]);
    const t2 = t*t, t3 = t2*t; return (2*t3 - 3*t2 + 1)*p1[1] + (t3 - 2*t2 + t)*m1 + (-2*t3 + 3*t2)*p2[1] + (t3 - t2)*m2;
  };
  const TOP = [[2.36, .44], [2.2, .58], [2.0, .7], [1.7, .8], [1.45, .86], [1.15, .85], [.8, .84], [.55, .84], [.2, .8], [-.4, .79], [-.85, .84], [-1.2, .93], [-1.45, .96], [-1.75, .95], [-2.05, .9], [-2.25, .82], [-2.36, .66]];
  const BOT = [[2.36, .26], [2.2, .22], [-2.2, .22], [-2.36, .3]];
  const bump = (x, c, w) => { const d = (x - c)/w; return Math.abs(d) < 1 ? .5 + .5*Math.cos(d*Math.PI) : 0; };
  const sst = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a)/(b - a))); return t*t*(3 - 2*t); };
  const top = x => cr(TOP, x);
  const bot = x => { let b = cr(BOT, x); for (const W of [FW, RW]){ const d = x - W; if (Math.abs(d) < AR) b = Math.max(b, WY + Math.sqrt(AR*AR - d*d)); } return Math.min(b, top(x) - .07); };
  const hw = x => (.84 + .09*bump(x, FW, .75) + .1*bump(x, RW, .8)) * (1 - .3*sst(1.85, 2.38, x)) * (1 - .1*sst(-1.95, -2.38, x));
  function geometry(NX, NS){
    NX = NX || 90; NS = NS || 36; const x0 = -2.36, x1 = 2.36, pos = [], idx = [];
    for (let i = 0; i <= NX; i++){
      const x = x0 + (x1 - x0)*i/NX, t = top(x), b = bot(x), w = hw(x), mid = b + (t - b)*.42;
      for (let j = 0; j < NS; j++){
        const a = j/NS*Math.PI*2, c = Math.cos(a), s = Math.sin(a);
        const up = s >= 0, ex = up ? 2.6 : 5, ry = up ? t - mid : mid - b;
        const zz = Math.sign(c)*Math.pow(Math.abs(c), 2/ex)*w*(up ? 1 - .12*s*s : 1), yy = mid + Math.sign(s)*Math.pow(Math.abs(s), 2/ex)*ry;
        pos.push(x, yy, zz);
      }
    }
    for (let i = 0; i < NX; i++) for (let j = 0; j < NS; j++){ const a = i*NS + j, b2 = i*NS + (j + 1)%NS, c = (i + 1)*NS + j, d = (i + 1)*NS + (j + 1)%NS; idx.push(a, c, b2, b2, c, d); }
    const cap = (ring, x, flip) => { const ci = pos.length/3, t = top(x), b = bot(x); pos.push(x, b + (t - b)*.45, 0);
      for (let j = 0; j < NS; j++){ const a = ring*NS + j, b2 = ring*NS + (j + 1)%NS; flip ? idx.push(ci, b2, a) : idx.push(ci, a, b2); } };
    cap(0, x0, false); cap(NX, x1, true);
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  return {top, bot, hw, geometry, FW, RW, WY};
})();

function buildSportsCar(){
  const car = new THREE.Group(), H = HULL;
  const RED = "#d3202a", BLACK = "#15141e", CARBON = "#23222e";
  const ext = (shape, depth, bevel, seg) => { const g = new THREE.ExtrudeGeometry(shape, {depth, bevelEnabled:true, bevelThickness:bevel, bevelSize:bevel, bevelSegments:seg || 5, curveSegments:28}); g.translate(0, 0, -depth/2); return g; };
  const body = new THREE.Mesh(H.geometry(110, 40), new THREE.MeshToonMaterial({color:new THREE.Color(RED), gradientMap:GRAD, emissive:new THREE.Color(0x2a0306)})); car.add(body);
  const side = x => H.hw(x) + .004;
  for (const sd of [-1, 1]){
    // rocker, door cut, side intake, mirror
    box(car, 2.0, .07, .04, BLACK, -.02, .27, sd*(side(0) - .03));
    box(car, .02, .34, .02, "#8e141c", .28, .55, sd*side(.28));
    box(car, 1.3, .015, .02, "#8e141c", -.3, .62, sd*side(-.3));
    const intake = new THREE.Shape(); intake.moveTo(0, 0); intake.lineTo(.6, .06); intake.lineTo(.62, .26); intake.quadraticCurveTo(.22, .24, 0, .09); intake.closePath();
    const im = new THREE.Mesh(ext(intake, .03, .012, 2), TM(BLACK)); im.position.set(-1.0, .4, sd*(side(-.7) - .005)); car.add(im);
    const mir = new THREE.Group(); mir.position.set(.4, H.top(.4) + .1, sd*(side(.4) - .04)); car.add(mir);
    box(mir, .04, .03, .14, BLACK, 0, -.04, -sd*.03); const cap = new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 8), TM(RED)); cap.scale.set(1.3, .8, 1); cap.position.z = sd*.05; mir.add(cap);
  }
  // windshield with black frame, wraps down to the cowl
  const ws = new THREE.Group(); ws.position.set(.56, H.top(.56) - .01, 0); ws.rotation.z = .92; car.add(ws);
  box(ws, .03, .5, 1.42, BLACK, 0, .25, 0); box(ws, .04, .5, .04, BLACK, 0, .25, .7); box(ws, .04, .5, .04, BLACK, 0, .25, -.7);
  ws.add(new THREE.Mesh(new THREE.BoxGeometry(.02, .45, 1.34), new THREE.MeshBasicMaterial({color:0x9fb8e8, transparent:true, opacity:.28})).translateY(.25).translateX(.02));
  // roll humps flowing into the rear deck
  for (const zz of [-.38, .38]){ const h = new THREE.Shape(); h.moveTo(0, 0); h.quadraticCurveTo(.08, .3, -.32, .3); h.quadraticCurveTo(-.95, .26, -1.15, 0); h.closePath();
    const hm = new THREE.Mesh(ext(h, .38, .07), TM(RED)); hm.position.set(-.84, H.top(-.84) - .03, zz); car.add(hm); box(car, .03, .2, .28, BLACK, -.96, H.top(-.96) + .16, zz); }
  // engine cover louvres between the humps
  for (let k = 0; k < 5; k++) box(car, .05, .015, .5, BLACK, -1.3 - k*.12, H.top(-1.3 - k*.12) + .01, 0);
  // cockpit
  box(car, .52, .1, .46, CARBON, -.45, .83, .34); box(car, .52, .1, .46, CARBON, -.45, .83, -.34);
  box(car, .1, .46, .42, CARBON, -.74, 1.03, .34).rotation.z = .28; box(car, .1, .46, .42, CARBON, -.74, 1.03, -.34).rotation.z = .28;
  box(car, .26, .08, 1.36, CARBON, .32, .9, 0);
  const sw = new THREE.Mesh(new THREE.TorusGeometry(.15, .025, 6, 22), TM(BLACK)); sw.position.set(.1, 1.0, .34); sw.rotation.set(-.45, Math.PI/2, 0); car.add(sw);
  // hood: vents and shut lines
  for (const zz of [-.34, .34]) for (let k = 0; k < 3; k++) box(car, .32, .012, .035, BLACK, 1.2, H.top(1.2) + .004, zz + (k - 1)*.065).rotation.z = -.12;
  box(car, .015, .012, 1.2, "#8e141c", .78, H.top(.78) + .004, 0);
  // headlights, splitter, grille, front intakes
  for (const sd of [-1, 1]){
    const hl = new THREE.Mesh(new THREE.BoxGeometry(.46, .06, .26), TM(BLACK)); hl.position.set(2.0, H.top(2.0) - .06, sd*.52); hl.rotation.set(sd*.3, sd*.25, -.35); car.add(hl);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(.38, .02, .06), new THREE.MeshBasicMaterial({color:0xf4f7ff})); strip.position.set(2.02, H.top(2.0) - .045, sd*.58); strip.rotation.copy(hl.rotation); car.add(strip);
    glow(car, 0xe8f0ff, .8, 2.3, H.top(2.0) - .08, sd*.56, .55);
    box(car, .06, .12, .34, BLACK, 2.34, .34, sd*.5);
  }
  box(car, .26, .04, 1.62, BLACK, 2.3, .23, 0); box(car, .05, .1, .56, BLACK, 2.37, .36, 0);
  // tail: round lamps, diffuser fins, quad exhaust
  for (const sd of [-1, 1]) for (const k of [.36, .6]){ const l = new THREE.Mesh(new THREE.CylinderGeometry(.085, .085, .05, 20), new THREE.MeshBasicMaterial({color:0xff3040})); l.rotation.z = Math.PI/2; l.position.set(-2.37, .56, sd*k); car.add(l);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.09, .012, 6, 20), TM(BLACK)); ring.rotation.y = Math.PI/2; ring.position.set(-2.39, .56, sd*k); car.add(ring); glow(car, 0xff3a4a, .45, -2.44, .56, sd*k, .55); }
  box(car, .22, .12, 1.5, BLACK, -2.3, .3, 0); for (let k = -3; k <= 3; k++) box(car, .3, .1, .02, "#2e2d3a", -2.32, .26, k*.2);
  for (const zz of [-.3, -.18, .18, .3]) cyl(car, .042, .048, .14, "#a09eb0", -2.42, .34, zz, 10).rotation.z = Math.PI/2;
  // wheels: low-profile tyre, 5-spoke rim, yellow caliper, dark barrel
  const wheels = [];
  for (const [wx, wz] of [[H.FW, .8], [H.RW, .8], [H.FW, -.8], [H.RW, -.8]]){
    const w = new THREE.Group(); w.position.set(wx, H.WY, wz); car.add(w); wheels.push(w);
    w.add(new THREE.Mesh(new THREE.TorusGeometry(.29, .07, 12, 32), TM("#17161f")));
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.23, .23, .2, 26, 1, true), TM("#2a2936")); barrel.rotation.x = Math.PI/2; w.add(barrel);
    const face = wz > 0 ? .08 : -.08;
    box(w, .15, .11, .06, "#f2c230", .1, .11, face*.3);
    for (let k = 0; k < 5; k++){ const s = box(w, .24, .05, .03, "#cfd1da", 0, 0, face); s.geometry.translate(.11, 0, 0); s.rotation.z = k/5*TAU; const s2 = box(w, .2, .03, .031, "#9fa1ae", 0, 0, face*1.02); s2.geometry.translate(.1, .018, 0); s2.rotation.z = k/5*TAU; }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, .05, 12), TM("#cfd1da")); hub.rotation.x = Math.PI/2; hub.position.z = face; w.add(hub);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(.23, .015, 6, 30), TM("#cfd1da")); lip.position.z = face; w.add(lip);
  }
  // wheel-well shadows so the arches read as openings
  for (const W of [H.FW, H.RW]) for (const sd of [-1, 1]){ const well = new THREE.Mesh(new THREE.CircleGeometry(.43, 28, 0, Math.PI), new THREE.MeshBasicMaterial({color:0x0c0b14})); well.position.set(W, H.WY, sd*.55); if (sd < 0) well.rotation.y = Math.PI; car.add(well); }
  car.userData.wheels = wheels;
  return car;
}
function signBoard(g, x, job){
  const sg = new THREE.Group(); sg.position.set(x, 0, -5.4); g.add(sg);
  cyl(sg, .08, .1, 3.6, "#eee8f6", 0, 1.8, 0, 10); box(sg, 2.1, .09, .09, "#eee8f6", 1.0, 3.5, 0); cyl(sg, .18, .22, .2, "#d8d0ea", 0, .1, 0, 10);
  const c = document.createElement("canvas"); c.width = 512; c.height = 320; const tex = new THREE.CanvasTexture(c); tex.anisotropy = ANISO;
  const board = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.45, .1), [TM("#3a2f28"), TM("#3a2f28"), TM("#3a2f28"), TM("#3a2f28"), new THREE.MeshToonMaterial({map:tex, gradientMap:GRAD, emissive:new THREE.Color(0x3a3a3a), emissiveMap:tex}), TM("#3a2f28")]);
  board.position.set(1.35, 2.55, 0); sg.add(board);
  [.4, 2.3].forEach(xx => cyl(sg, .012, .012, .25, "#8a8098", xx, 3.35, 0, 4));
  sg.userData = {c, tex}; return sg;
}
function paintSign(sg, job){
  const g = sg.userData.c.getContext("2d");
  g.fillStyle = "#f1e9df"; g.fillRect(0, 0, 512, 320); g.fillStyle = "rgba(120,90,70,.08)"; for (let i = 0; i < 40; i++) g.fillRect(Math.random()*512, Math.random()*320, 60, 2);
  g.strokeStyle = "#3a2f28"; g.lineWidth = 10; g.strokeRect(12, 12, 488, 296);
  g.fillStyle = "#2a2230"; g.textAlign = "center"; g.textBaseline = "middle";
  const words = job.n.split(" "); let fs = 112; g.font = "800 " + fs + "px 'Big Shoulders Display','Arial Narrow',Arial";
  const lines = words.length > 1 && g.measureText(job.n).width > 440 ? [words.slice(0, Math.ceil(words.length/2)).join(" "), words.slice(Math.ceil(words.length/2)).join(" ")] : [job.n];
  while (lines.some(l => g.measureText(l).width > 440) && fs > 30){ fs -= 6; g.font = "800 " + fs + "px 'Big Shoulders Display','Arial Narrow',Arial"; }
  lines.forEach((l, i) => g.fillText(l, 256, 140 + (i - (lines.length - 1)/2)*fs*.92));
  g.font = "500 24px 'IBM Plex Mono', monospace"; g.fillStyle = "#6a5a50"; g.fillText(job.d.split(" · ")[0], 256, 262);
  sg.userData.tex.needsUpdate = true;
}
function buildSportsCar(){
  const car = new THREE.Group();
  const RED = "#d3202a", RED_SH = "#a8141d", BLACK = "#15141e", CARBON = "#23222e", CHROME = "#e8eaf0", GLASS = "#1d2440";
  const ext = (shape, depth, bevel, seg) => { const g = new THREE.ExtrudeGeometry(shape, {depth, bevelEnabled:true, bevelThickness:bevel, bevelSize:bevel, bevelSegments:seg || 5, curveSegments:28}); g.translate(0, 0, -depth/2); return g; };
  const FW = 1.45, RW = -1.42, R = .45;
  // wedge body with wheel arches cut into the profile
  const b = new THREE.Shape();
  b.moveTo(2.3, .3); b.lineTo(2.3, .44);
  b.quadraticCurveTo(2.25, .7, 1.9, .8); b.quadraticCurveTo(1.2, .9, .55, .88);   // nose → hood
  b.lineTo(.3, .86); b.quadraticCurveTo(-.4, .8, -.85, .84);                        // cockpit edge
  b.quadraticCurveTo(-1.5, .98, -2.05, .95); b.quadraticCurveTo(-2.32, .92, -2.33, .72); b.lineTo(-2.3, .32); // rear deck → tail
  b.lineTo(RW - .41, .3); b.absarc(RW, .36, .41, Math.PI + .15, -.15, true);
  b.lineTo(FW - .41, .3); b.absarc(FW, .36, .41, Math.PI + .15, -.15, true); b.lineTo(2.3, .3);
  const body = new THREE.Mesh(ext(b, 1.72, .12), TM(RED)); car.add(body);
  // darker lower sills and side intakes
  for (const sd of [-1, 1]){
    box(car, 1.6, .12, .06, BLACK, .0, .34, sd*.93);
    const intake = new THREE.Shape(); intake.moveTo(0, 0); intake.lineTo(.62, .08); intake.lineTo(.62, .3); intake.quadraticCurveTo(.2, .26, 0, .1); intake.closePath();
    const im = new THREE.Mesh(ext(intake, .04, .015, 2), TM(BLACK)); im.position.set(-.95, .42, sd*.92); car.add(im);
    box(car, .9, .02, .03, RED_SH, .45, .6, sd*.92).rotation.z = .05;
    const mir = new THREE.Group(); mir.position.set(.42, .98, sd*.86); car.add(mir); box(mir, .05, .03, .16, RED, 0, 0, sd*-.06); box(mir, .12, .08, .07, RED, .02, .03, sd*.03);
  }
  // raked windshield with black frame
  const ws = new THREE.Group(); ws.position.set(.55, .86, 0); ws.rotation.z = .9; car.add(ws);
  box(ws, .03, .5, 1.5, BLACK, 0, .25, 0);
  ws.add(new THREE.Mesh(new THREE.BoxGeometry(.02, .46, 1.38), new THREE.MeshBasicMaterial({color:0x9fb8e8, transparent:true, opacity:.28})).translateY(.25).translateX(.02));
  // twin roll humps behind the seats
  for (const zz of [-.38, .38]){ const h = new THREE.Shape(); h.moveTo(0, 0); h.quadraticCurveTo(.1, .34, -.35, .34); h.quadraticCurveTo(-1.0, .3, -1.15, 0); h.closePath();
    const hm = new THREE.Mesh(ext(h, .42, .06), TM(RED)); hm.position.set(-.82, .84, zz); car.add(hm); box(car, .04, .22, .3, BLACK, -.95, 1.02, zz); }
  // cockpit: seats, wheel, dash
  box(car, .5, .12, .5, CARBON, -.45, .7, .34); box(car, .5, .12, .5, CARBON, -.45, .7, -.34);
  box(car, .12, .5, .44, CARBON, -.72, .95, .34).rotation.z = .25; box(car, .12, .5, .44, CARBON, -.72, .95, -.34).rotation.z = .25;
  box(car, .3, .1, 1.4, CARBON, .3, .88, 0);
  const sw = new THREE.Mesh(new THREE.TorusGeometry(.15, .025, 6, 22), TM(BLACK)); sw.position.set(.08, .98, .34); sw.rotation.set(-.45, Math.PI/2, 0); car.add(sw);
  // hood vents + slim headlights
  for (const zz of [-.35, .35]) for (let k = 0; k < 3; k++) box(car, .3, .015, .04, BLACK, 1.25 - k*.02, .79 + k*.003, zz + (k - 1)*.07).rotation.z = -.14;
  for (const sd of [-1, 1]){ const hl = new THREE.Mesh(new THREE.BoxGeometry(.42, .07, .3), TM(BLACK)); hl.position.set(2.0, .63, sd*.6); hl.rotation.set(sd*.25, 0, -.2); car.add(hl);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(.34, .025, .26), new THREE.MeshBasicMaterial({color:0xf4f7ff})); strip.position.set(2.04, .64, sd*.6); strip.rotation.copy(hl.rotation); car.add(strip); glow(car, 0xe8f0ff, .9, 2.28, .6, sd*.6, .6); }
  // front splitter + grille
  box(car, .2, .05, 1.8, BLACK, 2.28, .3, 0); box(car, .06, .16, 1.0, BLACK, 2.39, .4, 0);
  // tail: round lamps, diffuser, quad exhaust
  for (const sd of [-1, 1]) for (const k of [.38, .64]){ const l = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .05, 18), new THREE.MeshBasicMaterial({color:0xff3040})); l.rotation.z = Math.PI/2; l.position.set(-2.36, .78, sd*k); car.add(l); glow(car, 0xff3a4a, .5, -2.42, .78, sd*k, .6); }
  box(car, .2, .16, 1.6, BLACK, -2.3, .36, 0);
  for (const zz of [-.3, -.18, .18, .3]) cyl(car, .045, .05, .16, "#9a98aa", -2.42, .38, zz, 10).rotation.z = Math.PI/2;
  // wheels: low-profile tyre, 5-spoke rim, yellow caliper
  const wheels = [];
  for (const [wx, wz] of [[FW, .82], [RW, .82], [FW, -.82], [RW, -.82]]){
    const w = new THREE.Group(); w.position.set(wx, .36, wz); car.add(w); wheels.push(w);
    const tire = new THREE.Mesh(new THREE.TorusGeometry(.29, .07, 10, 30), TM("#17161f")); w.add(tire);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.23, .23, .2, 26, 1, true), TM("#2a2936")); barrel.rotation.x = Math.PI/2; w.add(barrel);
    const face = wz > 0 ? .08 : -.08;
    const cal = box(w, .16, .12, .06, "#f2c230", .12, .12, face*.3); void cal;
    for (let k = 0; k < 5; k++){ const s = box(w, .24, .055, .03, "#c9cbd4", 0, 0, face); s.geometry.translate(.11, 0, 0); s.rotation.z = k/5*TAU; }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .05, 12), TM("#c9cbd4")); hub.rotation.x = Math.PI/2; hub.position.z = face; w.add(hub);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(.23, .015, 6, 30), TM("#c9cbd4")); lip.position.z = face; w.add(lip);
  }
  car.userData.wheels = wheels;
  return car;
}
zone({
  sky:["#0b0f30", "#3a3f78", "#151837"], sunDir:[-.4, .12, -1], sunCol:"#8fb0ff", sunK:.3, fog:["#2f3468", 45, 170], stars:.8,
  hemi:["#c3c6ff", "#221c44", 1.05], light:{pos:[12, 30, 34], color:"#ffe6cc", i:.62}, tint:0xf1ecff,
  pose:"drive", hip:[-.5, .66, .34], shadow:false, sprite:{robot:{mode:"ride", yaw:Math.PI/2, grip:[new THREE.Vector3(-.44, .3, .44), new THREE.Vector3(.44, .3, .44)], peg:[new THREE.Vector3(-.2, -.58, .52), new THREE.Vector3(.2, -.58, .52)]}, base:[-.24, .9, 0]},
  cam:{p:[.15, 1.15, 6.6], l:[.15, 1.0, 0]}, entry:{p:[3, .5, 1.5], l:[1.5, 0, 0]}, sway:.05,
  build(g, z){
    const world = new THREE.Group(); g.add(world); z.world = world;
    const X0 = -40, X1 = SIGN_GAP*4 + 40, MID = (X0 + X1)/2, LEN = X1 - X0;
    const road = new THREE.Mesh(new THREE.PlaneGeometry(LEN, 9), TM("#34355a")); road.rotation.x = -Math.PI/2; road.position.x = MID; world.add(road);
    const lineM = new THREE.MeshBasicMaterial({color:0xe8b545}), dashM = new THREE.MeshBasicMaterial({color:0xf2eeff});
    [-.12, .12].forEach(zz => { const l = new THREE.Mesh(new THREE.BoxGeometry(LEN, .02, .1), lineM); l.position.set(MID, .012, zz - 1.2); world.add(l); });
    for (let x = X0; x < X1; x += 6){ const d = new THREE.Mesh(new THREE.BoxGeometry(2.6, .02, .14), dashM); d.position.set(x, .012, 3.2); world.add(d); }
    const swT = cvs(64, 64, (x) => { x.fillStyle = "#6a66a2"; x.fillRect(0, 0, 64, 64); x.fillStyle = "#5a5692"; x.fillRect(0, 0, 64, 2); x.fillRect(0, 0, 2, 64); }); swT.wrapS = swT.wrapT = THREE.RepeatWrapping; swT.repeat.set(LEN/1.6, 2);
    const sw = new THREE.Mesh(new THREE.BoxGeometry(LEN, .2, 3.6), new THREE.MeshToonMaterial({map:swT, gradientMap:GRAD})); sw.position.set(MID, .1, -6.3); world.add(sw);
    box(world, LEN, .22, .22, "#9d97d8", MID, .11, -4.5);
    const sw2 = sw.clone(); sw2.position.z = 6.4; world.add(sw2); box(world, LEN, .22, .22, "#9d97d8", MID, .11, 4.6);
    let xc = X0;
    while (xc < X1){ const w = rnd(9, 13); world.add(chunkyBuilding(world, w, rnd(9.5, 12.5), 9, xc + w/2, -8.1 - 4.5, 0)); xc += w + rnd(.1, .4); }
    for (let x = X0 + 6; x < X1; x += 20) lamp(world, x, -5.3, -Math.PI/2);
    for (let x = X0 + 11; x < X1; x += rnd(9, 16)){ const r = Math.random(); if (r < .4) hydrant(world, x, -5.1); else if (r < .7) planter(world, x, -7.5); else {
      const bench = new THREE.Group(); bench.position.set(x, .2, -7.2); world.add(bench); box(bench, 1.6, .08, .45, "#8a5a3c", 0, .38, 0); box(bench, 1.6, .35, .06, "#8a5a3c", 0, .62, -.2); box(bench, .06, .38, .4, "#2a2640", -.7, .19, 0); box(bench, .06, .38, .4, "#2a2640", .7, .19, 0); } }
    z.signs = JOBS.pt.map((j, i) => signBoard(world, -1.2 + i*SIGN_GAP, j)); repaintSigns();
    const car = buildCruiser(); car.position.set(0, 0, 1.6); g.add(car); z.car = car; z.wheels = car.userData.wheels; z.heroParent = car;
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.1), new THREE.MeshBasicMaterial({map:shadowTex, transparent:true, depthWrite:false})); sh.rotation.x = -Math.PI/2; sh.position.set(0, .02, 1.6); g.add(sh);
    z.off = 0; z.from = z.from; z.drive = null;
  },
  update(t, dt, z){
    let v = 0;
    if (z.drive){ const d = z.drive; d.t = Math.min(1, d.t + dt/d.dur); const e = d.t < .5 ? 2*d.t*d.t : 1 - Math.pow(-2*d.t + 2, 2)/2;
      const prevOff = z.off; z.off = d.a + (d.b - d.a)*e; v = (z.off - prevOff)/Math.max(dt, 1e-4); if (d.t >= 1) z.drive = null; }
    z.world.position.x = -z.off;
    z.wheels.forEach(w => w.rotation.z -= v*dt/.335);
    const acc = (v - (z.lastV || 0))/Math.max(dt, 1e-4); z.lastV = v;
    z.pitch = (z.pitch || 0) + ((-acc*.004) - (z.pitch || 0))*Math.min(1, dt*6);
    z.car.rotation.z = Math.max(-.03, Math.min(.03, z.pitch)); z.speed = v; z.acc = acc; z.car.position.y = Math.abs(v) > .2 ? Math.abs(Math.sin(t*16))*.01 : 0;
  }
});
function repaintSigns(){ const z = ZONES[3]; if (!z || !z.signs) return; z.signs.forEach((sg, i) => paintSign(sg, JOBS[lang][i])); }
function setJobSign(name, animate){
  const z = ZONES[3]; if (!z || !z.signs) return; void name;
  const target = jobI*SIGN_GAP;
  if (!animate || REDUCED){ z.off = target; z.drive = null; return; }
  if (Math.abs(target - z.off) < .01) return;
  z.drive = {a:z.off, b:target, t:0, dur:Math.min(3.2, 1.3 + Math.abs(target - z.off)*.045)};
}
