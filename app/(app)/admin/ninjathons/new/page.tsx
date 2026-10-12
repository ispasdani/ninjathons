import type { Metadata } from "next";

import { NinjathonEditor } from "@/components/admin/ninjathon-editor";

export const metadata: Metadata = { title: "New ninjathon · Admin", robots: { index: false } };

export default function NewNinjathon() {
  return <NinjathonEditor eventId={null} />;
}
