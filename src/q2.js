/* ================= CONTENT ================= */
const SECTIONS = {
  pt: ["Início","Perfil","Habilidades","Experiência","Projetos","Formação","Contato"],
  en: ["Start","Profile","Skills","Experience","Projects","Education","Contact"]
};
const T = {
  pt: {
    hello:"Olá, eu sou", role:"Desenvolvedor Fullstack",
    stack:["Java","C# · .NET","TypeScript","React","Node.js"], where:"Rio de Janeiro, RJ · 6 anos de experiência",
    now:"Foco em arquitetura de software, desenvolvimento de sistemas e CyberSecurity.",
    talk:"vamos conversar", see:"ver projetos", scroll:"role para continuar ↓",
    hint:"↑ ↓ navegar · scroll avança · Esc volta", mission:"missão", of:"de", back:"voltar",
    sobre:"Desenvolvedor fullstack com 6 anos de experiência. Divido aplicações grandes em módulos independentes, crio componentes que vários times reaproveitam e padronizo Design Systems. Gosto do ritmo de startup.",
    ctaTxt:"Pode me chamar por e-mail ou pelo LinkedIn.", edu:"formação", cert:"certificações", lang:"idiomas",
    langs:["Português nativo","Inglês avançado","Espanhol fluente"], copy:"copiar", copied:"copiado ✓",
    swap:"// ← → trocam de placa", prj:"// projeto", open:"ver online", credit:"// cenas, personagem e texturas desenhados em código"
  },
  en: {
    hello:"Hi, I'm", role:"Fullstack Developer",
    stack:["Java","C# · .NET","TypeScript","React","Node.js"], where:"Rio de Janeiro, Brazil · 6 years of experience",
    now:"Focused on software architecture, systems development and cybersecurity.",
    talk:"get in touch", see:"see projects", scroll:"scroll to continue ↓",
    hint:"↑ ↓ navigate · scroll advances · Esc goes back", mission:"mission", of:"of", back:"back",
    sobre:"Fullstack developer with 6 years of experience. I split large applications into independent modules, build components several teams reuse and standardize Design Systems. I like the pace of a startup.",
    ctaTxt:"Reach me by e-mail or on LinkedIn.", edu:"education", cert:"certifications", lang:"languages",
    langs:["Native Portuguese","Advanced English","Fluent Spanish"], copy:"copy", copied:"copied ✓",
    swap:"// ← → switch the sign", prj:"// project", open:"see it live", credit:"// scenes, character and textures drawn in code"
  }
};
const JOBS = {
  pt: [
    {n:"VH Tech", r:"Desenvolvedor Full Stack · Engenheiro de Software", d:"Atual · ERP corporativo", b:[
      "Dividi o ERP em módulos independentes com Module Federation (Micro Frontends).",
      "Criei uma biblioteca de componentes reutilizáveis entre times.",
      "Padronizei o Design System: cores, tipografia e componentes."], s:["React.js","AngularJs","Module Federation","AWS RDS"]},
    {n:"DB Barbershop", r:"Desenvolvedor Full Stack", d:"Em produção · ded-black.com.br", b:[
      "Clube de assinaturas com cobrança recorrente via Stripe e webhooks.",
      "Agendamento online com escolha de barbeiro e horários definidos pelo admin.",
      "Painel com calculadora de KPIs, check-in por cartão de membro, repasses e IA Consultor com Google Gemini."], s:["React","Vite","Express","Firebase","Stripe","Vercel"]},
    {n:"Automação NFS-e", r:"Desenvolvedor · projeto para a clínica CMRM", d:"Python · FastAPI", b:[
      "Sistema que emite a NFS-e automaticamente a cada pagamento confirmado.",
      "Substitui o lançamento manual no portal do Emissor Nacional de NFS-e."], s:["Python","FastAPI","NFS-e Nacional"]},
    {n:"Matrix the Code", r:"Desenvolvedor Mobile", d:"3 anos", b:[
      "Desenvolvi e evoluí o app do jogo Matrix the Code durante três anos.",
      "Trabalho contínuo em telas, fluxos e desempenho no celular."], s:["React Native","JavaScript"]}
  ],
  en: [
    {n:"VH Tech", r:"Full Stack Developer · Software Engineer", d:"Current · corporate ERP", b:[
      "Split the ERP into independent modules with Module Federation (Micro Frontends).",
      "Built a component library reused across teams.",
      "Standardized the Design System: colors, typography and components."], s:["React.js","AngularJs","Module Federation","AWS RDS"]},
    {n:"DB Barbershop", r:"Full Stack Developer", d:"In production · ded-black.com.br", b:[
      "Membership club with recurring billing through Stripe and webhooks.",
      "Online booking with barber choice and time slots set by the admin.",
      "Dashboard with a KPI calculator, member-card check-in, payouts and an AI Advisor built on Google Gemini."], s:["React","Vite","Express","Firebase","Stripe","Vercel"]},
    {n:"NFS-e Automation", r:"Developer · project for the CMRM clinic", d:"Python · FastAPI", b:[
      "System that issues the service invoice (NFS-e) automatically for every confirmed payment.",
      "Replaces manual entry on the national NFS-e issuing portal."], s:["Python","FastAPI","National NFS-e"]},
    {n:"Matrix the Code", r:"Mobile Developer", d:"3 years", b:[
      "Built and evolved the Matrix the Code game app over three years.",
      "Ongoing work on screens, flows and mobile performance."], s:["React Native","JavaScript"]}
  ]
};
const PROJ = {
  pt: [
    {n:"DB Barbershop", t:"Clube de assinaturas da barbearia: planos por serviço, agendamento com escolha de barbeiro, cartão de membro e simulador de economia.", s:["React","Stripe","Firebase","Vercel"], u:"https://ded-black.com.br", ul:"ded-black.com.br", img:"img/db.jpg", c:"#ffb43a", bg:"#15110c", k:"Planos de membro"},
    {n:"Padaria Laura", t:"Site da padaria e confeitaria com cardápio, kits e pedidos direto pelo WhatsApp.", s:["Landing page","WhatsApp"], ul:"padaria-laura", img:"img/padaria.jpg", c:"#ff7aa6", bg:"#fff4ea", k:"Confeitaria em arte"},
    {n:"Hortifruti Vieira", t:"Site do hortifruti com três lojas no Rio e na Baixada, delivery e pedidos pelo WhatsApp.", s:["Web","Multi-unidade","WhatsApp"], ul:"hortifruti-vieira", img:"img/hortifruti.jpg", c:"#7bd66a", bg:"#0f1f12", k:"Do campo para a mesa"},
    {n:"Instant Replay", t:"Plataforma de replay retroativo para campos de futebol, a partir de câmeras RTSP, com painel para operar os lances.", s:["RTSP","Vídeo"], ul:"instant-replay", img:"img/replay.jpg", c:"#ff2d55", bg:"#070b14", k:"Reveja o lance"},
    {n:"Dead Slug", t:"Jogo web de tiro e sobrevivência zumbi, estilo run-and-gun, feito para estudo.", s:["HTML","Canvas"], ul:"dead-slug", c:"#ff8a3d", bg:"#1a0c08", k:"Corra, atire, sobreviva"}
  ],
  en: [
    {n:"DB Barbershop", t:"Barbershop membership club: plans per service, booking with barber choice, member card and a savings simulator.", s:["React","Stripe","Firebase","Vercel"], u:"https://ded-black.com.br", ul:"ded-black.com.br", img:"img/db.jpg", c:"#ffb43a", bg:"#15110c", k:"Membership plans"},
    {n:"Padaria Laura", t:"Bakery and patisserie site with menu, party kits and orders straight through WhatsApp.", s:["Landing page","WhatsApp"], ul:"padaria-laura", img:"img/padaria.jpg", c:"#ff7aa6", bg:"#fff4ea", k:"Pastry as art"},
    {n:"Hortifruti Vieira", t:"Greengrocer site with three stores in Rio, delivery and orders through WhatsApp.", s:["Web","Multi-store","WhatsApp"], ul:"hortifruti-vieira", img:"img/hortifruti.jpg", c:"#7bd66a", bg:"#0f1f12", k:"Farm to table"},
    {n:"Instant Replay", t:"Retroactive replay platform for football pitches, fed by RTSP cameras, with a dashboard to run the replays.", s:["RTSP","Video"], ul:"instant-replay", img:"img/replay.jpg", c:"#ff2d55", bg:"#070b14", k:"Watch it again"},
    {n:"Dead Slug", t:"Zombie survival run-and-gun web game, built as a study project.", s:["HTML","Canvas"], ul:"dead-slug", c:"#ff8a3d", bg:"#1a0c08", k:"Run, shoot, survive"}
  ]
};
const IMGS = {};
PROJ.pt.forEach(p => { if (p.img){ const im = new Image(); im.decoding = "async"; im.onload = () => { if (PROJ[lang][projI].img === p.img && document.getElementById("pv")){ drawPreview(); if (typeof setProjectScreen === "function" && typeof renderer !== "undefined" && renderer) setProjectScreen(); } if (typeof onShotLoaded === "function") onShotLoaded(p.img, im); }; im.src = p.img; IMGS[p.img] = im; } });
const SKILLS = {
  linguagens:["Java","C#","JavaScript","TypeScript","PHP","Python","Go"],
  backend:["Spring Boot",".NET","Node.js","Express","NestJS"],
  frontend:["React.js","Next.js","React Native","AngularJs","Webflow"],
  arquitetura:["Micro Frontends","Module Federation","Design System"],
  dados:["SQL Server","PostgreSQL","MySQL","MongoDB","Redis"],
  cloud:["AWS (RDS)"]
};
const SKILLS_EN = {languages:"linguagens", backend:"backend", frontend:"frontend", architecture:"arquitetura", data:"dados", cloud:"cloud"};
const CONTACT = {
  email:"iuri.dev.vonhelde@gmail.com",
  github:"github.com/iurivonhelde6-web",
  linkedin:"linkedin.com/in/iuri-von-helde-082320261"
};

