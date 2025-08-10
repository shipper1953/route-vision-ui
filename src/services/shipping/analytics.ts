import { supabase } from "@/integrations/supabase/client";

export async function logEvent(eventType: string, payload: any) {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id ?? null;

    let companyId: string | null = null;
    if (userId) {
      const { data } = await supabase.rpc('get_user_profile', { user_id: userId });
      if (Array.isArray(data) && data.length) companyId = (data[0] as any).company_id ?? null;
    }

    const { error } = await supabase.from('analytics_events').insert([
      {
        user_id: userId,
        company_id: companyId,
        event_type: eventType,
        payload,
      },
    ]);
    if (error) console.warn('logEvent insert error:', error);
  } catch (e) {
    console.warn('logEvent failed:', e);
  }
}
