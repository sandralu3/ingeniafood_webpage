export const SANDRA_ADMIN_EMAIL = "sandralu317@hotmail.com";

export function isSandraAdmin(email: string | null | undefined): boolean {
  return email?.toLowerCase() === SANDRA_ADMIN_EMAIL.toLowerCase();
}
