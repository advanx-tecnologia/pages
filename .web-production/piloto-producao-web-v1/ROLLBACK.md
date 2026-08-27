# ROLLBACK

Criado em: 27/08/2026
Responsável: Hermes Agent

## Baseline

- repositório: `advanx-tecnologia/pages`
- branch base: `main`
- commit anterior: `64db0fc65fc62366007e3382956cd47e570b547a`
- rota nova: `/piloto-producao-web-v1/`
- backup: `/root/.hermes/backups/advanx-web-pilot-20260827_172522/`

## Mudanças autorizadas

- nova rota isolada;
- artefatos `.web-production/piloto-producao-web-v1`;
- nenhuma alteração em raiz, CNAME, DNS ou tracking.

## Rollback

Antes do merge: fechar eventual PR e excluir branch `feat/piloto-producao-web-v1`.
Depois do merge, somente se autorizado: reverter o commit do piloto e confirmar que a rota retorna 404, preservando todo o restante.
