# EVIDENCE

## Artefatos

- `piloto-producao-web-v1/index.html`
- `.web-production/piloto-producao-web-v1/WEB_BRIEF.yaml`
- `.web-production/piloto-producao-web-v1/COPY.md`
- `.web-production/piloto-producao-web-v1/DESIGN.md`
- `.web-production/piloto-producao-web-v1/EVENT_MAP.md`
- `.web-production/piloto-producao-web-v1/QA_REPORT.md`
- `.web-production/piloto-producao-web-v1/PUBLISH_REPORT.md`
- `.web-production/piloto-producao-web-v1/ROLLBACK.md`
- `.web-production/piloto-producao-web-v1/ROUTE_MATRIX.md`

## Evidência técnica

- browser report: `/tmp/pilot-browser-3/report.json`
- screenshots: `/tmp/pilot-browser-3/*.png`
- Lighthouse: `/tmp/pilot-lighthouse-3/summary.json`
- backup: `/root/.hermes/backups/advanx-web-pilot-20260827_172522/`

## Incidentes corrigidos

1. contraste insuficiente do botão cobre com texto branco;
2. uso inválido de `aria-label` em `div`;
3. `noindex` reduzia o gate SEO;
4. conteúdo abaixo da dobra ficava invisível em captura e sem scroll por causa do reveal progressivo.

Todos foram corrigidos e os gates foram executados novamente.
