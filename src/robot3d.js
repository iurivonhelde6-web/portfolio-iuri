/* ================= ROBOT 3D =================
   A real 3D robot built from metal parts (PBR, reflecting each scene's own sky), posed every frame by a
   joint solver: pose functions return joint positions in the robot's local frame (metres, +x = robot's left,
   +y up, +z forward); every part is then placed between its two joints. Legs and arms use analytic 3D IK, so
   feet sit on the ground, hands reach the keyboard / handlebars / ledge. */
const ROBOT = (function(){
const PX = 1/RG.PPM, rad = Math.PI/180;
const {noise, fbm, hold, blinkAt, footWalk, smoother} = RG.motion;
const LEN = {thigh:212*PX, shin:204*PX, upper:162*PX, fore:146*PX, ankle:40*PX};
const v = (x, y, z) => new THREE.Vector3(x, y, z), P = (x, y, z) => v(x*PX, y*PX, z*PX);
const _x = v(0, 0, 0), _y = v(0, 0, 0), _z = v(0, 0, 0), _s = v(1, 1, 1), _t = v(0, 0, 0), _u = v(0, 0, 0);

/* ---------- 3D two-bone IK: root A, target T, pole direction → joint ---------- */
function ik3(A, T, l1, l2, pole){
  const d = _t.subVectors(T, A), dist = Math.min(d.length(), l1 + l2 - 1e-4), dir = d.clone().normalize();
  const a = (l1*l1 - l2*l2 + dist*dist)/(2*dist), h = Math.sqrt(Math.max(0, l1*l1 - a*a));
  const pp = pole.clone().addScaledVector(dir, -pole.dot(dir)).normalize();
  return {j:A.clone().addScaledVector(dir, a).addScaledVector(pp, h), e:A.clone().addScaledVector(dir, dist)};
}

/* ---------- materials (per scene, with that scene's sky as reflection) ---------- */
function envFor(z){
  const t = cvs(512, 256, (g, W, H) => {
    const hx = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), mx = (a, b, k) => { const A = hx(a), B = hx(b); return "rgb(" + A.map((q, i) => Math.round(q + (B[i] - q)*k)).join(",") + ")"; };
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, mx("#d8dbe4", z.sky[0], .25)); gr.addColorStop(.4, mx("#aeb3c2", z.sky[1], .3)); gr.addColorStop(.5, mx("#8a8fa0", z.fog[0], .35)); gr.addColorStop(.6, mx("#3a3e4c", z.hemi[1], .3)); gr.addColorStop(1, "#101219");
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // soft-box key light + scene light + a warm/cool rim so metal edges read
    const blob = (x, y, rx, ry, col) => { const r = g.createRadialGradient(x, y, 0, x, y, rx); r.addColorStop(0, col); r.addColorStop(1, "rgba(0,0,0,0)"); g.save(); g.scale(1, ry/rx); g.fillStyle = r; g.beginPath(); g.arc(x, y*rx/ry, rx, 0, Math.PI*2); g.fill(); g.restore(); };
    blob(W*.32, H*.2, 90, 40, "rgba(255,255,255,.95)"); blob(W*.78, H*.32, 70, 34, z.light.color); blob(W*.55, H*.47, 160, 18, z.sunCol);
    for (let i = 0; i < 40; i++){ g.fillStyle = `rgba(255,${180 + (i*37)%70},${120 + (i*53)%100},.5)`; g.fillRect((i*97)%W, H*.5 + (i*13)%14, 3, 2); }
  });
  t.mapping = THREE.EquirectangularReflectionMapping;
  const pm = new THREE.PMREMGenerator(renderer), env = pm.fromEquirectangular(t).texture; pm.dispose(); return env;
}
function mats(z){
  const env = envFor(z), S = o => new THREE.MeshStandardMaterial(Object.assign({envMap:env, envMapIntensity:1.15}, o));
  return {
    metal:S({color:0xc4cad5, metalness:.88, roughness:.27}), metalD:S({color:0x7d8596, metalness:.85, roughness:.38}),
    joint:S({color:0x2a2e39, metalness:.75, roughness:.42}), rubber:S({color:0x1a1d25, metalness:.25, roughness:.62}),
    face:S({color:0xeef1f6, metalness:.12, roughness:.22, envMapIntensity:.7}), visor:S({color:0x0b0e16, metalness:.6, roughness:.08, envMapIntensity:1.6}),
    glow:new THREE.MeshBasicMaterial({color:0x5ee8ff, fog:false}),
    emblem:new THREE.MeshBasicMaterial({map:cvs(256, 128, (g, W, H) => { g.fillStyle = "#5ee8ff"; g.shadowColor = "#5ee8ff"; g.shadowBlur = 18; g.font = "700 92px 'IBM Plex Mono', Consolas, monospace"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("</>", W/2, H/2 + 4); }), transparent:true, depthWrite:false, fog:false})
  };
}

