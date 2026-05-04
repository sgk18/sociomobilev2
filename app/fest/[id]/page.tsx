import FestDetailClient from "./FestDetailClient";

export async function generateStaticParams() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase credentials missing during build-time generateStaticParams");
    return [];
  }

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/fests?select=id`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });

    if (!res.ok) throw new Error(`Supabase fetch failed: ${res.statusText}`);
    
    const fests = await res.json();
    return (fests || []).map((f: any) => ({
      id: String(f.id),
    }));
  } catch (err) {
    console.error("Error generating static params for fests:", err);
    return [];
  }
}

export default async function FestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FestDetailClient festId={id} />;
}
