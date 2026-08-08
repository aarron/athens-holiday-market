"use server";

import Anthropic from "@anthropic-ai/sdk";
import { headers } from "next/headers";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export type ProofreadMode = "grammar" | "polish";

const MODE_PROMPT: Record<ProofreadMode, string> = {
  grammar:
    "Fix only grammar, spelling, and punctuation. Do NOT rewrite, reorder, or reword beyond what a correction requires. Preserve the writer's voice, facts, and first-person perspective exactly. Keep the length essentially the same. Never invent details.",
  polish:
    "Lightly tidy the writing for clarity and flow: tighten rambling sentences, fix awkward phrasing, and correct grammar and spelling. Stay firmly in the writer's own voice and keep it first-person. Do NOT invent facts, add claims, or change the meaning. Keep it roughly the same length — a little shorter is fine.",
};

/**
 * Suggest a cleaned-up version of a short piece of artist-supplied copy (a bio
 * or artist statement). Returns only the suggestion — the writer decides whether
 * to accept it, so this never mutates anything. Public (used on the unauthed
 * application form as well as the artist portal); kept cheap and tightly capped.
 */
export async function proofreadText(text: string, mode: ProofreadMode) {
  const input = (text ?? "").trim();
  if (input.length < 10) {
    return { error: "Write a little more first, then we can help polish it." };
  }
  if (input.length > 4000) {
    return { error: "That's a bit long to proofread — please trim it a little first." };
  }
  if (mode !== "grammar" && mode !== "polish") {
    return { error: "Unknown option." };
  }
  // Public endpoint on the shared Anthropic key — throttle per IP so it can't
  // be looped to burn quota. ~20 requests/minute is ample for a real writer.
  const ip = clientIp(await headers());
  if (!(await rateLimit("proofread", ip, 20, 60_000))) {
    return { error: "You're going a bit fast — give it a moment and try again." };
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("[proofread] ANTHROPIC_API_KEY not set");
    return { error: "Proofreading is unavailable right now. Please try again later." };
  }

  const client = new Anthropic();
  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1500,
      system:
        "You are a careful, light-touch copy editor helping an independent artist improve the writing on their maker-market profile. " +
        MODE_PROMPT[mode] +
        " Return ONLY the corrected text with no preamble, quotes, explanation, or markdown.",
      messages: [{ role: "user", content: input }],
    });

    const suggestion = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    if (!suggestion) {
      return { error: "Couldn't generate a suggestion. Please try again." };
    }
    return { suggestion };
  } catch (e) {
    console.error("[proofread] failed:", e);
    return { error: "Couldn't reach the proofreading service. Please try again." };
  }
}
