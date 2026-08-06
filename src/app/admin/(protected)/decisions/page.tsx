import { redirect } from "next/navigation";

// Decisions now live inside the Email hub. The per-group send flows remain at
// /admin/decisions/accepted and /admin/decisions/waitlist.
export default function DecisionsIndex() {
  redirect("/admin/broadcasts");
}
