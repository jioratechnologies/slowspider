"use client";

// Rich-text notes are authored by one workspace member and rendered in everyone else's
// browser, so the stored HTML is untrusted input on the way back out. Everything outside
// this allowlist is unwrapped (children kept, tag dropped) rather than deleted, so
// sanitizing never silently eats someone's text.

const ALLOWED_TAGS = new Set([
  "P", "BR", "DIV", "SPAN", "B", "STRONG", "I", "EM", "U", "S", "CODE", "PRE",
  "UL", "OL", "LI", "BLOCKQUOTE", "H1", "H2", "H3", "H4", "A",
  "TABLE", "THEAD", "TBODY", "TR", "TH", "TD",
]);

function safeHref(value: string): string | null {
  const v = value.trim();
  // A scheme-relative or javascript:/data: href is the whole attack surface here.
  if (/^(https?:|mailto:)/i.test(v)) return v;
  if (v.startsWith("/") && !v.startsWith("//")) return v;
  return null;
}

export function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") return "";
  const doc = new DOMParser().parseFromString(`<div id="root">${html}</div>`, "text/html");
  const root = doc.getElementById("root")!;

  const walk = (node: Element) => {
    [...node.children].forEach(walk);

    if (!ALLOWED_TAGS.has(node.tagName)) {
      node.replaceWith(...node.childNodes);
      return;
    }
    for (const attr of [...node.attributes]) {
      const name = attr.name.toLowerCase();
      if (node.tagName === "A" && name === "href") {
        const href = safeHref(attr.value);
        if (href) node.setAttribute("href", href);
        else node.removeAttribute("href");
        continue;
      }
      node.removeAttribute(attr.name);
    }
    if (node.tagName === "A") {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer nofollow");
    }
  };

  [...root.children].forEach(walk);
  return root.innerHTML;
}
