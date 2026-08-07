import { site } from "@/lib/site";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** A single call-to-action block: `[[Label]](https://url)` on its own line. */
const BUTTON_RE = /^\[\[(.+?)\]\]\((https?:\/\/[^\s)]+)\)$/;

/** Bulletproof (table-based) email button — renders reliably across clients. */
function buttonHtml(label: string, url: string): string {
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;border-collapse:separate">` +
    `<tr><td align="center" bgcolor="#d21c96" style="border-radius:8px">` +
    `<a href="${url}" style="display:inline-block;padding:13px 30px;font-family:Helvetica,Arial,sans-serif;` +
    `font-size:15px;font-weight:bold;line-height:1;color:#ffffff;text-decoration:none;border-radius:8px">` +
    `${escapeHtml(label)}</a></td></tr></table>`
  );
}

/**
 * Minimal, safe markdown → email HTML.
 * Supports paragraphs, line breaks, **bold**, *italic*, [links](url),
 * [[button label]](url) call-to-action buttons, and - lists.
 */
export function renderMarkdown(src: string): string {
  const inline = (s: string) =>
    escapeHtml(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<em>$2</em>")
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" style="color:#17a898;text-decoration:underline">$1</a>',
      );

  return src
    .trim()
    .split(/\n{2,}/)
    .map((block) => {
      const trimmed = block.trim();
      const btn = trimmed.match(BUTTON_RE);
      if (btn) return buttonHtml(btn[1], btn[2]);

      const lines = block.split("\n");
      if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
        const items = lines
          .map((l) => `<li style="margin:4px 0">${inline(l.replace(/^\s*[-*]\s+/, ""))}</li>`)
          .join("");
        return `<ul style="margin:0 0 14px;padding-left:20px;line-height:1.6">${items}</ul>`;
      }
      return `<p style="margin:0 0 14px;line-height:1.65">${lines.map(inline).join("<br/>")}</p>`;
    })
    .join("");
}

/** The shared branded email shell (logo on paper, multi-color stripe, footer). */
export function emailShell(inner: string, opts?: { unsubscribeUrl?: string }): string {
  const unsub = opts?.unsubscribeUrl
    ? `<br/><a href="${opts.unsubscribeUrl}" style="color:#8a857f;text-decoration:underline">Unsubscribe</a>`
    : "";
  return `
  <div style="background:#faf5ea;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;color:#17161b">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ece5d6">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
        <tr>
          <td height="6" style="height:6px;background:#6cae43"></td>
          <td height="6" style="height:6px;background:#f07f22"></td>
          <td height="6" style="height:6px;background:#17a898"></td>
          <td height="6" style="height:6px;background:#b7c72c"></td>
          <td height="6" style="height:6px;background:#45bced"></td>
          <td height="6" style="height:6px;background:#9c1c50"></td>
          <td height="6" style="height:6px;background:#d21c96"></td>
        </tr>
      </table>
      <div style="text-align:center;padding:30px 28px 10px">
        <img src="${site.url}/brand/logo.png" alt="Athens Holiday Market" width="180"
             style="width:180px;max-width:62%;height:auto;display:inline-block" />
      </div>
      <div style="padding:8px 34px 6px">${inner}</div>
      <div style="padding:22px 34px 28px;border-top:1px solid #f1ebdc;color:#8a857f;font-size:12px;line-height:1.7">
        <strong style="color:#57524d">${site.name}</strong> · ${site.location.name}<br/>
        ${site.location.street} · ${site.location.city}, ${site.location.state}<br/>
        Questions? <a href="mailto:${site.contactEmail}" style="color:#17a898;text-decoration:none">${site.contactEmail}</a>${unsub}
      </div>
    </div>
  </div>`;
}
