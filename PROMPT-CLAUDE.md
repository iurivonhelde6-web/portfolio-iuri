# Prompt para o Claude no VS Code — Portfólio 3D do Iuri Von Helde

> Cole este texto no Claude (VS Code) com a pasta `portfolio-iuri` aberta no workspace.

---

Você vai trabalhar no meu portfólio pessoal 3D, que já está pronto na pasta `portfolio-iuri/`. Leia o código antes de mudar qualquer coisa. Abaixo está a descrição completa do que foi construído e das decisões que **devem ser mantidas** em qualquer alteração futura.

## 1. Visão geral

- Site de página única, inspirado no estilo de gabrielrichard.dev: cidade low-poly com sombreado de desenho (toon), um personagem vivendo em cada cena, painel de conteúdo com visual de código, navegação lateral.
- Feito com **Three.js r128** (via CDN `https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js`) e JavaScript puro, sem framework e sem bundler.
- Fontes: Google Fonts **Big Shoulders Display** (títulos) e **IBM Plex Mono** (textos/código).
- Tema escuro único. Idiomas **PT/EN** com botão de troca.
- Tudo (cenas, robô, texturas) é desenhado em código. Os únicos arquivos externos são `img/*.jpg` (prints dos projetos) e `audio/inicio.mp3` (música).

## 2. Estrutura de arquivos

```
portfolio-iuri/
  index.html        ← site final (gerado pelo build, não editar à mão)
  img/              ← db.jpg, padaria.jpg, hortifruti.jpg, replay.jpg
  audio/            ← inicio.mp3
  src/
    q1.html         ← estrutura HTML, CSS (tokens em :root), nav, painel, hints, loader, layout mobile ≤820px
    q2.js           ← conteúdo: SECTIONS, T (textos PT/EN), JOBS, PROJ, SKILLS, CONTACT, render do painel
    q3.js           ← utilitários legados do personagem 2D (manter: define constantes usadas no núcleo)
    q4.js           ← núcleo 3D: renderer, materiais toon (GRAD), céu em shader, estrelas, névoa, cidade, prédios, postes, helpers (box, cyl, ball, cvs…)
    rig4.js         ← módulo RG: utilitários de movimento (noise, fbm, hold, blinkAt, footWalk, smoother, WALK_T, PPM=478 px/m)
    robot3d.js      ← módulo ROBOT: robô 3D (peças, materiais PBR, poses, IK 3D)
    q5.js           ← zonas 0–3 (Início, Perfil, Habilidades, Experiência) + buildZone
    q6.js           ← zonas 4–6 (Projetos, Formação, Contato)
    q7.js           ← câmera, transição dissolve, loop de render, navegação (teclado, roda, toque), troca de idioma, boot
    music.js        ← música do site com volume por página e botão de som
    build.sh        ← concatena tudo em ../index.html
```

**Build:** dentro de `src/`, rode `sh build.sh`. A ordem de concatenação importa:
`q2 → q3 → q4 → rig4 → robot3d → q5 → q6 → q7 → music`, embrulhado com `<!doctype html>`, `<meta charset="utf-8">` e viewport.

**Rodar local:** `python3 -m http.server 8000` na pasta `portfolio-iuri` (abrir por `file://` bloqueia as imagens nas telas 3D).

**Deploy:** hospedagem estática (Vercel, Netlify, GitHub Pages) com `index.html`, `img/` e `audio/`.

## 3. Conteúdo (em `q2.js`)

