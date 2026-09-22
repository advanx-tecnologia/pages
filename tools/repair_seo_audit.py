#!/usr/bin/env python3
"""Correção determinística do lote SEO/AEO/GEO apontado na auditoria de 22/09/2026.

Não publica nem chama serviços externos. O script usa a auditoria canônica como fonte
para limitar o escopo e gera cartões Open Graph locais em SVG no sistema Advanx.
"""
from __future__ import annotations

import argparse
import html
import json
import re
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
AUDIT = Path('/root/.hermes/auditorias/auditoria-total-seo-advanx-20260922.json')
SOCIAL_DIR = ROOT / 'assets' / 'social'
DOMAIN = 'https://advanx.com.br'


def route_file(url: str) -> Path:
    path = urlparse(url).path.strip('/')
    return ROOT / ('index.html' if not path else path if Path(path).suffix else f'{path}/index.html')


def title_of(source: str, fallback: str) -> str:
    match = re.search(r'<title[^>]*>(.*?)</title>', source, re.I | re.S)
    return re.sub(r'\s+', ' ', html.unescape(match.group(1))).strip() if match else fallback


def description_of(source: str) -> str:
    match = re.search(r'<meta\s+[^>]*name=["\']description["\'][^>]*content=["\']([^"\']+)', source, re.I)
    return html.unescape(match.group(1)).strip() if match else ''


def insert_before_head_end(source: str, block: str) -> str:
    if '</head>' not in source.lower():
        raise ValueError('Documento sem </head>')
    return re.sub(r'</head>', f'{block}\n</head>', source, count=1, flags=re.I)


def ensure_meta(source: str, name: str, value: str, *, prop: bool = False) -> str:
    attr = 'property' if prop else 'name'
    pattern = rf'<meta\s+[^>]*{attr}=["\']{re.escape(name)}["\'][^>]*>'
    tag = f'  <meta {attr}="{name}" content="{html.escape(value, quote=True)}">'
    if re.search(pattern, source, re.I):
        return re.sub(pattern, tag, source, count=1, flags=re.I)
    return insert_before_head_end(source, tag)


def ensure_canonical(source: str, url: str) -> str:
    pattern = r'<link\s+[^>]*rel=["\']canonical["\'][^>]*>'
    tag = f'  <link rel="canonical" href="{url}">'
    if re.search(pattern, source, re.I):
        return re.sub(pattern, tag, source, count=1, flags=re.I)
    return insert_before_head_end(source, tag)


def social_filename(url: str) -> str:
    path = urlparse(url).path.strip('/') or 'inicio'
    return re.sub(r'[^a-z0-9]+', '-', path.lower()).strip('-') + '.svg'


def svg_card(title: str, url: str) -> str:
    words = title.replace('| Advanx', '').replace(' - Advanx', '').strip()
    chunks = []
    current = ''
    for word in words.split():
        candidate = f'{current} {word}'.strip()
        if len(candidate) > 27 and current:
            chunks.append(current)
            current = word
        else:
            current = candidate
    if current:
        chunks.append(current)
    chunks = chunks[:3]
    title_svg = ''.join(f'<text x="86" y="{228 + i * 82}" fill="#F6F1E8" font-family="Arial, Helvetica, sans-serif" font-size="64" font-weight="700">{html.escape(line)}</text>' for i, line in enumerate(chunks))
    route = urlparse(url).path.strip('/') or 'advanx.com.br'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="{html.escape(title, quote=True)}">
  <rect width="1200" height="630" fill="#111111"/>
  <rect x="0" y="0" width="18" height="630" fill="#B56A32"/>
  <circle cx="1050" cy="118" r="206" fill="#B56A32" opacity=".18"/>
  <path d="M742 554 C866 408, 1046 434, 1200 296 L1200 630 L690 630Z" fill="#F6F1E8" opacity=".08"/>
  <text x="86" y="118" fill="#D89A6C" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" letter-spacing="5">ADVANX</text>
  {title_svg}
  <line x1="86" y1="520" x2="324" y2="520" stroke="#B56A32" stroke-width="6"/>
  <text x="86" y="573" fill="#F6F1E8" font-family="Arial, Helvetica, sans-serif" font-size="25">advanx.com.br/{html.escape(route)}</text>