/* ================= PANEL MARKUP ================= */
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const S = s => '<span class="c-s">"' + esc(s) + '"</span>';
const A = a => "[" + a.map(S).join(", ") + "]";
let D = 0;                                   // running reveal index
const ln = (html, cls) => `<div class="ln ${cls||""}" style="--d:${D++}">${html}</div>`;
function title(txt, tag){
  let k = 0;
  const words = txt.split(" ").map(w => `<span class="word">${[...w].map(ch => `<span style="--d:${k++}">${esc(ch)}</span>`).join("")}</span>`);
  return `<${tag}>${words.join(tag === "h1" ? "<br>" : " ")}</${tag}>`;
}
function head(i){
  const t = T[lang];
  return ln(`<div class="head"><span class="n">0${i+1}</span><span class="rule"></span>${i ? `<button data-back>← ${t.back}</button><kbd>Esc</kbd>` : ""}</div>`);
}
function code(name, entries){
  const rows = [`<span class="c-k">const</span> <span class="c-n">${name}</span> = {`];
  entries.forEach(([k, v]) => rows.push(`<span class="c-p">${k}</span>: ${v},`));
  rows.push("};");
  return `<div class="code">` + rows.map((r, i) => ln(`<span class="g">${i+1}</span><span class="t ${i && i < rows.length-1 ? "in1" : ""}">${r}</span>`, "cl")).join("") + `</div>`;
}

