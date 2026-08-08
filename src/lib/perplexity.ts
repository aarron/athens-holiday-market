/**
 * Thin Perplexity Sonar client for web-grounded search. Used as the primary
 * discovery provider for artist scouting so we don't lean on Anthropic's
 * web-search server tool (which has a tighter account-level usage cap). Sonar
 * searches the web itself and returns a normal chat completion; we ask for a
 * JSON array and parse it downstream.
 *
 * No SDK — a single fetch to the OpenAI-compatible endpoint.
 */

export type PerplexityResult =
  | { ok: true; text: string }
  | { ok: false; status: number | null; error: string };

export function hasPerplexity(): boolean {
  return !!process.env.PERPLEXITY_API_KEY;
}

export async function perplexityChat(
  system: string,
  user: string,
  opts: { model?: string; maxTokens?: number; timeoutMs?: number } = {},
): Promise<PerplexityResult> {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) return { ok: false, status: null, error: "PERPLEXITY_API_KEY not set" };

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 60_000);
  try {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: opts.model ?? "sonar",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_tokens: opts.maxTokens ?? 1800,
        temperature: 0.2,
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, status: res.status, error: body.slice(0, 200) };
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return { ok: true, text: json?.choices?.[0]?.message?.content ?? "" };
  } catch (e) {
    return { ok: false, status: null, error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(t);
  }
}
