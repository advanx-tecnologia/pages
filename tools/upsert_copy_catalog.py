#!/usr/bin/env python3
"""Upsert de novas copys no scripts_data.json.

Uso:
  python3 tools/upsert_copy_catalog.py --input nova_copy.json
  cat lote.json | python3 tools/upsert_copy_catalog.py --stdin

Formato aceito:
  {"niche":"Previdenciário","title":"...","content":"..."}
ou
  [{...}, {...}]

Regra de deduplicação:
  niche + title (case-insensitive, trim)
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / 'scripts_data.json'


def norm(value: str) -> str:
    return ' '.join((value or '').strip().lower().split())


def load_payload(args: argparse.Namespace) -> list[dict[str, Any]]:
    if args.stdin:
        raw = input_stream()
    elif args.input:
        raw = Path(args.input).read_text(encoding='utf-8')
    else:
        raise SystemExit('Use --input arquivo.json ou --stdin')
    payload = json.loads(raw)
    if isinstance(payload, dict):
        payload = [payload]
    if not isinstance(payload, list):
        raise SystemExit('Payload inválido: esperado objeto ou lista')
    cleaned = []
    for item in payload:
        if not isinstance(item, dict):
            continue
        niche = str(item.get('niche') or item.get('nicho') or '').strip()
        title = str(item.get('title') or item.get('titulo') or '').strip()
        content = str(item.get('content') or item.get('copy') or item.get('roteiro') or '').strip()
        if not niche or not title or not content:
            continue
        cleaned.append({'niche': niche, 'title': title, 'content': content})
    return cleaned


def input_stream() -> str:
    import sys
    return sys.stdin.read()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', help='Arquivo JSON com uma copy ou lista de copys')
    parser.add_argument('--stdin', action='store_true', help='Ler JSON via stdin')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()

    incoming = load_payload(args)
    if not incoming:
        raise SystemExit('Nenhuma copy válida encontrada no payload.')

    existing = json.loads(DATA_FILE.read_text(encoding='utf-8-sig'))
    index = {(norm(item.get('niche', '')), norm(item.get('title', ''))): i for i, item in enumerate(existing)}

    inserted = 0
    updated = 0
    for item in incoming:
        key = (norm(item['niche']), norm(item['title']))
        if key in index:
            pos = index[key]
            if existing[pos].get('content') != item['content']:
                existing[pos] = item
                updated += 1
        else:
            existing.append(item)
            index[key] = len(existing) - 1
            inserted += 1

    existing.sort(key=lambda x: (norm(x.get('niche', '')), norm(x.get('title', ''))))

    if not args.dry_run:
        DATA_FILE.write_text(json.dumps(existing, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')

    print(json.dumps({
        'file': str(DATA_FILE),
        'received': len(incoming),
        'inserted': inserted,
        'updated': updated,
        'total_after': len(existing),
        'dry_run': args.dry_run,
    }, ensure_ascii=False))


if __name__ == '__main__':
    main()
