# QA — Gestor de tráfego Salvador

Data: 04/09/2026
Status: publicado e validado tecnicamente; indexação em buscadores depende do processamento externo.

## Estratégia

- Consulta principal: `gestor de trafego salvador`
- Intenção: comercial local
- Conversão: clique para WhatsApp
- Evidência local: perfil oficial fornecido pelo responsável, [Advanx IA - Agência de Marketing em Salvador](https://share.google/Q2RZBcrXCvlNpVD73), incluído como link visível e `sameAs` no Organization schema.

## SEO / GEO / AEO

| Verificação | Estado | Evidência |
|---|---|---|
| URL, title, H1 e canonical | Passou | rota publicada, uma H1 e canonical validados em produção |
| Meta description e robots | Passou | meta `index,follow` e previews ampliados no HTML |
| Dados estruturados | Passou | Organization, Service, WebPage e FAQPage em JSON-LD |
| FAQ visível e correspondente ao schema | Passou | 4 perguntas visíveis e 4 entradas no JSON-LD |
| Contexto local e GBP | Passou | Salvador como `areaServed`, link do perfil oficial e `sameAs`, sem NAP não confirmado |
| Sitemap e robots | Passou | `robots.txt` e `sitemap.xml` públicos, rota presente no sitemap |
| Search Console: inspeção e solicitação de indexação | Bloqueado por credencial | token ativo de `gt.rafaa@gmail.com` não possui escopo `webmasters`; nenhum token GSC utilizável foi encontrado no host |
| Bing / Apple Business Connect | Pendente | sem acesso autenticado configurado; não declarado como feito |
| Medição | Passou | `dataLayer` inicia imediatamente; GTM carrega por interação ou após 3,5 s; clique de WhatsApp gera evento `contact` |
| Responsividade e overflow | Passou anteriormente | desktop 1440px e mobile 390px, sem overflow nem erros de console |

## Velocidade — Lighthouse externo mobile (produção)

| Rodada | Performance | Acessibilidade | Boas práticas | SEO | LCP | TBT | CLS |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 100 | 95 | 96 | 100 | 1.663 ms | 13 ms | 0 |
| 2 | 97 | 95 | 96 | 100 | 1.515 ms | 182 ms | 0 |
| 3 | 100 | 95 | 96 | 100 | 1.604 ms | 34 ms | 0 |
| Mediana | 100 | 95 | 96 | 100 | 1.604 ms | 34 ms | 0 |

O endpoint público do PageSpeed Insights retornou HTTP 429 neste momento; a medição acima foi feita com Lighthouse contra a URL pública já implantada. Antes da mudança, a mediana era 74 de performance e 1.580,5 ms de TBT.

## Publicação e verificações

```text
GET /gestor-de-trafego-salvador/ → HTTP 200
GET /robots.txt → HTTP 200; sitemap declarado
GET /sitemap.xml → HTTP 200; rota presente
GTM antes da interação: 0 requisições do container
GTM após CTA: 1 requisição do container; dataLayer: gtm.js=1, contact/whatsapp=1
```

Página pública: https://advanx.com.br/gestor-de-trafego-salvador/
