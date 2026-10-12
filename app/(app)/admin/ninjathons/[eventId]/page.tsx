import type { Metadata } from "next";

import { AdminNinjathon } from "@/components/admin/ninjathon-admin";

export const metadata: Metadata = { title: "Ninjathon · Admin", robots: { index: false } };

export default async function AdminNinjathonPage({ params }: PageProps<"/admin/ninjathons/[eventId]">) {
  const { eventId } = await params;
  return <AdminNinjathon eventId={eventId} />;
}
