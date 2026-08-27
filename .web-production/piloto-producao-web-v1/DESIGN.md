# DESIGN.md

Status: `pilot-approved`
Projeto: Piloto Produção Web Advanx
Página: `/piloto-producao-web-v1/`

## Direção

Editorial tecnológico, preciso e humano. O preto dá autoridade, o cream reduz frieza e o cobre conduz atenção. A composição evita gradientes, glassmorphism genérico, cards dentro de cards e efeitos sem função.

## Assinatura única

Uma linha vertical cobre percorre o fluxo e conecta estratégia, design, desenvolvimento e validação como uma única cadeia de produção.

## Tokens

```css
:root {
  --bg: #F6F1E8;
  --surface: #FFFFFF;
  --ink: #111111;
  --muted: #5B5B5B;
  --copper: #B56A32;
  --copper-dark: #8D4F24;
  --line: #D3CEC6;
  --cream-strong: #EFE6D8;
  --radius-sm: 8px;
  --radius-lg: 12px;
  --shadow: 0 18px 60px rgba(17,17,17,.08);
}
```

## Tipografia

- Display e corpo: Inter, system-ui, sans-serif.
- H1 desktop: clamp(3rem, 6vw, 5.8rem), peso 650.
- H1 mobile: clamp(2.35rem, 12vw, 3.6rem).
- Corpo: 1rem a 1.125rem, entrelinha 1.65.
- Mono: ui-monospace para números de etapa e evidências.

## Layout

- Container máximo: 1180px.
- Gutter: clamp(20px, 4vw, 48px).
- Hero em duas colunas acima de 900px e uma coluna abaixo.
- Seções entre 80px e 128px no desktop, 64px no mobile.
- Cards com borda, sem sombra pesada.

## Componentes

- Botão primário cobre, altura mínima 48px, raio 8px.
- Botão secundário preto com texto branco.
- Step cards numerados, ligados pela linha cobre.
- Painel de qualidade em fundo preto com métricas reais preenchidas após QA.
- Focus ring visível de 3px.

## Motion

- Entrada discreta de 12px e 360ms somente após carregamento.
- Sem biblioteca externa.
- `prefers-reduced-motion` desativa toda animação.

## Responsividade

- 360×640, 390×844, 768×1024 e 1440×900.
- Nenhum conteúdo depende de hover.
- Touch target mínimo 44px.
- Zero overflow horizontal.

## Proibições

- azul ou ciano;
- gradiente decorativo;
- serifas;
- ícones emoji;
- depoimentos ou métricas inventadas;
- menu complexo;
- dependência externa de runtime.
