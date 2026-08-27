# QA_REPORT

Status: `passed-local`
Branch: `feat/piloto-producao-web-v1`
Rota local: `http://127.0.0.1:4185/piloto-producao-web-v1/`
Data: 27/08/2026

## Escopo

Landing page piloto controlada e artefatos da linha de produção. Nenhuma publicação, tracking externo, CRM, formulário, WhatsApp, Cal.com ou DNS.

## Validação estática

| Check | Resultado | Evidência |
|---|---|---|
| HTML | passou | `static-audit.mjs`, zero erros e warnings |
| JavaScript inline | passou | compilado por `vm.Script` |
| Assets locais | passou | zero asset quebrado |
| Secrets | passou | zero padrão privilegiado detectado |
| CNAME | preservado | `advanx.com.br` |

## Browser

| Motor | Viewports | Resultado |
|---|---|---|
| Chromium | 360×640, 390×844, 768×1024, 1440×900 | passou |
| Firefox | 390×844, 1440×900 | passou |
| WebKit | 390×844, 1440×900 | passou |

- 8 combinações executadas.
- zero erro de console.
- zero violação axe séria ou crítica.
- zero overflow horizontal detectado pelo harness.
- screenshots em `/tmp/pilot-browser-3/`.

## Lighthouse mobile

Mediana de 3 execuções:

| Métrica | Resultado | Gate |
|---|---:|---:|
| Performance | 100 | ≥95 |
| Acessibilidade | 100 | 100 |
| Boas práticas | 96 | ≥95 |
| SEO | 100 | ≥95 |
| LCP | 897 ms | ≤2500 ms |
| CLS | 0 | ≤0,1 |
| TBT | 3,5 ms | ≤200 ms |

## Revisão visual Sol

- primeira captura revelou conteúdo abaixo da dobra invisível por causa de `IntersectionObserver`;
- o efeito foi removido, preservando conteúdo visível sem JavaScript;
- nova captura mobile e desktop confirmou todas as seções visíveis;
- paleta literal preto, cobre e cream preservada;
- CTA aparece na primeira dobra mobile;
- sem azul, ciano, gradiente, depoimento ou métrica inventada.

## Resultado

Gate técnico local aprovado. Próximo gate: preview isolada e revisão visual independente no Terra antes de qualquer merge/publicação em produção.