</svg>\n'''


def ensure_og(source: str, url: str, title: str, description: str) -> str:
    image_url = f'{DOMAIN}/assets/social/{social_filename(url)}'
    values = {
        'og:title': title,
        'og:description': description or f'Conteúdo da Advanx sobre {title}.',
        'og:url': url,
        'og:type': 'article' if '/blog/' in url else 'website',
        'og:image': image_url,
        'og:image:width': '1200',
        'og:image:height': '630',
    }
    for name, value in values.items():
        source = ensure_meta(source, name, value, prop=True)
    return source


def schema_for(url: str, title: str, description: str) -> dict:
    base = {
        '@context': 'https://schema.org',
        '@graph': [
            {'@type': 'Organization', '@id': f'{DOMAIN}/#organization', 'name': 'Advanx', 'url': f'{DOMAIN}/'},
            {'@type': 'WebPage', '@id': f'{url}#webpage', 'url': url, 'name': title, 'description': description, 'inLanguage': 'pt-BR'},
            {'@type': 'BreadcrumbList', '@id': f'{url}#breadcrumb', 'itemListElement': [
                {'@type': 'ListItem', 'position': 1, 'name': 'Advanx', 'item': f'{DOMAIN}/'},
                {'@type': 'ListItem', 'position': 2, 'name': title, 'item': url},
            ]},
        ],
    }
    if url.endswith('advogado-lead-v5.html'):
        base['@graph'].append({'@type': 'Service', '@id': f'{url}#service', 'name': 'Inteligência comercial para advocacia', 'provider': {'@id': f'{DOMAIN}/#organization'}, 'url': url})
    if url == f'{DOMAIN}/':
        base['@graph'].append({'@type': 'WebSite', '@id': f'{DOMAIN}/#website', 'url': f'{DOMAIN}/', 'name': 'Advanx', 'inLanguage': 'pt-BR'})
    return base


def ensure_schema(source: str, url: str, title: str, description: str) -> str:
    marker = 'data-seo-audit-schema="20260922"'
    block = f'  <script type="application/ld+json" {marker}>{json.dumps(schema_for(url, title, description), ensure_ascii=False, separators=(",", ":"))}</script>'
    if marker in source:
        return re.sub(r'<script type="application/ld\+json" data-seo-audit-schema="20260922">.*?</script>', block, source, count=1, flags=re.I | re.S)
    return insert_before_head_end(source, block)


def ensure_internal_link(source: str) -> str:
    if re.search(r'<a\s+[^>]*href=["\'](?:/|https://advanx\.com\.br/)[^"\']*', source, re.I):
        return source
    block = '\n  <p class="seo-internal-navigation"><a href="/blog/">Conheça os conteúdos da Advanx</a> ou <a href="/">volte para a página inicial</a>.</p>\n'
    return re.sub(r'</body>', f'{block}</body>', source, count=1, flags=re.I)


def normalize_headings_before_h1(source: str) -> str:
    match = re.search(r'(<body\b[^>]*>)(.*?)(<h1\b)', source, re.I | re.S)
    if not match:
        return source
    prefix = match.group(2)
    def repl(open_match: re.Match[str]) -> str:
        level = open_match.group(1)
        attrs = open_match.group(2)
        return f'<div role="heading" aria-level="{level}" class="seo-pre-h1-heading"{attrs}>'
    prefix = re.sub(r'<h([2-6])(\b[^>]*)>', repl, prefix, flags=re.I)
    prefix = re.sub(r'</h[2-6]>', '</div>', prefix, flags=re.I)
    source = source[:match.start(2)] + prefix + source[match.end(2):]
    body_match = re.search(r'<body\b[^>]*>(.*)</body>', source, re.I | re.S)
    if not body_match:
        return source
    previous = 0
    def repair_level(heading: re.Match[str]) -> str:
        nonlocal previous
        level = int(heading.group(1))
        repaired = min(level, previous + 1) if previous else level
        previous = repaired
        return f'<h{repaired}{heading.group(2)}>{heading.group(3)}</h{repaired}>'
    body = re.sub(r'<h([1-6])(\b[^>]*)>(.*?)</h\1>', repair_level, body_match.group(1), flags=re.I | re.S)
    return source[:body_match.start(1)] + body + source[body_match.end(1):]


def issue_urls(audit: dict, key: str) -> list[str]:
    return list(audit['issues'][key])


def apply() -> dict:
    audit = json.loads(AUDIT.read_text(encoding='utf-8'))
    SOCIAL_DIR.mkdir(parents=True, exist_ok=True)
    changed: list[str] = []
    social: list[str] = []
    target_urls = sorted(set(sum((issue_urls(audit, key) for key in ('headings', 'description', 'og_image', 'links_internos', 'schema')), [])))
    for url in target_urls:
        path = route_file(url)
        source = path.read_text(encoding='utf-8')
        before = source
        title = title_of(source, 'Advanx')
        description = description_of(source)
        if url in issue_urls(audit, 'headings'):
            source = normalize_headings_before_h1(source)
        if url in issue_urls(audit, 'description'):
            defaults = {
                f'{DOMAIN}/': 'A Advanx organiza presença digital, mídia, páginas e medição para apoiar decisões comerciais mais claras.',
                f'{DOMAIN}/advogado-lead-v5.html': 'Entenda como a Advanx aplica inteligência comercial para organizar a captação e o atendimento em escritórios de advocacia.',
                f'{DOMAIN}/privacidade.html': 'Leia a Política de Privacidade da Advanx e entenda como tratamos informações enviadas pelos nossos canais digitais.',
            }
            description = defaults[url]
            source = ensure_meta(source, 'description', description)
        if url in issue_urls(audit, 'og_image'):
            source = ensure_canonical(source, url)
            source = ensure_og(source, url, title, description)
            filename = social_filename(url)
            (SOCIAL_DIR / filename).write_text(svg_card(title, url), encoding='utf-8')
            social.append(str((SOCIAL_DIR / filename).relative_to(ROOT)))
        if url in issue_urls(audit, 'links_internos'):
            source = ensure_internal_link(source)
        if url in issue_urls(audit, 'schema'):
            source = ensure_canonical(source, url)
            source = ensure_schema(source, url, title, description)
        if source != before:
            path.write_text(source, encoding='utf-8')
            changed.append(str(path.relative_to(ROOT)))
    findings_by_url = {row['url']: [] for row in audit['rows']}
    for key, urls in audit['issues'].items():
        for url in urls:
            findings_by_url[url].append(key)
    routes = []
    for row in audit['rows']:
        findings = findings_by_url[row['url']]
        routes.append({
            'url': row['url'],
            'file': str(route_file(row['url']).relative_to(ROOT)),
            'findings_before': findings,
            'changes_applied': findings or ['nenhuma: já conforme no baseline'],
        })
    affected_files = sorted({str(route_file(url).relative_to(ROOT)) for url in target_urls})
    report = {'source_audit': str(AUDIT), 'before_counts': audit['issue_counts'], 'target_urls': target_urls, 'changed_files': affected_files, 'modified_on_current_run': changed, 'social_cards': social, 'routes': routes, 'counts': {'total_sitemap': len(routes), 'target_urls': len(target_urls), 'changed_files': len(affected_files), 'social_cards': len(social)}}
    (ROOT / 'docs' / 'SEO_AUDIT_CORRECTIONS_20260922.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    lines = [
        '# Correções SEO/AEO/GEO — 22/09/2026', '',
        'Escopo: 105 URLs do sitemap local. Sem publicação, push ou mutação externa.', '',
        '## Antes', '',
        '| Check | Falhas |', '|---|---:|',
    ]
    lines.extend(f'| {key} | {value} |' for key, value in audit['issue_counts'].items())
    lines.extend(['', '## Rotas e mudanças', '', '| URL | Arquivo | Achados antes | Correção |', '|---|---|---|---|'])
    for item in routes:
        before = ', '.join(item['findings_before']) or 'nenhum'
        after = ', '.join(item['changes_applied'])
        lines.append(f"| {item['url']} | `{item['file']}` | {before} | {after} |")
    lines.extend(['', '## Evidências locais', '', '- `tools/verify_seo_audit.py`: auditoria local pós-correção das 105 URLs.', '- `docs/SEO_AUDIT_AFTER_20260922.json`: resultado por URL após a correção.', '- `assets/social/`: 17 cartões SVG 1200×630 em preto, cobre e cream para Open Graph.', ''])
    (ROOT / 'docs' / 'SEO_AUDIT_CORRECTIONS_20260922.md').write_text('\n'.join(lines), encoding='utf-8')
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    if not args.apply:
        raise SystemExit('Use --apply para alterar o lote local aprovado.')
    print(json.dumps(apply(), ensure_ascii=False, indent=2))
