# EVENT_MAP

Status: `pilot`
Tracker canônico: desativado no piloto

| Evento | Gatilho | Payload | Destino | Observação |
|---|---|---|---|---|
| `pilot_page_view` | carregamento da preview | `page`, `mode` | `dataLayer` local | Não envia a terceiros |
| `pilot_method_view` | primeira entrada de `#metodo` no viewport | `section` | `dataLayer` local | one-shot |
| `pilot_review_click` | clique em CTA de revisão | `cta`, `page` | `dataLayer` local | rolagem interna |

Não há Pixel, GA4, CRM, WhatsApp, formulário ou Cal.com neste piloto controlado.
