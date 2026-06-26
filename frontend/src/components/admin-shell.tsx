import { ScrollArea } from "@/components/ui/scroll-area";

type AdminShellProps = {
  children: React.ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-56 shrink-0 border-r bg-sidebar text-sidebar-foreground md:flex md:flex-col">
        <div className="border-b px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Navigation
          </p>
          <p className="mt-1 text-sm font-semibold">Extech MPMS</p>
        </div>
        <ScrollArea className="flex-1 px-3 py-4">
          <p className="px-2 text-sm text-muted-foreground">
            Sidebar navigation will be added in later tasks.
          </p>
        </ScrollArea>
      </aside>
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-14 items-center border-b px-4 md:px-6">
          <h1 className="text-base font-semibold">Extech MPMS</h1>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}