/* ---------- geometry helpers (segments built along +Y from 0 to L) ---------- */
const lathe = (prof, seg) => new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), seg || 22);
const cylY = (r1, r2, L, seg) => new THREE.CylinderGeometry(r2, r1, L, seg || 16).translate(0, L/2, 0);
const sphere = (seg) => new THREE.SphereGeometry(1, seg || 28, Math.round((seg || 28)*.7));
function footGeo(){
  const s = new THREE.Shape(); // side profile in (z, y): heel at z<0, toe at +z, sole at y = -ankle
  const a = LEN.ankle, pts = [[-.06, -a], [.17, -a], [.205, -a + .018], [.2, -a + .04], [.12, -a + .06], [.05, -a + .085], [.03, .03], [-.035, .03], [-.065, -a + .05]];
  s.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(p => s.lineTo(p[0], p[1])); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {depth:.09, bevelEnabled:true, bevelThickness:.012, bevelSize:.012, bevelSegments:3, curveSegments:4});
  g.translate(0, 0, -.045); g.rotateY(-Math.PI/2); return g;   // extrude axis → x (width), profile z → forward
}

function build(z, opt){
  const M = mats(z), root = new THREE.Group(), parts = {};
  const add = (name, geo, mat) => { const m = new THREE.Mesh(geo, mat); m.matrixAutoUpdate = false; root.add(m); parts[name] = m; return m; };
  // torso
  add("pelvis", sphere(), M.metal); add("pelvisBand", new THREE.CylinderGeometry(1, 1, 1, 28, 1, true), M.joint);
  for (let i = 0; i < 5; i++) add("abs" + i, new THREE.CylinderGeometry(.105, .1, .036, 24), i%2 ? M.joint : M.rubber);
  add("chest", sphere(), M.metal); add("pecs", sphere(), M.metal); 
  add("emblem", new THREE.PlaneGeometry(.075, .0375), M.emblem);
  add("backPort", new THREE.CylinderGeometry(.06, .06, .02, 28), M.joint); add("backRing", new THREE.TorusGeometry(.046, .006, 8, 32), M.glow); add("backEmblem", new THREE.PlaneGeometry(.06, .03), M.emblem);
  add("spine", new THREE.BoxGeometry(.04, .22, .03), M.metalD);
  add("neck", cylY(.034, .03, 1, 16), M.joint); for (let i = 0; i < 3; i++) add("neckRing" + i, new THREE.TorusGeometry(.036, .007, 8, 20), M.metalD);
  // head
  add("helmet", sphere(36), M.metal);
  add("face", new THREE.SphereGeometry(1, 36, 24, -Math.PI*.36, Math.PI*.72, Math.PI*.2, Math.PI*.52), M.face);
  add("visor", new THREE.SphereGeometry(1, 36, 8, -Math.PI*.3, Math.PI*.6, Math.PI*.36, Math.PI*.13), M.visor);
  add("eyeL", sphere(12), M.glow); add("eyeR", sphere(12), M.glow);
  add("earL", new THREE.CylinderGeometry(.036, .036, .03, 24), M.joint); add("earR", new THREE.CylinderGeometry(.036, .036, .03, 24), M.joint);
  add("earCapL", new THREE.CylinderGeometry(.022, .022, .034, 20), M.metalD); add("earCapR", new THREE.CylinderGeometry(.022, .022, .034, 20), M.metalD);
  // limbs (×2)
  ["R", "L"].forEach(s => {
    add("shJoint" + s, sphere(20), M.metalD); add("shDisc" + s, new THREE.CylinderGeometry(.062, .066, .03, 28), M.metal); add("shCap" + s, new THREE.CylinderGeometry(.03, .03, .036, 20), M.joint);
    add("upperBone" + s, cylY(.028, .026, 1), M.joint); add("upper" + s, lathe([[0, .045], [.05, .05], [.058, .1], [.056, .19], [.046, .245], [0, .25]]), M.metal); add("upperRing" + s, new THREE.CylinderGeometry(.049, .049, .016, 22), M.metalD);
    add("elbow" + s, sphere(16), M.joint); add("elbowDisc" + s, new THREE.CylinderGeometry(.034, .034, .075, 22), M.metalD);
    add("foreBone" + s, cylY(.024, .02, 1), M.joint); add("fore" + s, lathe([[0, .04], [.048, .045], [.054, .09], [.044, .19], [.034, .25], [0, .255]]), M.metal); add("foreRing" + s, new THREE.CylinderGeometry(.037, .037, .014, 20), M.metalD);
    add("wrist" + s, sphere(12), M.joint); add("palm" + s, new THREE.BoxGeometry(.074, .082, .03).translate(0, .046, 0), M.metal);
    for (let f = 0; f < 4; f++){ add(`f${f}a${s}`, cylY(.0105, .0095, .042, 10), M.metal); add(`f${f}b${s}`, cylY(.0095, .008, .036, 10), M.metal); add(`f${f}k${s}`, sphere(8), M.joint); }
    add("thumbA" + s, cylY(.012, .011, .038, 10), M.metal); add("thumbB" + s, cylY(.011, .009, .032, 10), M.metal);
    add("hipJoint" + s, sphere(16), M.joint); add("hipDisc" + s, new THREE.CylinderGeometry(.07, .07, .05, 26), M.metal);
    add("thighBone" + s, cylY(.034, .03, 1), M.joint); add("thigh" + s, lathe([[0, .05], [.07, .055], [.078, .13], [.07, .3], [.056, .39], [0, .4]]), M.metal); add("thighRing" + s, new THREE.CylinderGeometry(.058, .058, .018, 24), M.metalD);
    add("knee" + s, sphere(16), M.joint); add("kneeCap" + s, new THREE.CylinderGeometry(.05, .05, .03, 24), M.metal);
    add("shinBone" + s, cylY(.03, .024, 1), M.joint); add("shin" + s, lathe([[0, .045], [.056, .05], [.064, .12], [.052, .26], [.04, .36], [0, .37]]), M.metal); add("shinRing" + s, new THREE.CylinderGeometry(.042, .042, .016, 22), M.metalD);
    add("ankle" + s, sphere(14), M.joint); add("foot" + s, footGeo(), M.metal); add("sole" + s, new THREE.BoxGeometry(.1, .016, .27).translate(0, -LEN.ankle + .006, .07), M.rubber);
  });
  root.userData = {parts, M};
  if (opt.scale) root.scale.setScalar(opt.scale);
  root.rotation.order = "YXZ"; root.rotation.y = opt.yaw || 0; root.rotation.x = opt.pitch || 0;
  return root;
}

