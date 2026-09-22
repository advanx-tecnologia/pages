# Rotina diária de otimização de páginas locais

## Regra de execução

- Executar **exatamente uma** rota pendente por dia, na ordem de `SEO_OPTIMIZATION_QUEUE.json`.
- A rota nova `google-meu-negocio-salvador` foi entregue fora desta fila em 09/09/2026. A fila corrige as 11 páginas já existentes.
- Não alterar outras rotas, arquivos não relacionados ou itens não rastreados pelo Git.

## Para cada rota

1. Criar backup datado da página, `sitemap.xml`, `llms.txt` e da fila antes de qualquer alteração.
2. Confirmar o bloco de entrada: ausência de `noindex` na página e no cabeçalho HTTP, `robots.txt` sem bloqueio global, sitemap XML válido com a URL canônica e redirecionamento HTTP → HTTPS para a mesma rota.
3. Conferir conscientemente os rastreadores de IA no `robots.txt`. Para a Advanx, a política é permitir rastreamento público; não adicionar `Disallow` específico para `GPTBot`, `OAI-SearchBot`, `ClaudeBot`, `Claude-SearchBot`, `PerplexityBot`, `Google-Extended` ou `CCBot`.
4. Reescrever a página com conteúdo substancial, específico à intenção comercial e à atuação em Salvador. Não inflar texto, não copiar concorrentes e não inventar depoimentos, números, clientes, endereço, acesso ao Perfil da Empresa ou resultados.
5. Preservar design Advanx, formulário compartilhado, GTM, URL canônica e CTA para `https://wa.advanx.com.br/r`.
6. Garantir exatamente um H1 descritivo, hierarquia de headings sem saltos materiais, title e meta description únicos e humanos, canonical absoluta, URL limpa, Open Graph completo com `og:image`, viewport mobile, conteúdo visível e JSON-LD coerente. Usar `Service`, `WebPage`, `BreadcrumbList` e FAQ apenas quando as perguntas estiverem visíveis na página.
7. Criar links internos contextuais, sem forçar âncoras. Atualizar `llms.txt` somente se a descrição de serviço precisar refletir a nova página.
8. Comprimir imagens, declarar dimensões quando aplicável e evitar imagens desnecessariamente maiores que a área renderizada. Validar a página em celular e desktop.
9. Atualizar o `lastmod` real da rota no sitemap.
10. Fazer commit apenas dos arquivos intencionais e enviar para `origin/main`.
11. Aguardar a publicação, validar a URL pública e executar:

```bash
python3 tools/seo_publish_gate.py --url https://advanx.com.br/ROTA/ --submit-sitemap --inspect
```

12. Registrar a resposta real do Search Console. O envio do sitemap é automatizável pela API oficial. A API Google Indexing **não** deve ser usada para páginas comerciais comuns, pois é restrita a tipos elegíveis como `JobPosting` e transmissões de vídeo.
13. Rodar Lighthouse mobile três vezes e registrar a mediana de Performance, LCP, CLS e TBT. Falha de execução deve permanecer explícita; não inventar medição nem marcar o item como aprovado.
14. Só então mover a rota para `completed` na fila, com data, URL publicada e resultado do gate. Se qualquer etapa falhar, manter `pending` e relatar o bloqueio.

## Critério de qualidade

A página deve responder à intenção de busca rapidamente, explicar o serviço e suas limitações com clareza, ajudar a decisão local e ter profundidade editorial real. A rotina não promete posição, indexação nem volume de leads; ela elimina bloqueios técnicos e melhora os ativos que estão sob controle da Advanx.
