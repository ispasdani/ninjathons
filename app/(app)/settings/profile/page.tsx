import type { Metadata } from "next";

import { ProfileEditor } from "@/components/profile/profile-editor";

export const metadata: Metadata = { title: "Edit profile" };

export default function EditProfilePage() {
  return (
    <div>
      <p className="font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">Settings</p>
      <h1 className="mt-2 text-3xl sm:text-4xl">Edit profile</h1>
      <div className="mt-8">
        <ProfileEditor />
      </div>
    </div>
  );
}
