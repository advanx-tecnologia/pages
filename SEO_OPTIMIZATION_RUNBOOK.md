# Rotina diária de otimização de páginas locais

## Regra de execução

- Executar **exatamente uma** rota pendente por dia, na ordem de `SEO_OPTIMIZATION_QUEUE.json`.
- A rota nova `google-meu-negocio-salvador` foi entregue fora desta fila em 09/09/2026. A fila corrige as 11 páginas já existentes.
- Não alterar outras rotas, arquivos não relacionados ou itens não rastreados pelo Git.

## Para cada rota

1. Criar backup datado da página, `sitemap.xml`, `llms.txt` e da fila antes de qualquer alteração.
2. Reescrever a página com conteúdo substancial, específico à intenção comercial e à atuação em Salvador. Não inflar texto, não copiar concorrentes e não inventar depoimentos, números, clientes, endereço, acesso ao Perfil da Empresa ou resultados.
3. Preservar design Advanx, formulário compartilhado, GTM, URL canônica e CTA para `https://wa.advanx.com.br/r`.
4. Garantir título, meta description, H1, canonical, Open Graph, conteúdo visível e JSON-LD coerentes. Usar `Service`, `WebPage`, `BreadcrumbList` e FAQ apenas quando as perguntas estiverem visíveis na página.
5. Criar links internos contextuais, sem forçar âncoras. Atualizar `llms.txt` somente se a descrição de serviço precisar refletir a nova página.
6. Atualizar o `lastmod` real da rota no sitemap.
7. Fazer commit apenas dos arquivos intencionais e enviar para `origin/main`.
8. Aguardar a publicação, validar a URL pública e executar:

```bash
python3 tools/seo_publish_gate.py --url https://advanx.com.br/ROTA/ --submit-sitemap --inspect
```

9. Registrar a resposta real do Search Console. O envio do sitemap é automatizável pela API oficial. A API Google Indexing **não** deve ser usada para páginas comerciais comuns, pois é restrita a tipos elegíveis como `JobPosting` e transmissões de vídeo.
10. Só então mover a rota para `completed` na fila, com data, URL publicada e resultado do gate. Se qualquer etapa falhar, manter `pending` e relatar o bloqueio.

## Critério de qualidade

A página deve responder à intenção de busca rapidamente, explicar o serviço e suas limitações com clareza, ajudar a decisão local e ter profundidade editorial real. A rotina não promete posição, indexação nem volume de leads; ela elimina bloqueios técnicos e melhora os ativos que estão sob controle da Advanx.
