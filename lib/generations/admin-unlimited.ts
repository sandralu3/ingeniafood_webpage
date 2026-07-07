import { isSandraAdmin } from "@/lib/auth/sandra-admin";
import { UNLIMITED_GENERATIONS_SENTINEL } from "@/lib/generations/constants";

export function hasUnlimitedGenerations(email: string | null | undefined): boolean {
  return isSandraAdmin(email);
}

export function isUnlimitedGenerationsCount(value: number | null | undefined): boolean {
  return typeof value === "number" && value >= UNLIMITED_GENERATIONS_SENTINEL;
}

export { UNLIMITED_GENERATIONS_SENTINEL };
