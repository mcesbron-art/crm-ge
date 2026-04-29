import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Middleware Supabase — rafraîchit le cookie de session à chaque requête.
 *
 * Important : sans ce middleware, les sessions Supabase peuvent expirer prématurément
 * dans les Server Components. Voir https://supabase.com/docs/guides/auth/server-side/nextjs
 *
 * On NE FAIT PAS de redirection ici (les redirections vers /login se font dans
 * le layout (app)/layout.tsx via getServerSession). Cela permet aux pages
 * publiques (/login, /forgot-password, /reset-password, /sign/[token]) de
 * fonctionner sans auth.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Rafraîchit le token (recommandé par Supabase)
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Exclut : assets statiques + images
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
