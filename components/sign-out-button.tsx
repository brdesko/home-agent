"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-[12px] transition-colors"
      style={{ color: 'oklch(1 0 0 / 0.35)' }}
      onMouseEnter={e => (e.currentTarget.style.color = 'oklch(1 0 0 / 0.70)')}
      onMouseLeave={e => (e.currentTarget.style.color = 'oklch(1 0 0 / 0.35)')}
    >
      Sign out
    </button>
  );
}
