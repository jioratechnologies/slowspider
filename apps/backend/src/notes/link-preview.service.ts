import { Injectable } from "@nestjs/common";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export interface LinkPreview {
  url: string;
  title: string;
  description: string;
  image: string | null;
  siteName: string | null;
}

// 1:1 port of apps/web's src/lib/services/link-preview.ts, SSRF guard included: the server
// fetches a URL the user typed, so every hostname is resolved first and rejected unless it
// lands on a public address.
@Injectable()
export class LinkPreviewService {
  private isPrivateAddress(ip: string): boolean {
    if (isIP(ip) === 6) {
      const v6 = ip.toLowerCase();
      if (v6 === "::1" || v6 === "::" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80")) return true;
      const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
      return mapped ? this.isPrivateAddress(mapped[1]) : false;
    }
    const p = ip.split(".").map(Number);
    if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return true;
    const [a, b] = p;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }

  private async assertPublicUrl(raw: string): Promise<URL> {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new Error("That doesn't look like a valid link.");
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Only http and https links are supported.");

    const host = url.hostname.replace(/^\[|\]$/g, "");
    const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true, verbatim: true });
    if (!addresses.length) throw new Error("Couldn't resolve that link.");
    if (addresses.some((a) => this.isPrivateAddress(a.address))) throw new Error("That link points somewhere private.");
    return url;
  }

  private metaTag(html: string, ...names: string[]): string | null {
    for (const name of names) {
      const re = new RegExp(
        `<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']*)["']|` + `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${name}["']`,
        "i"
      );
      const m = html.match(re);
      const v = m?.[1] ?? m?.[2];
      if (v) return v.trim();
    }
    return null;
  }

  private decodeEntities(s: string): string {
    return s
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#0?39;/g, "'")
      .replace(/&nbsp;/g, " ");
  }

  async fetchLinkPreview(raw: string): Promise<LinkPreview> {
    const url = await this.assertPublicUrl(raw);

    const res = await fetch(url, {
      redirect: "error", // a redirect could hop to a private address after the DNS check
      signal: AbortSignal.timeout(6000),
      headers: { "user-agent": "SlowSpiderBot/1.0 (+link preview)", accept: "text/html,application/xhtml+xml" },
    });
    if (!res.ok) throw new Error(`Couldn't load that link (${res.status}).`);
    if (!(res.headers.get("content-type") || "").includes("html")) {
      return { url: url.toString(), title: url.hostname, description: "", image: null, siteName: url.hostname };
    }

    const html = (await res.text()).slice(0, 300_000);
    const title = this.metaTag(html, "og:title", "twitter:title") || html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || url.hostname;
    const description = this.metaTag(html, "og:description", "twitter:description", "description") || "";
    const image = this.metaTag(html, "og:image", "twitter:image");

    return {
      url: url.toString(),
      title: this.decodeEntities(title).slice(0, 200),
      description: this.decodeEntities(description).slice(0, 400),
      image: image && /^https?:\/\//i.test(image) ? image : null,
      siteName: this.metaTag(html, "og:site_name") || url.hostname,
    };
  }
}
