import type { Metadata } from "next";

import { GroupDetail } from "@/components/groups/group-detail";

export const metadata: Metadata = { title: "Group" };

export default async function GroupPage({ params }: PageProps<"/groups/[groupId]">) {
  const { groupId } = await params;
  return <GroupDetail groupId={groupId} />;
}