/* ---------- placement ---------- */
const MAT = new THREE.Matrix4(), Q = new THREE.Quaternion();
function basis(m, pos, X, Y, Z, sx, sy, sz){ m.matrix.makeBasis(X, Y, Z); m.matrix.scale(_s.set(sx, sy, sz)); m.matrix.setPosition(pos); m.matrixWorldNeedsUpdate = true; }
function frame(Yv, hint){ _y.copy(Yv).normalize(); _z.copy(hint).addScaledVector(_y, -hint.dot(_y)); if (_z.lengthSq() < 1e-8) _z.set(0, 0, 1).addScaledVector(_y, -_y.z); _z.normalize(); _x.crossVectors(_y, _z); return [_x.clone(), _y.clone(), _z.clone()]; }
function seg(m, A, B, hint, L0){ const d = _u.subVectors(B, A), len = d.length(); const [X, Y, Z] = frame(d, hint); basis(m, A, X, Y, Z, 1, L0 ? len/L0 : 1, 1); return [X, Y, Z, len]; }
function at(m, pos, X, Y, Z, s){ s = s || [1, 1, 1]; basis(m, pos, X, Y, Z, s[0], s[1], s[2]); }
const axisMesh = (m, pos, axis, ref, s) => { const [X, Y, Z] = frame(axis, ref); at(m, pos, X, Y, Z, s); };   // cylinder Y aligned to axis

