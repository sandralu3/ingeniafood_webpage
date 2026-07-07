import { cn } from "@/lib/utils";

type UserAvatarProps = {
  avatarUrl?: string | null;
  initials?: string;
  size?: "sm" | "md";
  className?: string;
};

const sizeClasses = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-xs"
};

export function UserAvatar({
  avatarUrl,
  initials = "SV",
  size = "sm",
  className
}: UserAvatarProps) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-sv-surface-low ring-1 ring-sv-outline-variant/40",
        sizeClasses[size],
        className
      )}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="font-semibold text-brand-green-dark">{initials}</span>
      )}
    </div>
  );
}

export function getProfileInitials(name?: string | null, email?: string | null): string {
  const base = name?.trim() || email?.trim() || "SV";
  const parts = base.split(/\s+/).filter(Boolean);
  if (!parts.length) return "SV";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function resolveProfileDisplayName(
  fullName: string | null | undefined,
  email: string | null | undefined
): string {
  const trimmed = fullName?.trim();
  if (trimmed) return trimmed;

  if (email) {
    const localPart = email.split("@")[0] ?? "Chef";
    return localPart.charAt(0).toUpperCase() + localPart.slice(1);
  }

  return "Chef";
}
