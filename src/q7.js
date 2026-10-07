/* ================= CAMERA, DISSOLVE TRANSITIONS, UI ================= */
const nav = document.getElementById("nav"), loadEl = document.getElementById("load");
let prev = 0, zi = 0, mobile = false, mx = 0, my = 0, smx = 0, smy = 0, queued = null;
let trans = null;                                   // {from, to, p}
const TRANS_DUR = REDUCED ? .5 : 1.9;
const tmpP = V3(0, 0, 0), tmpL = V3(0, 0, 0), wp = V3(0, 0, 0);
const easeOut = x => 1 - Math.pow(1 - x, 3), easeInOut = x => x < .5 ? 4*x*x*x : 1 - Math.pow(-2*x + 2, 3)/2;

/* composite pass: two scenes blended with a soft, cloudy dissolve */
let rtA = null, rtB = null, post = null;
function makeRT(w, h){
  const RT = renderer.capabilities.isWebGL2 && THREE.WebGLMultisampleRenderTarget ? THREE.WebGLMultisampleRenderTarget : THREE.WebGLRenderTarget;
  const r = new RT(w, h, {minFilter:THREE.LinearFilter, magFilter:THREE.LinearFilter, format:THREE.RGBAFormat}); if (r.samples !== undefined) r.samples = 4; return r;
}
function initPost(){
  const mat = new THREE.ShaderMaterial({
    uniforms:{tA:{value:null}, tB:{value:null}, p:{value:0}, time:{value:0}, aspect:{value:1}, dirX:{value:1}},
    vertexShader:"varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader:[
      "uniform sampler2D tA; uniform sampler2D tB; uniform float p; uniform float time; uniform float aspect; uniform float dirX; varying vec2 vUv;",
      "float hash(vec2 q){ return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453); }",
      "float noise(vec2 q){ vec2 i = floor(q), f = fract(q); f = f*f*(3.0 - 2.0*f); return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }",
      "float fbm(vec2 q){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a*noise(q); q *= 2.03; a *= 0.5; } return v; }",
      "void main(){",
      "  vec2 c = vec2(0.5);",
      "  vec2 uvA = c + (vUv - c) * (1.0 - 0.05*p);",
      "  vec2 uvB = c + (vUv - c) * (0.95 + 0.05*p);",
      "  vec4 A = texture2D(tA, uvA); vec4 B = texture2D(tB, uvB);",
      "  float n = fbm(vec2(vUv.x*aspect, vUv.y)*2.4 + vec2(time*0.04, -time*0.03));",
      "  float sweep = dirX > 0.0 ? vUv.x : 1.0 - vUv.x;",
      "  float v = n*0.6 + sweep*0.22 + (1.0 - vUv.y)*0.08;",
      "  float m = smoothstep(v - 0.22, v + 0.22, p*1.5 - 0.25);",
      "  float edge = 1.0 - abs(m*2.0 - 1.0);",
      "  vec3 col = mix(A.rgb, B.rgb, m) + vec3(1.0, 0.82, 0.95) * pow(edge, 3.0) * 0.10;",
      "  gl_FragColor = vec4(col, 1.0);",
      "}"].join("\n"),
    depthTest:false, depthWrite:false
  });
  const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); q.frustumCulled = false;
  const s = new THREE.Scene(); s.add(q);
  post = {scene:s, cam:new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), mat};
}

