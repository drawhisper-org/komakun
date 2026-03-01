"use client";

import { useThemeSync } from "@/hooks/use-theme-sync";
import { useUserStore } from "@/stores/user-store";
import { LandingPage } from "@/components/landing/landing-page";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = useUserStore((s) => s.userId);

  useThemeSync();

  if (!userId) {
    return <LandingPage />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <DashboardSidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
        <DashboardTopbar />
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
