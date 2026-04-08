import { AdminNav } from "@/components/admin-shared/AdminNav";

export default function GradeAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <main className="max-w-7xl mx-auto px-4 py-3">{children}</main>
    </div>
  );
}
