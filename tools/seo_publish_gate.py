#!/usr/bin/env python3
"""Gate pós-publicação para LPs locais da Advanx.

Valida a rota local e publicada, confirma que ela está no sitemap e usa a API
oficial do Search Console para reenviar o sitemap e consultar a indexação.

Não usa a Indexing API: ela não é aplicável a páginas comerciais comuns.
"""
from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

ROOT = Path(__file__).resolve().parent.parent
SITE_URL = "sc-domain:advanx.com.br"
DEFAULT_SITEMAP = "https://advanx.com.br/sitemap.xml"
TOKEN_PATH = Path("/root/.hermes/google_search_console_token.json")
SCOPE = "https://www.googleapis.com/auth/webmasters"


class SeoTags(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.canonical = ""
        self.robots = ""
        self.schema_types: set[str] = set()
        self._inside_jsonld = False
        self._jsonld_parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        data = {key.lower(): (value or "") for key, value in attrs}
        if tag.lower() == "link" and data.get("rel", "").lower() == "canonical":
            self.canonical = data.get("href", "")
        if tag.lower() == "meta" and data.get("name", "").lower() == "robots":
            self.robots = data.get("content", "")
        if tag.lower() == "script" and data.get("type", "").lower() == "application/ld+json":
            self._inside_jsonld = True
            self._jsonld_parts = []

    def handle_data(self, data: str) -> None:
        if self._inside_jsonld:
            self._jsonld_parts.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() != "script" or not self._inside_jsonld:
            return
        self._inside_jsonld = False
        try:
            schema = json.loads("".join(self._jsonld_parts))
            graph = schema.get("@graph", [schema]) if isinstance(schema, dict) else schema
            for node in graph:
                value = node.get("@type") if isinstance(node, dict) else None
                if isinstance(value, list):
                    self.schema_types.update(item for item in value if isinstance(item, str))
                elif isinstance(value, str):
                    self.schema_types.add(value)
        except (json.JSONDecodeError, TypeError):
            pass


def get_sitemap_urls() -> set[str]:
    root = ET.parse(ROOT / "sitemap.xml").getroot()
    namespace = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    return {node.text.strip() for node in root.findall("s:url/s:loc", namespace) if node.text}


def route_file(url: str) -> Path:
    path = urlparse(url).path.strip("/")
    return ROOT / path / "index.html" if path else ROOT / "index.html"


def fetch_live(url: str) -> tuple[int, SeoTags]:
    request = urllib.request.Request(url, headers={"User-Agent": "AdvanxSeoPublishGate/1.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        body = response.read().decode("utf-8", "replace")
        tags = SeoTags()
        tags.feed(body)
        return response.status, tags


def gsc_service():
    data = json.loads(TOKEN_PATH.read_text(encoding="utf-8"))
    credentials = Credentials.from_authorized_user_info(data, scopes=[SCOPE])
    credentials.refresh(Request())
    return build("searchconsole", "v1", credentials=credentials, cache_discovery=False)


def inspect_url(service, url: str) -> dict[str, str]:
    result = service.urlInspection().index().inspect(
        body={"inspectionUrl": url, "siteUrl": SITE_URL, "languageCode": "pt-BR"}
    ).execute()
    status = result.get("inspectionResult", {}).get("indexStatusResult", {})
    return {
        "verdict": status.get("verdict", "-"),
        "coverage": status.get("coverageState", "-"),
        "canonical_google": status.get("googleCanonical", "-"),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", action="append", required=True, help="URL absoluta da rota publicada; repetir por rota")
    parser.add_argument("--sitemap-url", default=DEFAULT_SITEMAP)
    parser.add_argument("--submit-sitemap", action="store_true", help="Reenvia o sitemap ao Search Console após todos os gates passarem")
    parser.add_argument("--inspect", action="store_true", help="Consulta o status de indexação no Search Console")
    parser.add_argument("--dry-run", action="store_true", help="Nunca escreve no Search Console")
    args = parser.parse_args()

    sitemap_urls = get_sitemap_urls()
    report: dict[str, object] = {"gates": [], "urls": [], "google": {}}
    failures: list[str] = []

    for url in args.url:
        local = route_file(url)
        item = {"url": url, "local_file": str(local), "in_sitemap": url in sitemap_urls}
        if not local.is_file():
            failures.append(f"Arquivo local ausente: {local}")
        if url not in sitemap_urls:
            failures.append(f"URL fora do sitemap: {url}")
        try:
            status, tags = fetch_live(url)
            item.update({
                "live_status": status,
                "canonical": tags.canonical,
                "robots": tags.robots,
                "schema_types": sorted(tags.schema_types),
            })
            if status != 200:
                failures.append(f"URL live não respondeu 200: {url} ({status})")
            if tags.canonical != url:
                failures.append(f"Canonical divergente: {url} -> {tags.canonical or 'ausente'}")
            if "index" not in tags.robots.lower() or "follow" not in tags.robots.lower():
                failures.append(f"Robots não indexável: {url} -> {tags.robots or 'ausente'}")
            if "BreadcrumbList" not in tags.schema_types:
                failures.append(f"BreadcrumbList ausente: {url}")
        except (urllib.error.URLError, TimeoutError) as exc:
            failures.append(f"Falha ao ler URL live {url}: {exc}")
        report["urls"].append(item)

    report["gates"] = ["PASS"] if not failures else failures
    if failures:
        print(json.dumps(report, ensure_ascii=False, indent=2))
        raise SystemExit("Gate bloqueado: corrija as falhas antes de chamar o Search Console.")

    if args.submit_sitemap and not args.dry_run:
        service = gsc_service()
        service.sitemaps().submit(siteUrl=SITE_URL, feedpath=args.sitemap_url).execute()
        entries = service.sitemaps().list(siteUrl=SITE_URL).execute().get("sitemap", [])
        submitted = next((entry for entry in entries if entry.get("path") == args.sitemap_url), {})
        report["google"]["sitemap"] = {
            "submitted": True,
            "pending": submitted.get("isPending"),
            "last_submitted": submitted.get("lastSubmitted"),
            "last_downloaded": submitted.get("lastDownloaded"),
            "errors": submitted.get("errors"),
            "warnings": submitted.get("warnings"),
        }
    elif args.submit_sitemap:
        report["google"]["sitemap"] = {"submitted": False, "reason": "dry-run"}

    if args.inspect:
        service = gsc_service()
        report["google"]["inspection"] = {url: inspect_url(service, url) for url in args.url}

    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