- **Seções:** Início, Perfil, Habilidades, Experiência, Projetos, Formação, Contato (EN: Start, Profile, Skills, Experience, Projects, Education, Contact).
- **Início:** "Olá, eu sou / IURI VON HELDE / Desenvolvedor Fullstack", stack Java · C# · .NET · TypeScript · React · Node.js, "Rio de Janeiro, RJ · 6 anos de experiência", frase: "Foco em arquitetura de software, desenvolvimento de sistemas e CyberSecurity.", botões "vamos conversar" e "ver projetos".
- **Experiência (4 missões, trocadas com ← →):** VH Tech (Full Stack · Engenheiro de Software, ERP, Module Federation, biblioteca de componentes, Design System), DB Barbershop (Stripe, agendamento, painel, IA com Gemini), Automação NFS-e (clínica CMRM, Python/FastAPI), Matrix the Code (React Native, 3 anos).
- **Projetos (5, trocados com ← →):** DB Barbershop, Padaria Laura, Hortifruti Vieira, Instant Replay, Dead Slug, com prints reais em `img/`.
- **Formação:** Engenharia de Software (FIAP), Análise e Desenvolvimento de Sistemas (UVA); certificações Ethical Hacker (IBSEC) e CyberSecurity (FIAP); idiomas.
- **Contato:** iuri.dev.vonhelde@gmail.com (com botão copiar), github.com/iurivonhelde6-web, linkedin.com/in/iuri-von-helde-082320261.

## 4. Cenas 3D (uma por seção)

Cada cena é um objeto `zone({...})` com céu, névoa, luzes, câmera (`cam`), câmera de entrada (`entry`), `build(g, z)` e `update(t, dt, z)`. O personagem é configurado em `sprite:{robot:{...}, base:[x,y,z]}`.

| # | Cena | Ambiente | Robô |
|---|------|----------|------|
| 0 | Início | morro gramado sobre a cidade à noite, céu roxo | em pé, de costas para a câmera, olhando a cidade |
| 1 | Perfil | rua à noite com lua, **de frente para a câmera** | caminha em direção à câmera; a rua anda no sentido contrário na velocidade exata do passo (`SPD = -RG.WALK_V`) |
| 2 | Habilidades | céu violeta, nuvens e badges de tecnologias flutuando | voando estilo super-herói (corpo inclinado 74°, punho à frente), escala 1.5 |
| 3 | Experiência | rua com placas das empresas | pilotando a moto cruiser (feita a partir de blueprint); ao trocar de missão a moto anda até a próxima placa |
| 4 | Projetos | quarto com mesa, 3 monitores (o do meio mostra o print do projeto), cadeira gamer | sentado na cadeira, digitando no teclado de verdade |
| 5 | Formação | palco com pódio, troféus, placas flutuantes, confete | em cima do pódio comemorando com pulos |
| 6 | Contato | beirada de terraço no pôr do sol, letreiro neon IURI.DEV | sentado na beirada, de costas, mãos apoiadas, pernas balançando |

**Transição entre cenas:** as duas cenas são renderizadas em render targets e misturadas por um dissolve com ruído (shader em `initPost`). O painel de texto some com blur e reaparece linha a linha.

## 5. O robô 3D (`robot3d.js`) — decisões a manter

- É um **modelo 3D real** dentro da cena (não é imagem nem billboard). O antigo personagem 2D foi descartado: não voltar para sprite ou desenho em canvas.
- Inspiração: robô humanoide com capacete e máscara, discos nas articulações, abdômen segmentado.
- **Peças:** capacete com máscara clara e visor escuro, olhos ciano que brilham, piscam em intervalos irregulares e viram "^ ^" ao comemorar; tampas das orelhas embutidas no capacete (sem bolas aparecendo atrás da cabeça); pescoço articulado com anéis; peito em placa com emblema `</>` ciano; nas costas um disco com anel ciano e `</>`; abdômen em sanfona; placa de quadril; ombros com esfera e tampa; cotovelos e joelhos com disco; antebraços e canelas em casca torneada; mãos com 4 dedos de 2 segmentos e polegar; pés blindados com sola.
- **Materiais:** `MeshStandardMaterial` metálico (prata, metalness ~0.88, roughness ~0.27) com `envMap` gerado por cena a partir das cores do céu daquela cena (PMREM). O reflexo deve ficar prata com tons da cena, não saturado.
- **Esqueleto:** as funções de pose devolvem posições de juntas no espaço local do robô (metros; +x = esquerda do robô, +y para cima, +z para a frente). Cada peça é posicionada entre duas juntas. Braços e pernas usam **IK de dois ossos em 3D** com vetor de polo.
- **Regras físicas:** os pés ficam sempre no chão (sem afundar); as mãos alcançam alvos reais: teclado (Projetos), guidão (Experiência), beirada (Contato).
- O grupo do robô **não** gira para a câmera (o billboard só vale para zonas sem robô).

