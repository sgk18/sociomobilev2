
import ClubDetailClient from "./ClubDetailClient";

export async function generateStaticParams() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase credentials missing during build-time generateStaticParams");
    return [];
  }

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/clubs?select=slug,club_id`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });

    if (!res.ok) throw new Error(`Supabase fetch failed: ${res.statusText}`);
    
    const clubs = await res.json();
    const params: { id: string }[] = [];

    (clubs || []).forEach((c: any) => {
      if (c.slug) params.push({ id: String(c.slug) });
      if (c.club_id) params.push({ id: String(c.club_id) });
    });

    return params;
  } catch (err) {
    console.error("Error generating static params for clubs:", err);
    return [];
  }
}

export default async function ClubDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClubDetailClient id={id} />;
}