function applyEnv(z){
  const u = skyMat.uniforms; u.top.value.set(z.sky[0]); u.mid.value.set(z.sky[1]); u.bot.value.set(z.sky[2]); u.sunDir.value.set(...z.sunDir); u.sunCol.value.set(z.sunCol); u.sunK.value = z.sunK;
  scene.fog.color.set(z.fog[0]); scene.fog.near = z.fog[1]; scene.fog.far = z.fog[2];
  starMat.opacity = z.stars; stars.visible = z.stars > 0;
  hemi.color.set(z.hemi[0]); hemi.groundColor.set(z.hemi[1]); hemi.intensity = z.hemi[2]*.62;
  sun.color.set(z.light.color); sun.intensity = z.light.i; sun.position.set(...z.light.pos);
  ZONES.forEach(o => { if (o.g) o.g.visible = o === z; });
}
function enterCam(z){
  const k = REDUCED ? 0 : .7;
  z.from = {p:V3(...z.cam.p).add(V3(...z.entry.p).multiplyScalar(k)), l:V3(...z.cam.l).add(V3(...z.entry.l).multiplyScalar(k))};
  z.camT = 0; z.exitT = -1;
}
function zoneCam(z, dt){
  if (z.camT < 1) z.camT = Math.min(1, z.camT + dt/2.6);
  const e = easeOut(z.camT);
  tmpP.set(...z.cam.p); tmpL.set(...z.cam.l);
  if (z.from){ tmpP.lerpVectors(z.from.p, tmpP.clone(), e); tmpL.lerpVectors(z.from.l, tmpL.clone(), e); }
  if (z.exitT >= 0){ z.exitT = Math.min(1, z.exitT + dt/TRANS_DUR); const k = z.exitT*z.exitT; tmpP.lerp(tmpL, .22*k); tmpP.y += .25*k; }
  if (mobile) tmpP.sub(tmpL).multiplyScalar(1.22).add(tmpL);
  const sw = REDUCED ? 0 : z.sway, t = T0;
  camera.position.set(tmpP.x + Math.sin(t*.23)*sw + smx*.35, tmpP.y + Math.sin(t*.31)*sw*.45 - smy*.18, tmpP.z + Math.cos(t*.19)*sw*.4);
  camera.lookAt(tmpL);
}
function tickZone(z, dt){
  for (const m of z.movers){ const o = m.obj.position, L = m.max - m.min; o[m.axis] += m.speed*dt*SP;
    if (m.speed > 0 && o[m.axis] > m.max) o[m.axis] -= L; else if (m.speed < 0 && o[m.axis] < m.min) o[m.axis] += L; }
  if (z.update) z.update(T0, dt, z);
  if (z.signAnim !== undefined && z.signAnim < 1){ z.signAnim = Math.min(1, z.signAnim + dt/1.1); z.sign.position.x = 16*(1 - easeOut(z.signAnim)); }
  z.t += dt;
  animateSprite(z);
}
function animateSprite(z){
  if (z.robot){ let opt = {};
    if (z.sprite.robot.mode === "ride"){ const v = Math.abs(z.speed || 0), acc = z.acc || 0; z.lean = (z.lean || 0) + ((Math.max(-.14, Math.min(.14, acc*.025))) - (z.lean || 0))*.1;
      opt = {lean:z.lean, bump:(v > .2 ? Math.sin(z.t*15)*3 : Math.sin(z.t*1.6)*1)}; }
    z.robot.update(z.t, opt); return; }
  if (z.rig && z.rig.rg){ const pl = z.hero.plane, off = z.sprite.off; pl.position.set(off[0], off[1], 0); pl.rotation.z = 0; pl.scale.set(1, 1, 1);
    let opt = {};
    if (z.rig.rg === "ride"){ const v = Math.abs(z.speed || 0), a = z.acc || 0; z.lean = (z.lean || 0) + ((Math.max(-.14, Math.min(.14, a*.025))) - (z.lean || 0))*.1;
      opt = {lean:z.lean, speed:v/7, bump:(v > .2 ? Math.sin(z.t*15)*3 : Math.sin(z.t*1.6)*1)}; }
    RG.draw(z.rig.ctx, z.rig.rg, z.t, opt); z.rig.tex.needsUpdate = true; return; }
  if (z.rig){ const pl = z.hero.plane, off = z.sprite.off; pl.position.set(off ? off[0] : 0, off ? off[1] : z.sprite.planeH/2, 0); pl.rotation.z = 0; pl.scale.set(1, 1, 1);
    let opt;
    if (z.rig.key === "ride"){ const v = Math.abs(z.speed || 0), a = z.acc || 0; z.lean = (z.lean || 0) + ((Math.max(-.14, Math.min(.14, a*.025))) - (z.lean || 0))*.1;
      opt = {lean:z.lean, bump:(v > .2 ? Math.sin(z.t*15)*4 : Math.sin(z.t*1.6)*1.5)}; }
    if (drawRig(z.rig.ctx, z.rig.key, z.rig.mode, z.t, opt)) z.rig.tex.needsUpdate = true; return; }
  const pl = z.hero.plane, sp = z.sprite, t = z.t, ph = sp.height, fx = sp.flip ? -1 : 1, base = ph/2, sw = REDUCED ? .3 : 1;
  pl.position.set(sp.dx || 0, base, 0); pl.rotation.z = 0; pl.scale.set(fx, 1, 1);
  if (z.pose === "walk"){ const s = t*5.2; pl.position.y = base + Math.abs(Math.sin(s))*.035*sw; pl.rotation.z = .016*Math.sin(s/2)*sw; pl.position.x += .025*Math.sin(s/2)*sw; }
  else if (z.pose === "fly"){ pl.rotation.z = (sp.tilt || 0) + .035*Math.sin(t*1.1)*sw; pl.position.x += .06*Math.sin(t*.8)*sw; }
  else if (z.pose === "drive"){ const v = Math.abs(z.speed || 0), a = z.acc || 0;
    z.lean = (z.lean || 0) + ((Math.max(-.12, Math.min(.12, a*.02))) - (z.lean || 0))*.12;
    pl.rotation.z = z.lean + .01*Math.sin(t*1.3)*sw; pl.position.y = base + (v > .2 ? Math.sin(t*15)*.012 : Math.sin(t*1.6)*.004)*sw; pl.position.x -= z.lean*.1; }
  else if (z.pose === "cheer"){ pl.position.y = base + Math.abs(Math.sin(t*1.8))*.03*sw; pl.scale.y = 1 + .006*Math.sin(t*1.7); }
  else { pl.scale.y = 1 + .007*Math.sin(t*1.7)*sw; pl.position.y = base*(1 + .007*Math.sin(t*1.7)*sw); pl.rotation.z = .006*Math.sin(t*.45)*sw; }
}
function renderZone(z, dt, target){
  applyEnv(z); zoneCam(z, dt);
  if (!z.robot){ z.hero.group.getWorldPosition(wp); z.hero.group.rotation.y = Math.atan2(camera.position.x - wp.x, camera.position.z - wp.z); }
  skyRig.position.copy(camera.position);
  renderer.setRenderTarget(target); renderer.render(scene, camera);
}
function resize(){
  const w = innerWidth, h = innerHeight; mobile = w <= 820;
  renderer.setSize(w, h, false); camera.aspect = w/h; camera.fov = mobile ? 52 : 40;
  camera.setViewOffset(w, h, mobile ? 0 : w*.13, mobile ? h*.17 : 0, w, h); camera.updateProjectionMatrix();
  const s = new THREE.Vector2(); renderer.getDrawingBufferSize(s);
  if (rtA){ rtA.setSize(s.x, s.y); rtB.setSize(s.x, s.y); } else { rtA = makeRT(s.x, s.y); rtB = makeRT(s.x, s.y); }
  if (post) post.mat.uniforms.aspect.value = w/h;
}

