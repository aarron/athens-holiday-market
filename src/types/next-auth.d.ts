import type { DefaultSession } from "next-auth";
import type { AppRole } from "@/auth";

declare module "next-auth" {
  interface Session {
    user: {
      role?: AppRole;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: AppRole;
  }
}
