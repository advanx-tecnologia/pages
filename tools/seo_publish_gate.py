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
from typing import Any
from urllib.parse import urlparse, urlunparse

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

ROOT = Path(__file__).resolve().parent.parent
SITE_URL = "sc-domain:advanx.com.br"
DEFAULT_SITEMAP = "https://advanx.com.br/sitemap.xml"
TOKEN_PATH = Path("/root/.hermes/google_search_console_token.json")
SCOPES = ["https://www.googleapis.com/auth/webmasters"]
AI_CRAWLERS = [
    "GPTBot",
    "OAI-SearchBot",
    "ClaudeBot",
    "Claude-SearchBot",
    "PerplexityBot",
    "Google-Extended",
    "CCBot",
]


class SeoTags(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.canonical = ""
        self.robots = ""
        self.description = ""
        self.viewport = ""
        self.title = ""
        self.og: dict[str, str] = {}
        self.h1_texts: list[str] = []
        self.heading_levels: list[int] = []
        self.internal_links: list[str] = []
        self.images: list[dict[str, str]] = []
        self.schema_types: set[str] = set()
        self._inside_title = False
        self._inside_h1 = False
        self._title_parts: list[str] = []
        self._h1_parts: list[str] = []
        self._inside_jsonld = False
        self._jsonld_parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        data = {key.lower(): (value or "") for key, value in attrs}
        if tag.lower() == "link" and data.get("rel", "").lower() == "canonical":
            self.canonical = data.get("href", "")
        if tag.lower() == "meta" and data.get("name", "").lower() == "robots":
            self.robots = data.get("content", "")
        if tag.lower() == "meta" and data.get("name", "").lower() == "description":
            self.description = data.get("content", "").strip()
        if tag.lower() == "meta" and data.get("name", "").lower() == "viewport":
            self.viewport = data.get("content", "").strip()
        if tag.lower() == "meta" and data.get("property", "").lower().startswith("og:"):
            self.og[data.get("property", "").lower()] = data.get("content", "").strip()
        if tag.lower() == "title":
            self._inside_title = True
            self._title_parts = []
        if tag.lower() == "h1":
            self._inside_h1 = True
            self._h1_parts = []
        if tag.lower() in {"h1", "h2", "h3", "h4", "h5", "h6"}:
            self.heading_levels.append(int(tag[1]))
        if tag.lower() == "a":
            href = data.get("href", "").strip()
            if href.startswith("/") or href.startswith("https://advanx.com.br/"):
                self.internal_links.append(href)
        if tag.lower() == "img":
            self.images.append({key: data.get(key, "") for key in ("src", "width", "height", "loading")})
        if tag.lower() == "script" and data.get("type", "").lower() == "application/ld+json":
            self._inside_jsonld = True
            self._jsonld_parts = []

    def handle_data(self, data: str) -> None:
        if self._inside_title:
            self._title_parts.append(data)
        if self._inside_h1:
            self._h1_parts.append(data)
        if self._inside_jsonld:
            self._jsonld_parts.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "title" and self._inside_title:
            self._inside_title = False
            self.title = " ".join("".join(self._title_parts).split())
        if tag.lower() == "h1" and self._inside_h1:
            self._inside_h1 = False
            self.h1_texts.append(" ".join("".join(self._h1_parts).split()))
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
    if not path:
        return ROOT / "index.html"
    if Path(path).suffix:
        return ROOT / path
    return ROOT / path / "index.html"


def fetch_text(url: str) -> tuple[int, str, dict[str, str], str]:
    request = urllib.request.Request(url, headers={"User-Agent": "AdvanxSeoPublishGate/1.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        body = response.read().decode("utf-8", "replace")
        headers = {key.lower(): value for key, value in response.headers.items()}
        return response.status, response.geturl(), headers, body


def fetch_live(url: str) -> tuple[int, str, dict[str, str], SeoTags]:
    status, final_url, headers, body = fetch_text(url)
    tags = SeoTags()
    tags.feed(body)
    return status, final_url, headers, tags


def http_url(url: str) -> str:
    parsed = urlparse(url)
    return urlunparse(parsed._replace(scheme="http"))


def heading_hierarchy_valid(levels: list[int]) -> bool:
    return bool(levels) and levels[0] == 1 and all(current <= previous + 1 for previous, current in zip(levels, levels[1:]))


def optimized_image(src: str) -> bool:
    clean = src.lower().split("?", 1)[0]
    if clean.endswith((".webp", ".avif", ".svg")):
        return True
    if "res.cloudinary.com" in clean and ("/f_auto" in clean or "f_auto," in clean):
        return True
    return src.startswith("data:image/")


def parse_robots_groups(text: str) -> list[tuple[list[str], list[str]]]:
    groups: list[tuple[list[str], list[str]]] = []
    agents: list[str] = []
    rules: list[str] = []
    for raw in text.splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line or ":" not in line:
            continue
        key, value = (part.strip() for part in line.split(":", 1))
        key = key.lower()
        if key == "user-agent":
            if rules:
                groups.append((agents, rules))
                agents, rules = [], []
            agents.append(value.lower())
        elif agents and key in {"allow", "disallow"}:
            rules.append(f"{key}:{value}")
    if agents or rules:
        groups.append((agents, rules))
    return groups


def robots_allows_root(text: str, agent: str) -> bool:
    groups = parse_robots_groups(text)
    matched = [rules for agents, rules in groups if agent.lower() in agents]
    if not matched:
        matched = [rules for agents, rules in groups if "*" in agents]
    rules = [rule for group in matched for rule in group]
    return not any(rule.lower().replace(" ", "") == "disallow:/" for rule in rules)


def gsc_service():
    data = json.loads(TOKEN_PATH.read_text(encoding="utf-8"))
    credentials = Credentials.from_authorized_user_info(data, scopes=SCOPES)
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
    report: dict[str, Any] = {"gates": [], "urls": [], "google": {}}
    failures: list[str] = []

    try:
        robots_status, _, _, robots_body = fetch_text("https://advanx.com.br/robots.txt")
        if robots_status != 200:
            failures.append(f"robots.txt live não respondeu 200 ({robots_status})")
        blocked_agents = [agent for agent in AI_CRAWLERS if not robots_allows_root(robots_body, agent)]
        if not robots_allows_root(robots_body, "Googlebot"):
            failures.append("robots.txt bloqueia Googlebot na raiz")
        if blocked_agents:
            failures.append(f"robots.txt bloqueia rastreadores de IA na raiz: {', '.join(blocked_agents)}")
        if args.sitemap_url not in robots_body:
            failures.append(f"robots.txt não referencia o sitemap: {args.sitemap_url}")
        report["robots"] = {"status": robots_status, "ai_agents_allowed": sorted(set(AI_CRAWLERS) - set(blocked_agents))}
    except (urllib.error.URLError, TimeoutError) as exc:
        failures.append(f"Falha ao ler robots.txt live: {exc}")

    try:
        sitemap_status, _, _, sitemap_body = fetch_text(args.sitemap_url)
        live_root = ET.fromstring(sitemap_body)
        namespace = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
        live_sitemap_urls = {node.text.strip() for node in live_root.findall("s:url/s:loc", namespace) if node.text}
        report["sitemap"] = {"status": sitemap_status, "url_count": len(live_sitemap_urls)}
    except (urllib.error.URLError, TimeoutError, ET.ParseError) as exc:
        live_sitemap_urls = set()
        failures.append(f"Sitemap live inválido ou inacessível: {exc}")

    for url in args.url:
        local = route_file(url)
        item = {"url": url, "local_file": str(local), "in_sitemap": url in sitemap_urls}
        if not local.is_file():
            failures.append(f"Arquivo local ausente: {local}")
        if url not in sitemap_urls:
            failures.append(f"URL fora do sitemap: {url}")
        try:
            status, final_url, headers, tags = fetch_live(url)
            item.update({
                "live_status": status,
                "final_url": final_url,
                "canonical": tags.canonical,
                "robots": tags.robots,
                "title": tags.title,
                "description": tags.description,
                "h1_count": len(tags.h1_texts),
                "h1": tags.h1_texts,
                "og_image": tags.og.get("og:image", ""),
                "internal_links": len(tags.internal_links),
                "schema_types": sorted(tags.schema_types),
            })
            if status != 200:
                failures.append(f"URL live não respondeu 200: {url} ({status})")
            if tags.canonical != url:
                failures.append(f"Canonical divergente: {url} -> {tags.canonical or 'ausente'}")
            robots_value = f"{tags.robots},{headers.get('x-robots-tag', '')}".lower()
            if "noindex" in robots_value or "nofollow" in robots_value or "index" not in tags.robots.lower() or "follow" not in tags.robots.lower():
                failures.append(f"Robots não indexável: {url} -> {tags.robots or 'ausente'}")
            if not tags.title or not tags.description:
                failures.append(f"Title ou meta description ausente: {url}")
            if len(tags.h1_texts) != 1 or not tags.h1_texts[0]:
                failures.append(f"Página deve ter exatamente um H1 descritivo: {url} ({len(tags.h1_texts)})")
            if not heading_hierarchy_valid(tags.heading_levels):
                failures.append(f"Hierarquia de headings inválida: {url} -> {tags.heading_levels}")
            if "width=device-width" not in tags.viewport.lower():
                failures.append(f"Viewport mobile ausente ou inválido: {url}")
            required_og = {"og:title", "og:description", "og:url", "og:type", "og:image"}
            missing_og = sorted(required_og - set(tags.og))
            if missing_og:
                failures.append(f"Open Graph incompleto em {url}: {', '.join(missing_og)}")
            if not tags.internal_links:
                failures.append(f"Links internos contextuais ausentes: {url}")
            required_schema = {"Service", "WebPage", "BreadcrumbList"}
            missing_schema = sorted(required_schema - tags.schema_types)
            if missing_schema:
                failures.append(f"Schemas obrigatórios ausentes em {url}: {', '.join(missing_schema)}")
            images_without_dimensions = [image["src"] for image in tags.images if not image["width"] or not image["height"]]
            if images_without_dimensions:
                failures.append(f"Imagens sem width/height em {url}: {images_without_dimensions}")
            unoptimized_images = [image["src"] for image in tags.images if image["src"] and not optimized_image(image["src"])]
            if unoptimized_images:
                failures.append(f"Imagens sem formato/transformação otimizada em {url}: {unoptimized_images}")
            if url not in live_sitemap_urls:
                failures.append(f"URL fora do sitemap publicado: {url}")
            try:
                http_status, http_final_url, _, _ = fetch_text(http_url(url))
                if http_status != 200 or http_final_url != url:
                    failures.append(f"HTTP não redireciona para HTTPS canônico: {http_url(url)} -> {http_final_url} ({http_status})")
            except (urllib.error.URLError, TimeoutError) as exc:
                failures.append(f"Falha ao validar redirect HTTP → HTTPS de {url}: {exc}")
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
