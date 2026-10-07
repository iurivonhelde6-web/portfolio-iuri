# Portfólio 3D — Iuri Von Helde

Site de página única feito com Three.js (r128, carregado via CDN). O robô, as cenas e as texturas são todos desenhados em código.

## Estrutura
- `index.html` — o site pronto, tudo em um arquivo.
- `img/` — prints dos projetos exibidos nas telas da cena Projetos.
- `src/` — código-fonte separado em módulos:
  - `q1.html` — estrutura, estilos e painel de texto
  - `q2.js` — conteúdo (textos PT/EN, experiências, projetos, formação, contato)
  - `q3.js`, `q4.js` — núcleo 3D (renderer, materiais, céu, cidade, prédios)
  - `rig4.js` — utilitários de movimento (ruído suave, olhares, piscadas, ciclo de passo)
  - `robot3d.js` — o robô 3D (peças, metal com reflexo, poses e IK)
  - `q5.js`, `q6.js` — as 7 cenas
  - `q7.js` — câmera, transições, navegação e loop de render
  - `build.sh` — junta os módulos de novo em `index.html`

## Como rodar no seu computador
Use um servidor local (abrir o arquivo direto com duplo clique pode bloquear as imagens dos projetos nas telas 3D):

```
cd portfolio-iuri
python3 -m http.server 8000
# ou: npx serve .
```

Depois acesse http://localhost:8000

## Publicar
Funciona em qualquer hospedagem estática (Vercel, Netlify, GitHub Pages): basta enviar `index.html` e a pasta `img/`.

## Editar
Textos, experiências, projetos e contatos ficam em `src/q2.js`. Depois de editar, rode dentro de `src/`:

```
sh build.sh
```
