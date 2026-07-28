/**
 * Fix Premium flags:
 * - Restore Premium for admin sandralu317@hotmail.com
 * - Revoke Premium for sandravergara311@gmail.com
 *
 * Run: node scripts/revoke-premium-gmail.js
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

const ADMIN_EMAIL = "sandralu317@hotmail.com";
const REVOKE_EMAIL = process.env.REVOKE_EMAIL || "sandravergara311@gmail.com";

async function findUserByEmail(needle) {
  const target = needle.toLowerCase();
  let page = 1;
  while (page <= 20) {
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

async function setPremium(userId, enabled) {
  const { data: before } = await admin
    .from("profiles")
    .select(
      "id, is_premium, is_tester, premium_trial_remaining, premium_trial_claimed_at"
    )
    .eq("id", userId)
    .maybeSingle();
  console.log("BEFORE", JSON.stringify(before));

  const patch = enabled
    ? {
        is_premium: true,
        premium_trial_remaining: 0,
        premium_trial_claimed_at: null,
        updated_at: new Date().toISOString()
      }
    : {
        is_premium: false,
        premium_trial_remaining: 0,
        premium_trial_claimed_at:
          before?.premium_trial_claimed_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

  const { error: upErr } = await admin
    .from("profiles")
    .update(patch)
    .eq("id", userId);
  if (upErr) throw upErr;

  if (!enabled) {
    const { data: subs } = await admin
      .from("subscriptions")
      .select("id, status")
      .eq("user_id", userId);

    for (const s of subs || []) {
      if (
        [
          "active",
          "trialing",
          "past_due",
          "unpaid",
          "incomplete",
          "paused"
        ].includes(s.status)
      ) {
        await admin
          .from("subscriptions")
          .update({ status: "canceled", updated_at: new Date().toISOString() })
          .eq("id", s.id);
      }
    }
  }

  const { data: after } = await admin
    .from("profiles")
    .select(
      "id, is_premium, is_tester, premium_trial_remaining, premium_trial_claimed_at"
    )
    .eq("id", userId)
    .maybeSingle();
  console.log("AFTER", JSON.stringify(after));
}

async function main() {
  console.log("--- RESTORE ADMIN PREMIUM ---");
  const adminUser = await findUserByEmail(ADMIN_EMAIL);
  if (!adminUser) {
    console.error("ADMIN_NOT_FOUND", ADMIN_EMAIL);
    process.exit(2);
  }
  console.log("FOUND_ADMIN", adminUser.id, adminUser.email);
  await setPremium(adminUser.id, true);

  console.log("--- REVOKE TARGET PREMIUM ---");
  const revokeUser = await findUserByEmail(REVOKE_EMAIL);
  if (!revokeUser) {
    console.error("USER_NOT_FOUND", REVOKE_EMAIL);
    process.exit(2);
  }
  console.log("FOUND_REVOKE", revokeUser.id, revokeUser.email);
  await setPremium(revokeUser.id, false);

  console.log("OK");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
