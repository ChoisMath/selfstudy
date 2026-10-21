import { AdminNav } from "@/components/admin-shared/AdminNav";
import { chrome } from "@/components/ui/chrome";

export default function GradeAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${chrome.page} [--header-h:6.25rem] lg:[--header-h:3.5rem]`}>
      <AdminNav />
      <main className="max-w-7xl mx-auto px-2 md:px-3 lg:px-4 py-3">{children}</main>
    </div>
  );
}
