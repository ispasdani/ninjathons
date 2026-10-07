import type { Metadata } from "next";

import { GroupList } from "@/components/groups/group-list";

export const metadata: Metadata = { title: "Groups" };

export default function GroupsPage() {
  return <GroupList />;
}