let lang = "pt", cur = 0, jobI = 0, projI = 0;
const panel = document.getElementById("panel");

function view(i){
  const t = T[lang], name = SECTIONS[lang][i]; D = 0;
  if (i === 0) return head(0) +
    ln(`<div class="eyebrow">${t.hello}</div>`) + title("Iuri Von Helde", "h1") +
    ln(`<div class="role">${t.role}</div>`) +
    ln(`<div>${t.stack.map(esc).join(' <span class="dim">·</span> ')}</div>`) +
    ln(`<div class="dim">${esc(t.where)}</div>`) +
    ln(`<div class="btns"><button class="btn" data-go="6">↗ ${t.talk}</button><button class="btn ghost" data-go="4">${t.see}</button></div>`) +
    ln(`<p class="dim" style="margin-top:16px">${esc(t.now)}</p>`) +
    ln(`<div class="cmd">${t.scroll}</div>`);
  if (i === 1) return head(1) + title(name, "h2") + code(lang === "pt" ? "perfil" : "profile", [
    ["nome", S("Iuri Von Helde")], ["cargo", S(t.role)],
    ["experiencia", S(lang === "pt" ? "6 anos" : "6 years")],
    ["local", S("Rio de Janeiro, RJ")], ["sobre", S(t.sobre)],
    ["idiomas", A(t.langs)], ["curte", S(lang === "pt" ? "ambiente de startup" : "startup environments")]
  ]);
  if (i === 2){
    const keys = Object.keys(SKILLS);
    const labels = lang === "pt" ? keys : Object.keys(SKILLS_EN);
    return head(2) + title(name, "h2") + code(lang === "pt" ? "habilidades" : "skills", keys.map((k, j) => [labels[j], A(SKILLS[k])]));
  }
  if (i === 3){
    const J = JOBS[lang], j = J[jobI];
    return head(3) + title(name, "h2") +
      ln(`<div class="pager"><button class="arrow" data-job="-1" aria-label="anterior">←</button><span>${t.mission} ${jobI+1} ${t.of} ${J.length}</span><button class="arrow" data-job="1" aria-label="próxima">→</button></div>`) +
      ln(`<div class="tabs">${J.map((x, k) => `<button class="chip ${k === jobI ? "on" : ""}" data-jobset="${k}">${esc(x.n)}</button>`).join("")}</div>`) +
      ln(`<div class="co">${esc(j.n)}</div>`) +
      ln(`<div style="font-weight:600">${esc(j.r)}</div>`) +
      ln(`<div class="dim">${esc(j.d)}</div>`) +
      `<ul class="tl" style="margin-top:10px">${j.b.map(b => ln(esc(b)).replace(/^<div/, "<li").replace(/div>$/, "li>")).join("")}</ul>` +
      ln(`<div class="stack">${j.s.map(s => `<span>${esc(s)}</span>`).join("")}</div>`) +
      ln(`<div class="cmd">${t.swap}</div>`);
  }
  if (i === 4){
    const P = PROJ[lang], p = P[projI];
    return head(4) + title(name, "h2") +
      ln(`<div class="cmd">${t.prj} ${projI+1} / ${P.length}</div>`) +
      ln(`<div style="font-weight:600;font-size:16px">${esc(p.n)}</div>`) +
      ln(`<div class="shot"><div class="bar"><u></u><u></u><u></u><span style="margin-left:8px">${esc(p.ul)}</span></div><canvas id="pv" width="1280" height="640"></canvas></div>`) +
      ln(`<div class="pager"><button class="arrow" data-proj="-1" aria-label="anterior">←</button><div class="tabs" style="margin:0">${P.map((x, k) => `<button class="chip ${k === projI ? "on" : ""}" data-projset="${k}">${k+1}</button>`).join("")}</div><button class="arrow" data-proj="1" aria-label="próximo">→</button></div>`) +
      ln(`<p>${esc(p.t)}</p>`) +
      ln(`<div class="stack">${p.s.map(s => `<span>${esc(s)}</span>`).join("")}</div>`) +
      (p.u ? ln(`<a href="${p.u}" target="_blank" rel="noopener">${t.open} ↗</a>`) : "");
  }
  if (i === 5) return head(5) + title(name, "h2") + `<div class="rows">` +
    ln(`<div class="r"><span class="k">// ${t.edu}</span><b>${lang === "pt" ? "Engenharia de Software" : "Software Engineering"}</b><span class="dim">FIAP</span></div>`) +
    ln(`<div class="r"><b>${lang === "pt" ? "Análise e Desenvolvimento de Sistemas" : "Systems Analysis and Development"}</b><span class="dim">UVA</span></div>`) +
    ln(`<div class="r"><span class="k">// ${t.cert}</span><b>Ethical Hacker</b><span class="dim">IBSEC</span></div>`) +
    ln(`<div class="r"><b>CyberSecurity</b><span class="dim">FIAP</span></div>`) +
    ln(`<div class="r"><span class="k">// ${t.lang}</span><span>${t.langs.join(" · ")}</span></div>`) + `</div>`;
  return head(6) + title(name, "h2") +
    ln(`<p style="font-size:14px">${t.ctaTxt}</p>`) + `<div class="rows" style="gap:10px;margin-top:10px">` +
    ln(`<div class="r"><span class="cmd">$ email</span><span><a href="mailto:${CONTACT.email}">${CONTACT.email}</a> &nbsp;<button class="chip" data-copy="${CONTACT.email}">${t.copy}</button></span></div>`) +
    ln(`<div class="r"><span class="cmd">$ github</span><a href="https://${CONTACT.github}" target="_blank" rel="noopener">${CONTACT.github}</a></div>`) +
    ln(`<div class="r"><span class="cmd">$ linkedin</span><a href="https://${CONTACT.linkedin}" target="_blank" rel="noopener">${CONTACT.linkedin}</a></div>`) + `</div>` +
    ln(`<div class="btns"><a class="btn" style="text-decoration:none" href="https://${CONTACT.linkedin}" target="_blank" rel="noopener">↗ LinkedIn</a></div>`) +
    ln(`<div class="cmd" style="margin-top:18px">${t.credit}</div>`);
}