let T0 = 0, last = 0;
function frame(now){
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last)/1000 || 0); last = now; T0 += dt;
  smx += (mx - smx)*Math.min(1, dt*2.5); smy += (my - smy)*Math.min(1, dt*2.5);
  if (!trans){ const z = ZONES[zi]; tickZone(z, dt); renderZone(z, dt, null); return; }
  trans.p = Math.min(1, trans.p + dt/TRANS_DUR);
  const A = ZONES[trans.from], B = ZONES[trans.to];
  tickZone(A, dt); tickZone(B, dt);
  renderZone(A, dt, rtA); renderZone(B, dt, rtB);
  const u = post.mat.uniforms; u.tA.value = rtA.texture; u.tB.value = rtB.texture; u.p.value = easeInOut(trans.p); u.time.value = T0; u.dirX.value = trans.to > trans.from ? 1 : -1;
  renderer.setRenderTarget(null); renderer.render(post.scene, post.cam);
  if (trans.p >= 1){ zi = trans.to; trans = null; applyEnv(ZONES[zi]); const q = queued; queued = null; if (q !== null && q !== cur) go(q); }
}

/* ---- nav + panel ---- */
function buildNav(){
  nav.innerHTML = SECTIONS[lang].map((s, i) => `<button data-i="${i}" class="${i === cur ? "on" : ""}" ${i === cur ? 'aria-current="true"' : ""}><i>0${i+1}</i><span class="bar"></span>${s}</button>`).join("");
  const on = nav.querySelector(".on"); if (on && mobile && on.scrollIntoView) on.scrollIntoView({inline:"center", block:"nearest", behavior:"smooth"});
}
function fitTitle(){
  const h = panel.querySelector("h1,h2"); if (!h) return; h.style.fontSize = "";
  let fs = parseFloat(getComputedStyle(h).fontSize), n = 0; while (h.scrollWidth > panel.clientWidth + 1 && fs > 30 && n++ < 40){ fs -= 3; h.style.fontSize = fs + "px"; }
}
function renderPanel(reveal){
  panel.classList.remove("in", "out");
  panel.innerHTML = view(cur); panel.scrollTop = 0; fitTitle();
  if (cur === 4){ drawPreview(); if (renderer) setProjectScreen(); }
  if (reveal){ void panel.offsetWidth; panel.classList.add("in"); }
}
let panelTimer = null;
function go(i){
  i = Math.max(0, Math.min(6, i));
  if (trans){ queued = i; return; }
  if (i === cur) return;
  prev = cur; cur = i; buildNav();
  if (typeof MUSIC !== "undefined") MUSIC.scene(i);
  clearTimeout(panelTimer);
  panel.classList.remove("in"); panel.classList.add("out");
  panelTimer = setTimeout(() => renderPanel(true), REDUCED ? 120 : 640);
  if (!renderer) return;
  enterCam(ZONES[i]); ZONES[zi].exitT = 0;
  if (i === 3) setJobSign(JOBS[lang][jobI].n, false);
  trans = {from:zi, to:i, p:0};
}
function setLang(l){
  lang = l; document.documentElement.lang = l === "pt" ? "pt-BR" : "en";
  document.getElementById("pt").classList.toggle("on", l === "pt"); document.getElementById("en").classList.toggle("on", l === "en");
  document.getElementById("sub").textContent = T[l].role; document.getElementById("hint").textContent = T[l].hint;
  buildNav(); renderPanel(true); if (renderer && ZONES[3].g) repaintSigns();
  if (typeof MUSIC !== "undefined") MUSIC.label();
}
function stepJob(d, set){ jobI = set !== undefined ? set : (jobI + d + JOBS[lang].length) % JOBS[lang].length; renderPanel(true); if (renderer) setJobSign(JOBS[lang][jobI].n, true); }
function stepProj(d, set){ projI = set !== undefined ? set : (projI + d + PROJ[lang].length) % PROJ[lang].length; renderPanel(true); }

