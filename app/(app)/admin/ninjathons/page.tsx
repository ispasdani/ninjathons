import type { Metadata } from "next";

import { AdminNinjathonList } from "@/components/admin/ninjathon-list";

export const metadata: Metadata = { title: "Ninjathons · Admin", robots: { index: false } };

export default function AdminNinjathons() {
  return <AdminNinjathonList />;
}
