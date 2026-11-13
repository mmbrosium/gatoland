# 🐱 GatoLand

Site-joguinho estilo "roleta de skins": você gira, ganha um sticker de gato e vai
montando a coleção (a GatoPédia). Base pra, no futuro, virar um deck de cartas de batalha.

Feito em HTML, CSS e JavaScript puro — sem framework. Mobile-first, roda em qualquer
navegador e no GitHub Pages sem build.

## Layout

Header fixo com duas abas (dá pra crescer depois):
- **🎰 Roleta** — energia, a roleta e o resultado do giro.
- **📖 GatoPédia** — coleção estilo Clash Royale, agrupada por raridade, com os não
  descobertos em silhueta.

## Como funciona (MVP)

- **Energia (⚡):** gasta 1 por giro. Regenera +1 a cada 5 min, até o teto (10).
- **Ração (🍖):** vem das duplicatas. Pode ser trocada por energia.
- **Duplicata:** gato repetido dá ração **e** sobe o nível daquele gato (cada 3 cópias = +1 nível).
- **Raridade:** Comum / Raro / Épico / Lendário (chances 60 / 25 / 12 / 3%).
- **16 gatos** no catálogo atual.
- **Persistência:** `localStorage`, com `schema` versionado pra facilitar a migração pro servidor.

Tudo é calibrável no topo de `js/game.js` (`CONFIG`, `CATS`, `RARIDADES`).

## Rodar local

```bash
python3 -m http.server 8000   # abre http://localhost:8000
```

## Publicar no GitHub Pages

1. Sobe os arquivos na raiz do repo `gatoland` (`index.html`, `css/`, `js/`, `img/`).
2. Settings → Pages → Source: branch `main`, pasta `/root`.
3. Sai em `https://mmbrosium.github.io/gatoland/`.

## Estrutura

```
index.html        # header + abas
css/styles.css    # visual
js/game.js        # lógica (config + sorteio + roleta + GatoPédia)
img/              # os 16 stickers
```

## Próximos passos

- Deck de cartas + batalha (atk / def / vel / vida já estão no `attrs` de cada gato).
- Mais abas/gatos conforme crescer.
- Trocar `localStorage` por backend (contas, coleção na nuvem).
