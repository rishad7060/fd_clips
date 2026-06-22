import { redirect } from "next/navigation";
import { AUTH_ENABLED } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";

/**
 * Admin route-group layout. Server-side backstop to the middleware: when auth is
 * enabled, only an `admin` session may proceed (else → /admin/sign-in). In
 * dev/mock mode (auth disabled) it renders for local clickthrough — the API's
 * AdminGuard still gates real data, and the mock fixtures are harmless.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let name: string | null = "Admin";

  if (AUTH_ENABLED) {
    const { auth } = await import("@/auth");
    const session = await auth();
    if (session?.role !== "admin") {
      redirect("/admin/sign-in");
    }
    name = session.user?.name ?? session.orgName ?? "Admin";
  }

  return <AdminShell name={name}>{children}</AdminShell>;
}
