#!/usr/bin/env python3
"""Verificador local, sem rede, do escopo da auditoria SEO de 22/09/2026."""
from __future__ import annotations

import json
import re
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
AUDIT = Path('/root/.hermes/auditorias/auditoria-total-seo-advanx-20260922.json')

class Tags(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.h1 = 0
        self.levels: list[int] = []
        self.description = ''
        self.og: dict[str, str] = {}
        self.links: list[str] = []
        self.schemas: list[str] = []
        self.schema_types: set[str] = set()
        self._json = False
        self._parts: list[str] = []
    def handle_starttag(self, tag, attrs):
        a = {key: (value or '') for key, value in attrs}
        low = tag.lower()
        if low in {'h1','h2','h3','h4','h5','h6'}:
            self.levels.append(int(low[1]))
            self.h1 += low == 'h1'
        if low == 'meta' and a.get('name','').lower() == 'description': self.description = a.get('content','').strip()
        if low == 'meta' and a.get('property','').lower().startswith('og:'): self.og[a['property'].lower()] = a.get('content','').strip()
        if low == 'a' and (a.get('href','').startswith('/') or a.get('href','').startswith('https://advanx.com.br/')): self.links.append(a['href'])
        if low == 'script' and a.get('type','').lower() == 'application/ld+json': self._json=True; self._parts=[]
    def handle_data(self, data):
        if self._json: self._parts.append(data)
    def handle_endtag(self, tag):
        if tag.lower() == 'script' and self._json:
            self._json=False
            try:
                value = json.loads(''.join(self._parts))
                self.schemas.append('valid')
                nodes = value.get('@graph', [value]) if isinstance(value, dict) else value
                for node in nodes:
                    if not isinstance(node, dict): continue
                    kind = node.get('@type')
                    if isinstance(kind, str): self.schema_types.add(kind)
                    if isinstance(kind, list): self.schema_types.update(item for item in kind if isinstance(item, str))
            except json.JSONDecodeError: self.schemas.append('invalid')

def route(url: str) -> Path:
    p=urlparse(url).path.strip('/')
    return ROOT / ('index.html' if not p else p if Path(p).suffix else f'{p}/index.html')

def main() -> None:
    audit=json.loads(AUDIT.read_text())
    urls=[u for row in audit['rows'] for u in [row['url']]]
    issues={key: [] for key in ('arquivo_ausente','noindex','h1','headings','description','og_image','links_internos','schema','schema_invalido','schema_semantico')}
    details=[]
    for url in urls:
        f=route(url)
        if not f.exists(): issues['arquivo_ausente'].append(url); continue
        s=f.read_text(encoding='utf-8')
        t=Tags(); t.feed(s)
        if re.search(r'(?:<meta[^>]+name=["\']robots["\'][^>]+content=["\'][^"\']*noindex|<meta[^>]+content=["\'][^"\']*noindex[^"\']*["\'][^>]+name=["\']robots)', s, re.I): issues['noindex'].append(url)
        if t.h1 != 1: issues['h1'].append(url)
        if not t.levels or t.levels[0] != 1 or any(cur > prev + 1 for prev,cur in zip(t.levels,t.levels[1:])): issues['headings'].append(url)
        if not t.description: issues['description'].append(url)
        required={'og:title','og:description','og:url','og:type','og:image'}
        if not required.issubset(t.og): issues['og_image'].append(url)
        else:
            image=t.og['og:image']
            if image.startswith('https://advanx.com.br/') and not (ROOT / urlparse(image).path.strip('/')).is_file(): issues['og_image'].append(url)
        if not t.links: issues['links_internos'].append(url)
        if url in audit['issues']['schema'] and not t.schemas: issues['schema'].append(url)
        if 'invalid' in t.schemas: issues['schema_invalido'].append(url)
        required_types = set()
        if url == 'https://advanx.com.br/': required_types = {'Organization','WebSite','WebPage','BreadcrumbList'}
        elif url.endswith('advogado-lead-v5.html'): required_types = {'Service','WebPage','BreadcrumbList'}
        elif url.endswith(('privacidade.html','pagina-obrigado.html','termos-de-servico.html')): required_types = {'WebPage','BreadcrumbList'}
        if required_types and not required_types.issubset(t.schema_types): issues['schema_semantico'].append(url)
        details.append({'url':url,'file':str(f.relative_to(ROOT)),'h1':t.h1,'levels':t.levels,'schema_scripts':t.schemas,'schema_types':sorted(t.schema_types)})
    result={'total_sitemap':len(urls),'issue_counts':{k:len(v) for k,v in issues.items()},'issues':issues,'rows':details}
    cards=sorted((ROOT/'assets'/'social').glob('*.svg'))
    result['social_cards']={'count':len(cards),'xml_valid':True}
    try:
        for card in cards: ET.parse(card)
    except ET.ParseError:
        result['social_cards']['xml_valid']=False
    if len(cards) != 17 or not result['social_cards']['xml_valid']:
        result['issue_counts']['og_image'] += 1
        result['issues']['og_image'].append('assets/social')
    target=ROOT/'docs'/'SEO_AUDIT_AFTER_20260922.json'; target.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(result['issue_counts'],ensure_ascii=False,sort_keys=True))
    sys.exit(1 if any(result['issue_counts'].values()) else 0)
if __name__ == '__main__': main()