nav.addEventListener("click", e => { const b = e.target.closest("button[data-i]"); if (b) go(+b.dataset.i); });
panel.addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return; const d = b.dataset;
  if (d.go) go(+d.go);
  else if (d.back !== undefined) go(prev === cur ? 0 : prev);
  else if (d.job) stepJob(+d.job); else if (d.jobset) stepJob(0, +d.jobset);
  else if (d.proj) stepProj(+d.proj); else if (d.projset) stepProj(0, +d.projset);
  else if (d.copy){
    const done = () => { b.textContent = T[lang].copied; setTimeout(() => { b.textContent = T[lang].copy; }, 1500); };
    const sel = () => { const a = b.parentElement.querySelector("a"); if (!a) return; const r = document.createRange(); r.selectNodeContents(a); const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
    try { navigator.clipboard.writeText(d.copy).then(done, sel); } catch (err) { sel(); }
  }
});
document.getElementById("pt").onclick = () => setLang("pt");
document.getElementById("en").onclick = () => setLang("en");
addEventListener("keydown", e => {
  if (e.key === "ArrowDown" || e.key === "PageDown"){ e.preventDefault(); go(cur + 1); }
  else if (e.key === "ArrowUp" || e.key === "PageUp"){ e.preventDefault(); go(cur - 1); }
  else if (e.key === "Home") go(0); else if (e.key === "End") go(6);
  else if (e.key === "Escape") go(prev === cur ? 0 : prev);
  else if (e.key === "ArrowRight" || e.key === "ArrowLeft"){ const d = e.key === "ArrowRight" ? 1 : -1; if (cur === 3) stepJob(d); else if (cur === 4) stepProj(d); }
});
let lastWheel = 0;
addEventListener("wheel", e => {
  if (e.target.closest && e.target.closest("#panel") && panel.scrollHeight > panel.clientHeight + 4){
    const atTop = panel.scrollTop <= 0, atEnd = panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 2;
    if (!((e.deltaY > 0 && atEnd) || (e.deltaY < 0 && atTop))) return;
  }
  const n = performance.now(); if (Math.abs(e.deltaY) < 10 || n - lastWheel < 1300) return;
  lastWheel = n; go(cur + (e.deltaY > 0 ? 1 : -1));
}, {passive:true});
let ty = null;
addEventListener("touchstart", e => { ty = e.target.closest("#panel, nav") ? null : e.touches[0].clientY; }, {passive:true});
addEventListener("touchend", e => { if (ty === null) return; const dy = ty - e.changedTouches[0].clientY; ty = null; if (Math.abs(dy) > 60) go(cur + (dy > 0 ? 1 : -1)); }, {passive:true});
addEventListener("pointermove", e => { mx = (e.clientX/innerWidth - .5)*2; my = (e.clientY/innerHeight - .5)*2; }, {passive:true});

/* ---- boot ---- */
function boot(){
  setLang("pt");
  if (renderer){
    ZONES.forEach(buildZone); initPost();
    addEventListener("resize", resize); resize();
    zi = 0; applyEnv(ZONES[0]); enterCam(ZONES[0]); setJobSign(JOBS[lang][jobI].n, false);
    requestAnimationFrame(t => { last = t; frame(t); requestAnimationFrame(() => { loadEl.classList.add("done"); renderPanel(true); }); });
  } else {
    canvas.style.display = "none"; const f = document.createElement("div"); f.className = "fallback"; document.body.prepend(f); loadEl.classList.add("done");
  }
}
const fontsReady = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1800))]) : Promise.resolve();
fontsReady.then(() => { try { boot(); } catch (err) { console.error(err); loadEl.classList.add("done"); } });
