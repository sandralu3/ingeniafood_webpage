import type { AuthError, EmailOtpType, SupabaseClient } from "@supabase/supabase-js";
import type { PendingEmailConfirmationToken } from "@/lib/auth/pending-email-confirmation-token";

export function isEmailConfirmationLinkExpiredError(error: AuthError | null | undefined): boolean {
  if (!error) return false;

  return (
    error.code === "otp_expired" ||
    /expired|invalid|already been used|flow state/i.test(error.message ?? "")
  );
}

function resolveOtpType(type: string | null): EmailOtpType {
  if (type === "email" || type === "invite" || type === "recovery" || type === "email_change") {
    return type;
  }

  return "signup";
}

export async function activateEmailConfirmation(
  supabase: SupabaseClient,
  token: PendingEmailConfirmationToken
): Promise<{ error: AuthError | null }> {
  if (token.tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: token.tokenHash,
      type: resolveOtpType(token.type)
    });
    return { error };
  }

  if (token.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(token.code);
    return { error };
  }

  if (token.accessToken && token.refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: token.accessToken,
      refresh_token: token.refreshToken
    });
    return { error };
  }

  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (session) {
    return { error: null };
  }

  return {
    error: {
      name: "AuthApiError",
      message: "No confirmation session",
      status: 401
    } as AuthError
  };
}
