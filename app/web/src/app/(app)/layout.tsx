import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { ReferralAttribute } from "@/components/ReferralAttribute";

export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <ReferralAttribute />
      {children}
    </AppShell>
  );
}
