import { NextResponse, type NextRequest } from "next/server";
import { isLocale } from "@/lib/domain";
import { createSupabaseClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string; id: string }> },
) {
  const { locale, id } = await params;
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "SAMEORIGIN",
  };
  if (!isLocale(locale) || !/^[a-f0-9-]{36}$/i.test(id))
    return new Response("Not found", { status: 404, headers });
  const client = await createSupabaseClient();
  const account = client ? await client.auth.getUser() : null;
  if (!account?.data.user)
    return NextResponse.redirect(
      new URL(
        `/${locale}/auth?mode=login&next=${encodeURIComponent(`/${locale}/evidence/${id}`)}`,
        request.url,
      ),
      { headers },
    );
  const { data, error } = await client!
    .from("benchmark_submissions")
    .select("object_path")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return new Response("Not found", { status: 404, headers });
  const file = await client!.storage.from("benchmark-evidence").download(data.object_path);
  if (file.error) return new Response("Evidence unavailable", { status: 404, headers });
  return new Response(await file.data.arrayBuffer(), {
    headers: {
      ...headers,
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="benchmark-${id}.pdf"`,
      "Content-Security-Policy": "sandbox; default-src 'none'; frame-ancestors 'self'",
    },
  });
}
