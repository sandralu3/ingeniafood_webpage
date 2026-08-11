/**
 * Inspect + reset premium/tester for beta.
 * Usage:
 *   node scripts/fix-tester-premium.js email@example.com            # dry-run
 *   node scripts/fix-tester-premium.js email@example.com --claimable # Free + pase 24h pendiente
 *   node scripts/fix-tester-premium.js email@example.com --activate24 # activa 24h ya
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const envPath = path.join(process.cwd(), ".env.local");
const env = Object.fromEntries(
  fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const i = line.indexOf("=");
      const key = line.slice(0, i).trim();
      let value = line.slice(i + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      return [key, value];
    })
);

const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const email = (process.argv[2] || "").trim().toLowerCase();
const mode = process.argv.includes("--activate24")
  ? "activate24"
  : process.argv.includes("--claimable")
    ? "claimable"
    : null;
const hours = 24;

if (!email) {
  console.error(
    "Usage: node scripts/fix-tester-premium.js email@example.com [--claimable|--activate24]"
  );
  process.exit(1);
}

async function findUserByEmail(needle) {
  const target = needle.toLowerCase();
  let page = 1;
  while (page <= 30) {
    const { data: listed, error: listErr } = await admin.auth.admin.listUsers({
      page,
      perPage: 200
    });
    if (listErr) throw listErr;
    const users = listed?.users || [];
    if (users.length === 0) break;
    const found = users.find((u) => (u.email || "").toLowerCase() === target);
    if (found) return found;
    if (users.length < 200) break;
    page += 1;
  }
  return null;
}

async function main() {
  const user = await findUserByEmail(email);
  if (!user) {
    console.error("USER_NOT_FOUND", email);
    process.exit(1);
  }

  console.log("USER", { id: user.id, email: user.email, created_at: user.created_at });

  const selectCols =
    "id, full_name, is_premium, is_tester, role, premium_expires_at, has_promo_claimable, promo_code_ref, redeemed_code, daily_scan_limit, openai_photo_credits, has_generated_real_photo, can_self_toggle_premium, updated_at";

  const { data: before, error: readErr } = await admin
    .from("profiles")
    .select(selectCols)
    .eq("id", user.id)
    .maybeSingle();
  if (readErr) throw readErr;

  const now = Date.now();
  const expMs = before?.premium_expires_at ? Date.parse(before.premium_expires_at) : NaN;
  const expiryActive = Number.isFinite(expMs) && expMs > now;

  console.log("PROFILE_BEFORE", before);
  console.log("DIAGNOSIS", {
    expiryActive,
    hoursLeft: expiryActive ? ((expMs - now) / 3600000).toFixed(2) : null,
    isTesterFlag: before?.is_tester === true,
    role: before?.role,
    hasPromoClaimable: before?.has_promo_claimable === true
  });

  if (!mode) {
    console.log("Dry-run only. Use --claimable (Free + activar pase) or --activate24.");
    return;
  }

  const expiresAt = new Date(now + hours * 60 * 60 * 1000).toISOString();
  const patch =
    mode === "claimable"
      ? {
          is_tester: true,
          role: "tester",
          is_premium: false,
          has_promo_claimable: true,
          premium_expires_at: null,
          promo_code_ref: "TESTER_RESET",
          redeemed_code: null,
          daily_scan_limit: 5,
          openai_photo_credits: 1,
          has_generated_real_photo: false,
          updated_at: new Date().toISOString()
        }
      : {
          is_tester: true,
          role: "tester",
          is_premium: true,
          has_promo_claimable: false,
          premium_expires_at: expiresAt,
          promo_code_ref: "TESTER_RESET",
          redeemed_code: "TESTER_RESET",
          daily_scan_limit: 20,
          openai_photo_credits: 1,
          has_generated_real_photo: false,
          updated_at: new Date().toISOString()
        };

  const { data: after, error: updErr } = await admin
    .from("profiles")
    .update(patch)
    .eq("id", user.id)
    .select(selectCols)
    .maybeSingle();
  if (updErr) throw updErr;

  console.log("PROFILE_AFTER", after);
  console.log(
    mode === "claimable"
      ? "OK: tester Free con pase 24h pendiente (banner Activar / o suscripción Paddle en Perfil)."
      : `OK: Premium 24h activo hasta ${expiresAt}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
