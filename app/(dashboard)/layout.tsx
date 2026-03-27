import { requireAuth } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar user={user} />
      <div className="flex-1 ml-60 min-h-screen">
        <main className="max-w-7xl mx-auto px-6 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