/* mini "website" preview for each project, drawn on canvas */
function drawPreview(){
  const cv = document.getElementById("pv"); if (!cv) return;
  const g = cv.getContext("2d"), p = PROJ[lang][projI];
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (p.img){ const im = IMGS[p.img]; g.fillStyle = p.bg; g.fillRect(0, 0, 1280, 640);
    if (im && im.complete && im.naturalWidth){ const s = Math.max(1280/im.naturalWidth, 640/im.naturalHeight); g.drawImage(im, (1280 - im.naturalWidth*s)/2, 0, im.naturalWidth*s, im.naturalHeight*s); }
    return; }
  g.setTransform(2, 0, 0, 2, 0, 0); const W = 640, H = 320;
  const light = p.bg === "#fff4ea", fg = light ? "#2a1a14" : "#f4effc", sub = light ? "rgba(42,26,20,.55)" : "rgba(244,239,252,.5)";
  g.fillStyle = p.bg; g.fillRect(0, 0, W, H);
  const gr = g.createRadialGradient(470, 150, 10, 470, 150, 260); gr.addColorStop(0, p.c + "55"); gr.addColorStop(1, p.c + "00");
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.fillStyle = fg; g.font = "700 14px Arial"; g.fillText(p.n.split(" ")[0].toUpperCase(), 28, 34);
  g.fillStyle = sub; ["Início","Sobre","Contato"].forEach((s, k) => { g.font = "12px Arial"; g.fillText(s, 420 + k*66, 34); });
  g.fillStyle = fg; g.font = "900 44px 'Big Shoulders Display', 'Arial Narrow', Arial";
  const words = p.n.toUpperCase().split(" "); let y = 104;
  const lines = words.length > 2 ? [words.slice(0, 2).join(" "), words.slice(2).join(" ")] : [p.n.toUpperCase()];
  lines.forEach(l => { g.fillText(l, 28, y); y += 44; });
  g.fillStyle = p.c; g.fillRect(28, y - 22, 64, 4);
  g.fillStyle = sub; g.font = "14px Arial"; g.fillText(p.k, 28, y + 10);
  for (let k = 0; k < 2; k++){ g.fillStyle = sub; g.globalAlpha = .35; g.fillRect(28, y + 28 + k*14, 230 - k*60, 6); }
  g.globalAlpha = 1; g.fillStyle = p.c; g.beginPath(); g.roundRect ? g.roundRect(28, y + 64, 124, 34, 17) : g.rect(28, y + 64, 124, 34); g.fill();
  g.fillStyle = light ? "#fff" : "#140f22"; g.font = "700 13px Arial"; g.fillText(lang === "pt" ? "Começar" : "Start", 60, y + 86);
  // hero art: stacked tilted cards in project color
  for (let k = 0; k < 3; k++){
    g.save(); g.translate(470 + k*18, 170 - k*10); g.rotate(-.12 + k*.1);
    g.fillStyle = k === 2 ? p.c : (light ? "rgba(42,26,20,.12)" : "rgba(255,255,255,.08)");
    g.beginPath(); g.roundRect ? g.roundRect(-80, -95, 160, 190, 14) : g.rect(-80, -95, 160, 190); g.fill();
    if (k === 2){ g.fillStyle = p.bg; g.globalAlpha = .9; g.beginPath(); g.arc(0, -20, 34, 0, 7); g.fill(); g.fillRect(-50, 36, 100, 10); g.fillRect(-36, 54, 72, 8); g.globalAlpha = 1; }
    g.restore();
  }
}
