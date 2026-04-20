import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/sign-out-button";

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("property_members")
    .select("role, properties(id, name, address)")
    .eq("user_id", user.id);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 px-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Home Management Platform</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome back.
          </h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Your properties
          </h2>
          {memberships && memberships.length > 0 ? (
            <ul className="space-y-2">
              {memberships.map((m) => {
                const property = m.properties as unknown as {
                  id: string;
                  name: string;
                  address: string | null;
                } | null;
                if (!property) return null;
                return (
                  <li
                    key={property.id}
                    className="border rounded-lg px-4 py-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">{property.name}</p>
                      {property.address && (
                        <p className="text-sm text-muted-foreground">
                          {property.address}
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-medium uppercase tracking-wide border rounded px-2 py-0.5">
                      {m.role}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No properties found.
            </p>
          )}
        </div>

        <SignOutButton />
      </div>
    </main>
  );
}
