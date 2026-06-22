import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";

/**
 * Admin dashboard frame: fixed left sidebar + top welcome bar + scrollable
 * content. Wrapped in `.admin-theme` (a marker; shadcn tokens live on :root).
 */
export function AdminShell({
  children,
  name,
}: {
  children: React.ReactNode;
  name?: string | null;
}) {
  return (
    <div className="admin-theme flex min-h-screen bg-background text-foreground">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar name={name} />
        <main className="flex-1 p-5 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
