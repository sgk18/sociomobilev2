import RegisterClient from "./RegisterClient";

export async function generateStaticParams() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase credentials missing during build-time generateStaticParams");
    return [];
  }

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/events?select=event_id`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });

    if (!res.ok) throw new Error(`Supabase fetch failed: ${res.statusText}`);
    
    const events = await res.json();
    return (events || []).map((e: any) => ({
      id: String(e.event_id),
    }));
  } catch (err) {
    console.error("Error generating static params for event registration:", err);
    return [];
  }
}

export default async function RegisterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RegisterClient eventId={id} />;
}
