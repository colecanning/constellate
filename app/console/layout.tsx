import { ConsoleSidebar } from "@/components/console/console-sidebar";

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <ConsoleSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