function apply(root, J){
  const p = root.userData.parts, side = ["R", "L"], up = v(0, 1, 0);
  // pelvis frame
  const pX = v(0, 0, 0).subVectors(J.hip[1], J.hip[0]); pX.y = 0; pX.normalize();
  const pY = up.clone(), pZ = v(0, 0, 0).crossVectors(pX, pY).normalize(), PXv = v(0, 0, 0).crossVectors(pY, pZ);
  at(p.pelvis, J.pel.clone().addScaledVector(pY, .01), PXv, pY, pZ, [.17, .1, .125]);
  at(p.pelvisBand, J.pel.clone().addScaledVector(pY, .045), PXv, pY, pZ, [.15, .03, .11]);
  // chest frame
  const midSh = J.sh[0].clone().add(J.sh[1]).multiplyScalar(.5), cX = v(0, 0, 0).subVectors(J.sh[1], J.sh[0]).normalize();
  const upC = v(0, 0, 0).subVectors(midSh, J.pel).normalize(), cY = upC.clone().addScaledVector(cX, -upC.dot(cX)).normalize(), cZ = v(0, 0, 0).crossVectors(cX, cY);
  const chestC = midSh.clone().addScaledVector(cY, -.1).addScaledVector(cZ, .004);
  at(p.chest, chestC, cX, cY, cZ, [.185, .15, .125]);
  at(p.pecs, chestC.clone().addScaledVector(cZ, .06).addScaledVector(cY, .018), cX, cY, cZ, [.155, .1, .075]);
  at(p.emblem, chestC.clone().addScaledVector(cZ, .128).addScaledVector(cX, .07).addScaledVector(cY, .045), cX, cY, cZ);
  axisMesh(p.backPort, chestC.clone().addScaledVector(cZ, -.122).addScaledVector(cY, .04), cZ.clone().negate(), cY);
  at(p.backRing, chestC.clone().addScaledVector(cZ, -.133).addScaledVector(cY, .04), cX, cY, cZ);
  at(p.backEmblem, chestC.clone().addScaledVector(cZ, -.135).addScaledVector(cY, .04), cX.clone().negate(), cY, cZ.clone().negate());
  at(p.spine, chestC.clone().addScaledVector(cZ, -.098).addScaledVector(cY, -.11), cX, cY, cZ, [1, .8, .7]);
  // abdomen bellows between pelvis and chest
  const a0 = J.pel.clone().addScaledVector(pY, .075), a1 = chestC.clone().addScaledVector(cY, -.13);
  for (let i = 0; i < 5; i++){ const k = i/4, pos = a0.clone().lerp(a1, k), Yk = pY.clone().lerp(cY, k).normalize(); const [X, Y, Z] = frame(Yk, pZ.clone().lerp(cZ, k)); at(p["abs" + i], pos, X, Y, Z, [1 - .06*Math.sin(k*Math.PI), 1, .82]); }
  // neck + head
  const nBase = midSh.clone().addScaledVector(cY, .015), qC = new THREE.Quaternion().setFromRotationMatrix(MAT.makeBasis(cX, cY, cZ));
  const qH = qC.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(J.head.pitch, J.head.yaw, J.head.roll, "YXZ")));
  const hX = v(1, 0, 0).applyQuaternion(qH), hY = v(0, 1, 0).applyQuaternion(qH), hZ = v(0, 0, 1).applyQuaternion(qH);
  const nTop = nBase.clone().addScaledVector(cY.clone().lerp(hY, .6).normalize(), .085);
  seg(p.neck, nBase, nTop, cZ, 1);
  for (let i = 0; i < 3; i++){ const r = p["neckRing" + i]; const [X, Y, Z] = frame(cY.clone().lerp(hY, i/2), cZ); const T = Y.clone(), N = Z.clone(); at(r, nBase.clone().lerp(nTop, .2 + i*.3), X, N, T.negate()); }
  const hC = nTop.clone().addScaledVector(hY, .118).addScaledVector(hZ, .012);
  at(p.helmet, hC, hX, hY, hZ, [.104, .132, .118]);
  { // SphereGeometry segments centred on φ=0 face −x; map −x → forward (proper rotation, no mirroring)
    const Xs = hZ.clone().negate(), Zs = hX.clone();
    at(p.face, hC.clone().addScaledVector(hZ, .008).addScaledVector(hY, -.008), Xs, hY, Zs, [.112, .126, .1]);
    at(p.visor, hC.clone().addScaledVector(hZ, .012).addScaledVector(hY, .012), Xs, hY, Zs, [.114, .13, .104]); }
  const bl = J.blink ? .2 : 1;
  for (const [s, sx] of [["L", 1], ["R", -1]]){
    at(p["eye" + s], hC.clone().addScaledVector(hZ, .124).addScaledVector(hY, .02).addScaledVector(hX, sx*.035), hX, hY, hZ, J.happy ? [.016, .005, .006] : [.017, .0065*bl, .006]);
    axisMesh(p["ear" + s], hC.clone().addScaledVector(hX, sx*.103).addScaledVector(hY, -.005), hX, hY);
    axisMesh(p["earCap" + s], hC.clone().addScaledVector(hX, sx*.11).addScaledVector(hY, -.005), hX, hY);
  }
  // limbs
  for (let i = 0; i < 2; i++){
    const s = side[i], sd = i ? 1 : -1, S = J.sh[i], E = J.el[i], W = J.wr[i], H = J.hip[i], K = J.kn[i], A = J.an[i];
    const out = cX.clone().multiplyScalar(sd);
    at(p["shJoint" + s], S, cX, cY, cZ, [.068, .068, .068]);
    axisMesh(p["shDisc" + s], S.clone().addScaledVector(out, .05), out, cY); axisMesh(p["shCap" + s], S.clone().addScaledVector(out, .066), out, cY);
    const hinge = v(0, 0, 0).crossVectors(v(0, 0, 0).subVectors(E, S), v(0, 0, 0).subVectors(W, E)); if (hinge.lengthSq() < 1e-6) hinge.copy(cX); hinge.normalize();
    const armHint = J.armHint ? J.armHint[i] : cZ;
    seg(p["upperBone" + s], S, E, armHint, 1); const [, uY] = seg(p["upper" + s], S, E, armHint, LEN.upper);
    axisMesh(p["upperRing" + s], S.clone().lerp(E, .78), uY, armHint);
    at(p["elbow" + s], E, cX, cY, cZ, [.045, .045, .045]); axisMesh(p["elbowDisc" + s], E, hinge, cY);
    seg(p["foreBone" + s], E, W, armHint, 1); const [, fY] = seg(p["fore" + s], E, W, armHint, LEN.fore);
    axisMesh(p["foreRing" + s], E.clone().lerp(W, .8), fY, armHint);
    at(p["wrist" + s], W, cX, cY, cZ, [.03, .03, .03]);
    // hand
    const hd = J.hand[i], hY = (hd.dir ? hd.dir.clone() : fY.clone()).normalize();
    const [hX0, hYv, hZv] = frame(hY, hd.back || out);   // Z = back of the hand
    const hXv = hX0.clone().multiplyScalar(sd);            // index finger towards the thumb side
    at(p["palm" + s], W, hX0, hYv, hZv);
    const curl = hd.curl || [.5, .5, .5, .5];
    for (let f = 0; f < 4; f++){
      const base = W.clone().addScaledVector(hYv, .086).addScaledVector(hXv, (f - 1.5)*.019);
      const c1 = curl[f]*1.25, c2 = curl[f]*1.45;
      const d1 = hYv.clone().multiplyScalar(Math.cos(c1)).addScaledVector(hZv, -Math.sin(c1));
      const m1 = base.clone().addScaledVector(d1, .042);
      const d2 = hYv.clone().multiplyScalar(Math.cos(c1 + c2)).addScaledVector(hZv, -Math.sin(c1 + c2));
      seg(p[`f${f}a${s}`], base, m1, hZv, .042); seg(p[`f${f}b${s}`], m1, m1.clone().addScaledVector(d2, .036), hZv, .036);
      at(p[`f${f}k${s}`], m1, cX, cY, cZ, [.011, .011, .011]);
    }
    const tb = W.clone().addScaledVector(hYv, .03).addScaledVector(hXv, -.04).addScaledVector(hZv, -.012), tc = hd.thumb ?? .4;
    const td = hYv.clone().multiplyScalar(.75).addScaledVector(hXv, .2 + tc*.5).addScaledVector(hZv, -.35 - tc*.4).normalize(), tm = tb.clone().addScaledVector(td, .038);
    seg(p["thumbA" + s], tb, tm, hZv, .038); seg(p["thumbB" + s], tm, tm.clone().addScaledVector(hYv.clone().addScaledVector(hXv, tc*.8).normalize(), .032), hZv, .032);
    // leg
    const pOut = PXv.clone().multiplyScalar(sd);
    at(p["hipJoint" + s], H, PXv, pY, pZ, [.055, .055, .055]); axisMesh(p["hipDisc" + s], H.clone().addScaledVector(pOut, .045), pOut, pY);
    const legHint = J.legHint ? J.legHint[i] : pZ;
    seg(p["thighBone" + s], H, K, legHint, 1); const [, tY] = seg(p["thigh" + s], H, K, legHint, LEN.thigh);
    axisMesh(p["thighRing" + s], H.clone().lerp(K, .8), tY, legHint);
    const kneeFwd = legHint.clone().addScaledVector(tY, -legHint.dot(tY)).normalize();
    at(p["knee" + s], K, PXv, pY, pZ, [.05, .05, .05]); axisMesh(p["kneeCap" + s], K.clone().addScaledVector(kneeFwd, .036), kneeFwd, tY);
    seg(p["shinBone" + s], K, A, legHint, 1); const [, sY] = seg(p["shin" + s], K, A, legHint, LEN.shin);
    axisMesh(p["shinRing" + s], K.clone().lerp(A, .82), sY, legHint);
    at(p["ankle" + s], A, PXv, pY, pZ, [.036, .036, .036]);
    const toe = J.toe[i].clone().normalize(), fUp = v(0, 0, 0).subVectors(K, A).normalize(); const fYv = fUp.addScaledVector(toe, -fUp.dot(toe)).normalize(), fXv = v(0, 0, 0).crossVectors(fYv, toe);
    at(p["foot" + s], A, fXv, fYv, toe); at(p["sole" + s], A, fXv, fYv, toe);
  }
}

