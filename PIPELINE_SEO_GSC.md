# Pipeline de publicação: SEO, sitemap e Google Search Console

Este é o gate obrigatório após publicar uma nova landing page local ou alterar
materialmente uma rota indexável.

## Ordem correta

1. Publicar a rota, o `sitemap.xml` e qualquer atualização do `llms.txt` no mesmo deploy.
2. Aguardar a URL pública responder `200`.
3. Rodar o gate abaixo. Ele valida arquivo local, sitemap, HTTP 200, canonical e
   `robots=index,follow` antes de qualquer chamada ao Google.
4. Só se todos os gates passarem, ele reenvia **o sitemap** ao Search Console e
   faz uma leitura do estado de indexação das rotas alteradas.
5. Registrar o retorno do Google como `reconhecida`, `detectada`, `indexada` ou
   outro estado retornado. Publicação não é indexação e indexação não é ranking.

```bash
python3 tools/seo_publish_gate.py \
  --url https://advanx.com.br/nova-rota/ \
  --submit-sitemap \
  --inspect
```

Para várias rotas no mesmo deploy, repita `--url`; o sitemap é reenviado uma só vez:

```bash
python3 tools/seo_publish_gate.py \
  --url https://advanx.com.br/nova-rota/ \
  --url https://advanx.com.br/outra-rota/ \
  --submit-sitemap \
  --inspect
```

Use `--dry-run` para validar o pipeline sem escrever no Search Console:

```bash
python3 tools/seo_publish_gate.py \
  --url https://advanx.com.br/nova-rota/ \
  --submit-sitemap \
  --inspect \
  --dry-run
```

## Regra sobre indexação

Não chamar a Google Indexing API para landing pages comerciais. O uso oficial
dessa API é restrito a `JobPosting` e conteúdo de transmissão/evento/vídeo.
Para as páginas da Advanx, o mecanismo correto é sitemap + arquitetura de links
internos + conteúdo rastreável + acompanhamento via URL Inspection.

A ação “Solicitar indexação” para páginas comuns é uma funcionalidade da
interface do Search Console, não uma API oficial automatizável. Nunca simular
essa ação nem declarar indexação sem o retorno do Google.

## Credencial esperada

O script usa a credencial OAuth local já autorizada para Search Console:
`/root/.hermes/google_search_console_token.json`.

Ela não é versionada e o pipeline nunca imprime token, segredo ou refresh token.
