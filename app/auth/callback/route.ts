import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && sessionData?.user) {
      const userId = sessionData.user.id;
      const meta   = sessionData.user.user_metadata as { property_id?: string; role?: string };

      // If the invited user has a property_id in their metadata and isn't a member yet, add them
      if (meta?.property_id) {
        const admin = createAdminClient();
        const { count } = await admin
          .from('property_members')
          .select('*', { count: 'exact', head: true })
          .eq('property_id', meta.property_id)
          .eq('user_id', userId);

        if (count === 0) {
          await admin.from('property_members').insert({
            property_id: meta.property_id,
            user_id:     userId,
            role:        meta.role ?? 'owner',
          });
        }
      }

      return NextResponse.redirect(`${origin}/`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
