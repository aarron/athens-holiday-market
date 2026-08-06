export type AppRole = "admin" | "judge" | "artist";

export const isStaff = (role?: AppRole) => role === "admin" || role === "judge";