/* ---------- poses (robot-local; values in px then converted) ---------- */
const hd = (o) => Object.assign({curl:[.45, .55, .6, .65], thumb:.35}, o);
function legIK(H, Aw, pole){ const r = ik3(H, Aw, LEN.thigh, LEN.shin, pole); return [r.j, r.e]; }
function armIK(S, Wt, pole){ const r = ik3(S, Wt, LEN.upper, LEN.fore, pole); return [r.j, r.e]; }
function armFK(S, fwd, abd, flex, sd, lean){   // swing forward/back, abduct outward, elbow flex (radians)
  const dU = v(sd*Math.sin(abd), -Math.cos(abd)*Math.cos(fwd), Math.cos(abd)*Math.sin(fwd)).applyAxisAngle(v(1, 0, 0), -(lean || 0));
  const E = S.clone().addScaledVector(dU, LEN.upper);
  const dF = v(sd*Math.sin(abd)*.6, -Math.cos(fwd + flex), Math.sin(fwd + flex)).normalize().applyAxisAngle(v(1, 0, 0), -(lean || 0));
  return [E, E.clone().addScaledVector(dF, LEN.fore), dF];
}
const T_WALK = RG.WALK_T;
function poseWalk(t){
  const p = (t/T_WALK)%1, c1 = Math.cos(2*Math.PI*p), cs = Math.cos(2*Math.PI*(p - .3));
  const hipUp = 40 + 384 + 15*Math.cos(4*Math.PI*(p - .32)) + 2*fbm(t*.7, 4), hx = -10*cs + 2*fbm(t*.3, 5), tilt = 6*cs, pz = 9*c1;
  const J = {hip:[], kn:[], an:[], toe:[], sh:[], el:[], wr:[], hand:[]};
  [-1, 1].forEach((sd, i) => { const f = footWalk(((i ? p + .5 : p))%1), H = P(hx + sd*44, hipUp - sd*tilt, -sd*pz), A = P(sd*44, 40 + f.lift, f.x);
    const [K, Ae] = legIK(H, A, v(sd*.08, 0, 1)); J.hip[i] = H; J.kn[i] = K; J.an[i] = Ae; J.toe[i] = v(0, -Math.sin(f.th*rad), Math.cos(f.th*rad)); });
  J.pel = P(hx, hipUp, 0);
  const lean = (5 + 1.2*Math.cos(4*Math.PI*(p - .1)))*rad, shUp = hipUp + 232*Math.cos(lean), shZ = 232*Math.sin(lean), Aw = 27*rad;
  [-1, 1].forEach((sd, i) => { const pp = i ? p : p + .5, a1 = -Aw*Math.cos(2*Math.PI*(pp - .07)), fwd = Math.max(0, a1/Aw);
    const S = P(hx + sd*92, shUp + sd*tilt*.5, shZ + sd*pz*1.1), [E, W, dF] = armFK(S, a1, 7*rad, (15 + 30*fwd)*rad, sd);
    J.sh[i] = S; J.el[i] = E; J.wr[i] = W; J.hand[i] = hd({dir:dF, back:v(sd, 0, -.2)}); });
  J.head = {yaw:.05*hold(t, 3, 3.5, {lo:-1, hi:1}, .9)*4, pitch:.04 + .02*Math.sin(4*Math.PI*p + .6), roll:tilt*.004};
  J.blink = blinkAt(t, 1); return J;
}
function poseStand(t){
  const br = Math.sin(t*2*Math.PI/4.4) + .25*noise(t*.6, 2), w = hold(t, 5, 6.5, {lo:-1, hi:1}, 1.6)*.85 + fbm(t*.25, 1)*.15;
  const hipUp = 40 + 418 - Math.abs(w)*3 + br*1.2, hx = w*9, J = {hip:[], kn:[], an:[], toe:[], sh:[], el:[], wr:[], hand:[]};
  [-1, 1].forEach((sd, i) => { const H = P(hx + sd*44, hipUp + sd*w*7, 0), A = P(sd*48, 40, i ? -8 : 14), [K, Ae] = legIK(H, A, v(sd*.12, 0, 1));
    J.hip[i] = H; J.kn[i] = K; J.an[i] = Ae; J.toe[i] = v(sd*.12, 0, 1); });
  J.pel = P(hx, hipUp, 0);
  const roll = -w*.03, shUp = hipUp + 232 + br*1.6;
  [-1, 1].forEach((sd, i) => { const S = P(hx*.7 + sd*92, shUp + sd*Math.sin(roll)*92, 6), sw = fbm(t*.4, 7 + i)*.05;
    const [E, W, dF] = armFK(S, .04 + sw, 8*rad, 14*rad, sd); J.sh[i] = S; J.el[i] = E; J.wr[i] = W; J.hand[i] = hd({dir:dF, back:v(sd, 0, -.25)}); });
  J.head = {yaw:hold(t, 11, 4.6, {lo:-.75, hi:.75}, .85), pitch:hold(t, 13, 5.3, {lo:-.12, hi:.18}, 1.1), roll:.04*fbm(t*.2, 9)};
  J.blink = blinkAt(t, 2); return J;
}
function poseCheer(t){
  const T = 1.08, k = Math.floor(t/T), u = t/T - k, h = (n) => { const s = Math.sin(n*127.1 + 311.7)*43758.5453; return s - Math.floor(s); }, amp = .55 + .45*h(k*2.3 + 1);
  let drop = 0, air = 0;
  if (u < .26) drop = 30*amp*smoother(u/.26);
  else if (u < .72){ const q = (u - .26)/.46; air = 62*amp*Math.sin(Math.PI*q); drop = 30*amp*(1 - smoother(q*3)); }
  else { const q = (u - .72)/.28; drop = 24*amp*Math.sin(Math.PI*Math.min(1, q*1.4))*(1 - q*.5); }
  const tuck = air > 4 ? 14*Math.sin(Math.PI*((u - .26)/.46)) : 0, hipUp = 40 + 418 - drop + air;
  const J = {hip:[], kn:[], an:[], toe:[], sh:[], el:[], wr:[], hand:[]};
  [-1, 1].forEach((sd, i) => { const H = P(sd*44, hipUp, 0), A = P(sd*50, 40 + air + tuck, -tuck*.6), [K, Ae] = legIK(H, A, v(sd*.15, 0, 1));
    J.hip[i] = H; J.kn[i] = K; J.an[i] = Ae; J.toe[i] = air > 4 ? v(0, -.6, .8) : v(sd*.1, 0, 1); });
  J.pel = P(0, hipUp, 0);
  const shUp = hipUp + 232, reach = air > 4 ? 1 : .6 + .4*(1 - drop/30);
  [-1, 1].forEach((sd, i) => { const ph = u*2*Math.PI + (i ? .5 : 0), pump = Math.sin(ph*2)*.06;
    const S = P(sd*92, shUp, 0), Wt = P(sd*(120 + 40*reach), shUp + 110 + 160*reach, 40 - 20*reach).add(v(0, pump, 0)), [E, W] = armIK(S, Wt, v(sd, -.3, -.4));
    J.sh[i] = S; J.el[i] = E; J.wr[i] = W; J.hand[i] = hd({dir:W.clone().sub(E), back:v(0, 0, -1), curl:[1.2, 1.2, 1.2, 1.2], thumb:1}); });
  J.head = {yaw:.1*Math.sin(u*2*Math.PI + k), pitch:air > 4 ? -.25 : -.08, roll:.06*Math.sin(u*2*Math.PI)};
  J.happy = true; return J;
}
/* seated / anchored poses: pelvis at the origin */
function poseType(t, o){
  const br = Math.sin(t*2*Math.PI/4.1) + .2*noise(t*.7, 4), lean = .2 + .1*hold(t, 33, 8, {lo:0, hi:1}, 2.2), typing = smoother((fbm(t*.35, 31) + .25)*2.2);
  const J = {hip:[], kn:[], an:[], toe:[], sh:[], el:[], wr:[], hand:[]}; J.pel = v(0, 0, 0);
  [-1, 1].forEach((sd, i) => { const H = v(sd*.095, -.01, 0), A = v(sd*.13, -o.seatH + LEN.ankle, .44 + (i ? .03 : 0)), [K, Ae] = legIK(H, A, v(0, .6, 1));
    J.hip[i] = H; J.kn[i] = K; J.an[i] = Ae; J.toe[i] = v(sd*.1, 0, 1); });
  const ch = v(0, .49*Math.cos(lean), .49*Math.sin(lean)).add(v(0, br*.004, 0));
  [-1, 1].forEach((sd, i) => { const S = ch.clone().add(v(sd*.192, 0, 0)), jig = (k) => (Math.sin(t*(16 + k*3.3))*.006 + Math.sin(t*(23 + k*2.1))*.004)*typing;
    const Wt = v(sd*o.kbX, o.kbY + jig(i) + .03, o.kbZ - .07 + jig(i + 2)), [E, W] = armIK(S, Wt, v(sd*.35, -1, -.25));
    J.sh[i] = S; J.el[i] = E; J.wr[i] = W;
    const c = (f) => .55 + .35*typing*(.5 + .5*Math.sin(t*(14 + f*3.7) + f*1.9 + i*2));
    J.hand[i] = hd({dir:v(0, -.25, 1).add(v(-sd*.12, 0, 0)), back:v(0, 1, 0), curl:[c(0), c(1), c(2), c(3)], thumb:.3}); });
  J.head = {yaw:hold(t, 37, 3.8, [-.32, 0, .32], .7), pitch:-.12 + .05*fbm(t*.4, 35), roll:.03*fbm(t*.3, 36)};
  J.blink = blinkAt(t, 3); J.armHint = [v(-.3, -1, 0), v(.3, -1, 0)]; return J;
}
function poseSit(t, o){
  const br = Math.sin(t*2*Math.PI/4.6) + .2*noise(t*.5, 5), w = hold(t, 21, 7.5, {lo:-1, hi:1}, 1.8)*.7;
  const J = {hip:[], kn:[], an:[], toe:[], sh:[], el:[], wr:[], hand:[]}; J.pel = v(w*.01, 0, 0);
  [-1, 1].forEach((sd, i) => { const swing = Math.sin(t*1.5 + i*2.4)*.09 + fbm(t*.4, 60 + i)*.04, H = v(sd*.095, 0, 0);
    const K = v(sd*.12, -.02, LEN.thigh*.98), A = K.clone().add(v(sd*.01, -Math.cos(swing)*LEN.shin, Math.sin(swing)*LEN.shin));
    J.hip[i] = H; J.kn[i] = K; J.an[i] = A; J.toe[i] = v(sd*.15, -.35, 1); });
  const lean = -.1 + w*.0, ch = v(-w*.02, .49*Math.cos(lean), .49*Math.sin(lean) - .01).add(v(0, br*.005, 0)), roll = -w*.06;
  [-1, 1].forEach((sd, i) => { const S = ch.clone().add(v(sd*.192*Math.cos(roll), sd*.192*Math.sin(roll), 0)), Wt = v(sd*.3, -o.ledge + .045, -.08), [E, W] = armIK(S, Wt, v(sd, 0, -.8));
    J.sh[i] = S; J.el[i] = E; J.wr[i] = W; J.hand[i] = hd({dir:v(sd*.9, -.15, .25), back:v(0, 1, 0), curl:[.15, .12, .12, .18], thumb:.1}); });
  J.head = {yaw:hold(t, 23, 4.8, {lo:-.8, hi:.8}, 1), pitch:hold(t, 25, 6, {lo:-.15, hi:.2}, 1.3), roll:.05*fbm(t*.25, 26)};
  J.blink = blinkAt(t, 4); return J;
}
function poseRide(t, o){
  const br = Math.sin(t*2*Math.PI/4), lean = (10 + 0)*rad + (o.lean || 0), bump = (o.bump || 0)*PX;
  const J = {hip:[], kn:[], an:[], toe:[], sh:[], el:[], wr:[], hand:[]}; J.pel = v(0, bump, 0);
  [-1, 1].forEach((sd, i) => { const H = v(sd*.095, bump, 0), [K, Ae] = legIK(H, o.peg[i], v(sd*.35, .4, 1)); J.hip[i] = H; J.kn[i] = K; J.an[i] = Ae; J.toe[i] = v(sd*.1, -.15, 1); });
  const ch = v(0, .49*Math.cos(lean) + bump + br*.004, .49*Math.sin(lean));
  [-1, 1].forEach((sd, i) => { const S = ch.clone().add(v(sd*.192, 0, 0)), [E, W] = armIK(S, o.grip[i], v(sd*.7, -.7, -.1));
    J.sh[i] = S; J.el[i] = E; J.wr[i] = W; J.hand[i] = hd({dir:v(-sd*.95, -.1, .3), back:v(0, .7, .7), curl:[1.15, 1.15, 1.15, 1.15], thumb:.9}); });
  J.head = {yaw:hold(t, 41, 4.2, {lo:-.45, hi:.4}, .8), pitch:-.06 + .03*fbm(t*.4, 42), roll:-(o.lean || 0)*.5};
  J.blink = blinkAt(t, 6); return J;
}
function poseFly(t){
  // posed upright; the whole robot is pitched forward by the zone so "up" becomes "ahead"
  const kick = Math.sin(t*1.9 - 1.2), J = {hip:[], kn:[], an:[], toe:[], sh:[], el:[], wr:[], hand:[]}; J.pel = v(0, 0, 0);
  [-1, 1].forEach((sd, i) => { const H = v(sd*.095, 0, 0), bend = i ? 0.15 + .08*Math.max(0, -kick) : .7 + .25*kick;
    const K = H.clone().add(v(sd*.01, -LEN.thigh*Math.cos(.06), LEN.thigh*Math.sin(i ? .02 : .12))), A = K.clone().add(v(0, -LEN.shin*Math.cos(bend), -LEN.shin*Math.sin(bend)));
    J.hip[i] = H; J.kn[i] = K; J.an[i] = A; J.toe[i] = v(0, -1, -.25 - .3*bend); });
  const ch = v(0, .49, 0), w = fbm(t*.5, 52);
  { const S = ch.clone().add(v(.192, 0, 0)), [E, W] = armIK(S, S.clone().add(v(-.04, .6 - .02*w, .1)), v(1, 0, -.3)); J.sh[1] = S; J.el[1] = E; J.wr[1] = W;
    J.hand[1] = hd({dir:v(-.05, 1, .1), back:v(0, 0, -1), curl:[1.2, 1.2, 1.2, 1.2], thumb:1}); }
  { const S = ch.clone().add(v(-.192, 0, 0)), sw = Math.sin(t*1.25 - 1.4)*.04, [E, W] = armIK(S, S.clone().add(v(-.09, -.6, -.12 + sw)), v(-1, 0, 1)); J.sh[0] = S; J.el[0] = E; J.wr[0] = W;
    J.hand[0] = hd({dir:v(-.1, -1, -.15), back:v(-1, 0, -.2), curl:[.1, .1, .12, .15], thumb:.1}); }
  J.head = {yaw:.08*hold(t, 55, 4, {lo:-1, hi:1}, 1), pitch:-1.05 + .05*Math.sin(t*.9), roll:0};
  J.blink = blinkAt(t, 5); return J;
}

/* ---------- per-scene robot ---------- */
function create(z, cfg){
  const root = build(z, cfg), mode = cfg.mode;
  const upd = (t, o) => {
    let J;
    if (mode === "walk") J = poseWalk(t); else if (mode === "stand") J = poseStand(t); else if (mode === "cheer") J = poseCheer(t);
    else if (mode === "type") J = poseType(t, cfg); else if (mode === "sit") J = poseSit(t, cfg); else if (mode === "ride") J = poseRide(t, Object.assign({}, cfg, o)); else J = poseFly(t);
    apply(root, J);
    if (mode === "fly"){ root.rotation.x = cfg.pitch + .04*Math.sin(t*1.25 - .6); root.rotation.z = .05*fbm(t*.35, 51); }
  };
  upd(0, {}); return {root, update:upd};
}
return {create, LEN};
})();
