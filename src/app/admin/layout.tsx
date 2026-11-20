import { AdminNav } from "@/components/admin-shared/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-gray-50">
      <AdminNav />
      <main className="max-w-7xl mx-auto px-2 md:px-3 lg:px-4 py-6">{children}</main>
    </div>
  );
}
