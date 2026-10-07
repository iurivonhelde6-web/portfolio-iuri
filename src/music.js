/* ================= MUSIC =================
   One song for the whole site. It keeps playing across pages; only the volume changes:
   louder on Início, softer behind the other pages. Browsers only allow sound after a click,
   so it starts off and the button in the corner turns it on. */
const MUSIC = (() => {
  const SRC = "audio/inicio.mp3";
  const VOLS = [.65, .25, .25, .25, .25, .25, .25];   // 0 Início · 1 Perfil · 2 Habilidades · 3 Experiência · 4 Projetos · 5 Formação · 6 Contato
  const FADE = 1.6, btn = document.getElementById("snd");
  let on = false, scene = 0, audio = null, fadeId = 0, pref = false;
  try { pref = localStorage.getItem("snd") === "1"; } catch (e) {}
  const el = () => { if (!audio){ audio = new Audio(SRC); audio.loop = true; audio.preload = "auto"; audio.volume = 0; } return audio; };
  function fadeTo(target, done){
    const a = el(), from = a.volume, t0 = performance.now(), id = ++fadeId;
    const step = now => { if (id !== fadeId) return; const k = Math.min(1, (now - t0)/(FADE*1000)), e = k*k*(3 - 2*k);
      a.volume = Math.max(0, Math.min(1, from + (target - from)*e)); if (k < 1) requestAnimationFrame(step); else if (done) done(); };
    requestAnimationFrame(step);
  }
  function label(){ if (!btn) return; btn.textContent = on ? T[lang].soundOn : T[lang].soundOff; btn.classList.toggle("on", on); btn.setAttribute("aria-pressed", on ? "true" : "false"); }
  function apply(){
    const a = el();
    if (on){ if (a.paused) a.play().catch(() => {}); fadeTo(VOLS[scene] ?? .25); }
    else if (!a.paused) fadeTo(0, () => a.pause());
    label();
  }
  if (btn) btn.onclick = () => { on = !on; try { localStorage.setItem("snd", on ? "1" : "0"); } catch (e) {} apply(); };
  // if the visitor turned sound on before, resume it on their first interaction
  const first = () => { removeEventListener("pointerdown", first, true); removeEventListener("keydown", first, true); if (pref && !on){ on = true; apply(); } };
  addEventListener("pointerdown", first, true); addEventListener("keydown", first, true);
  label();
  return {scene(i){ scene = i; if (on) fadeTo(VOLS[i] ?? .25); }, label};
})();
