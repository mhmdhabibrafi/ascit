import { redirect } from "next/navigation";
import { requireSession } from "@/lib/api";
import ProfileClient from "./profile-client";

export const metadata = {
  title: "Profil Pengguna",
  description: "Pengaturan akun dan profil pengguna"
};

export default async function ProfilePage() {
  const { session } = await requireSession();
  if (!session) redirect("/login");

  return <ProfileClient user={session.user as any} />;
}
