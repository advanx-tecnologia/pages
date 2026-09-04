# QA — Gestor de tráfego Salvador

Data: 04/09/2026
Status: *aprovado tecnicamente para revisão visual e aprovação de publicação*.

## Estratégia

- Consulta principal: `gestor de trafego salvador`
- Intenção: comercial local
- Conversão: clique para WhatsApp
- Limites de evidência: não houve acesso ao Google Search Console, a volume de busca, casos, endereço físico ou Google Business Profile. Nenhum desses fatos foi inventado.

## SEO / GEO / AEO

| Verificação | Estado | Evidência |
|---|---|---|
| URL, title, H1 e canonical | Passou | rota, title e uma H1 validados pelo verificador |
| Meta description e robots | Passou | meta `index,follow` e previews ampliados no HTML |
| Dados estruturados | Passou | Organization, Service, WebPage e FAQPage em JSON-LD válido |
| FAQ visível e correspondente ao schema | Passou | 4 perguntas visíveis e 4 entradas no JSON-LD |
| Contexto local sem NAP fabricado | Passou | Salvador como `areaServed`, sem endereço ou GBP não verificados |
| Sitemap e robots | Passou | rota no sitemap e `robots.txt` com sitemap declarado |
| Links internos | Limitação documentada | home e privacidade; não foram criados links para páginas legadas não verificadas |
| Medição | Passou | evento `contact` para CTA de WhatsApp e GTM existente |
| Responsividade e overflow | Passou | desktop 1440px e mobile 390px, sem overflow nem erros de console |
| Revisão visual | Passou | paleta preta, cobre e cream; sem azul/ciano; sem corte visual detectado |

## Execuções verificadas

```text
PASS: HTML, metadata, CTA, structured data, sitemap and robots validated
GET /gestor-de-trafego-salvador/ → HTTP 200
Playwright: desktop e mobile sem overflow, 2 CTAs, 4 FAQs, 1 JSON-LD e 0 erros de console
```

## Publicação

A página continua apenas no worktree/branch local `feat/gestor-de-trafego-salvador`. Não houve push ou publicação. Publicar somente após aprovação explícita de Rafael.