## 6. Movimento natural — decisões a manter

O usuário reclamou de movimentos robóticos. Mantenha:
- **Ruído suave** (`noise`/`fbm`) em vez de senos fixos repetindo.
- **"Olhar, parar e virar"** (`hold`): a cabeça olha para um alvo, para alguns segundos e vira suavemente para outro.
- **Piscadas** em intervalos aleatórios, às vezes duplas.
- **Respiração** num ritmo humano (~14/min).
- **Caminhada:** ciclo com fase de apoio/balanço (`footWalk`), quadril que gira e cai do lado da perna no ar, ombros girando no sentido oposto, peso passando de um pé ao outro, braços com leve atraso e cotovelo dobrando mais na frente.
- **Parado:** troca o peso de perna de tempos em tempos.
- **Digitando:** rajadas com pausas, dedos se movendo, olhando entre os três monitores, inclinando para a frente às vezes.
- **Comemorando:** preparação (agacha), salto com altura variável e aterrissagem amortecida.
- **Moto:** inclina ao acelerar ou frear, vibra em movimento, olha em volta.
- **Voando:** membros seguem o corpo com atraso, oscilação leve.

## 7. Interface

- Nav à esquerda com numeração 01–07 e a seção ativa destacada; painel à direita com títulos grandes que se ajustam à largura (`fitTitle`).
- Navegação por setas ↑↓, PageUp/PageDown, Home/End, Esc (volta), roda do mouse e toque; ← → trocam missão/projeto.
- Canto inferior direito: dica de teclado, botões PT/EN e botão de som.
- `prefers-reduced-motion` reduz animações e transições.
- Layout mobile ≤820px (nav horizontal, câmera mais afastada).

## 8. Música (`music.js`)

- **Uma música para o site todo:** `audio/inicio.mp3`, em loop e sem reiniciar ao trocar de página.
- **Volume por página:** Início **65%**, todas as outras **25%**, com transição suave de ~1,6 s (`VOLS = [.65, .25, .25, .25, .25, .25, .25]`).
- Começa **desligada** (regra de autoplay dos navegadores). O botão "♪ som desligado / ♪ som ligado" (EN: "♪ sound off / ♪ sound on") liga e desliga com fade. A escolha fica salva em `localStorage` e, se o visitante tinha ligado antes, o som volta no primeiro clique ou tecla.
- Os textos do botão ficam em `T.pt.soundOn/soundOff` e `T.en.soundOn/soundOff`; `setLang` chama `MUSIC.label()` e `go(i)` chama `MUSIC.scene(i)`.

## 9. Histórico de pedidos (não desfazer)

- Rua do Perfil **de frente** (ele vem em direção à câmera), não de lado.
- Pés nunca entram no chão; pernas retas, sem arquear; cabeça centralizada, sem virar demais.
- Braços e mãos naturais (nada de mãos levantadas na cena de digitar).
- Personagem é um **robô 3D realista** com metal e reflexos.
- Experiência: moto no lugar do carro, parada na placa e andando ao trocar de missão.
- Formação sem a Faculdade Mercúrio; frase do Início como está acima.
- Projetos com os prints reais.

## 10. Como trabalhar

1. Edite os arquivos em `src/`, nunca o `index.html` diretamente.
2. Depois de cada mudança, rode `sh build.sh` e teste com um servidor local, verificando o console do navegador.
3. Mantenha Three.js r128 (APIs como `CapsuleGeometry` não existem nessa versão).
4. Não adicione dependências de npm nem bundler sem eu pedir.
5. Antes de mudar visual ou movimento do robô, confira se a mudança respeita as seções 5 e 6.

**Minha próxima tarefa para você:** [descreva aqui o que quer mudar]
