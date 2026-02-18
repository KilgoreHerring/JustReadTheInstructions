import Link from "next/link";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const errorMessages: Record<string, string> = {
    AccessDenied: "Your email address is not on the approved access list. Contact an administrator to request access.",
    Configuration: "There is a problem with the server configuration. Contact an administrator.",
    Default: "An authentication error occurred. Please try again.",
  };

  const message = errorMessages[error ?? ""] || errorMessages.Default;

  return (
    <div className="flex items-center justify-center h-screen bg-[var(--muted)]">
      <div className="text-center max-w-md">
        <h1
          className="text-2xl font-semibold tracking-tight mb-1"
          style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
        >
          Access Denied
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mb-6">{message}</p>
        <Link
          href="/auth/signin"
          className="inline-flex items-center px-4 py-2 bg-[var(--foreground)] text-[var(--background)] rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
