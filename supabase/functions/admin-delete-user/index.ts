import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const serviceClient = createClient(supabaseUrl, serviceKey);

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) throw new Error("Not authenticated");

    const { data: isAdmin, error: roleError } = await userClient.rpc("has_role", {
      _user_id: authData.user.id,
      _role: "admin",
    });
    if (roleError || !isAdmin) return new Response("Forbidden", { status: 403, headers: corsHeaders });

    const { userId } = await req.json();
    if (!userId || userId === authData.user.id) throw new Error("Invalid user id");

    await serviceClient.from("messages").delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
    await serviceClient.from("matches").delete().or(`user_id.eq.${userId},matched_user_id.eq.${userId}`);
    await serviceClient.from("notifications").delete().eq("user_id", userId);
    await serviceClient.from("reports").delete().or(`reporter_id.eq.${userId},reported_user_id.eq.${userId}`);
    await serviceClient.from("reviews").delete().or(`reviewer_id.eq.${userId},reviewed_user_id.eq.${userId}`);
    await serviceClient.from("bookmarks").delete().eq("user_id", userId);
    await serviceClient.from("blocked_users").delete().or(`user_id.eq.${userId},blocked_user_id.eq.${userId}`);
    await serviceClient.from("emergency_contacts").delete().eq("user_id", userId);
    await serviceClient.from("user_contacts").delete().eq("user_id", userId);
    await serviceClient.from("trips").delete().eq("user_id", userId);
    await serviceClient.from("user_roles").delete().eq("user_id", userId);
    await serviceClient.from("profiles").delete().eq("user_id", userId);

    const { error: deleteError } = await serviceClient.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
