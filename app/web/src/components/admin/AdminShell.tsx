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
    <div className="admin-theme min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen gap-3 p-3">
        <AdminSidebar />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <AdminTopbar name={name} />
          <main className="flex-1 rounded-2xl border border-border bg-popover/40 p-5 shadow-card lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
