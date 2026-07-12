import type { AuthError, SupabaseClient } from "@supabase/supabase-js";
import type { PendingRecoveryToken } from "@/lib/auth/pending-recovery-token";

export function isRecoveryLinkExpiredError(error: AuthError | null | undefined): boolean {
  if (!error) return false;

  return (
    error.code === "otp_expired" ||
    /expired|invalid|already been used|flow state/i.test(error.message ?? "")
  );
}

export async function activateRecoverySession(
  supabase: SupabaseClient,
  token: PendingRecoveryToken
): Promise<{ error: AuthError | null }> {
  if (token.tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: token.tokenHash,
      type: "recovery"
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
      message: "No recovery session",
      status: 401
    } as AuthError
  };
}
