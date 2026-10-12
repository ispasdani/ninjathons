import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { notFound } from "next/navigation";

import { api } from "@/convex/_generated/api";

// Admin pages answer 404 to everyone else (decisions §19). This is for the
// page only: every admin function checks the role itself in Convex.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const token = await (await auth()).getToken({ template: "convex" });
  const user = token ? await fetchQuery(api.user.getCurrentUser, {}, { token }) : null;
  if (user?.role !== "admin") notFound();
  return children;
}
