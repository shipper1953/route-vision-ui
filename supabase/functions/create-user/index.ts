import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role: "user" | "company_admin" | "super_admin";
  company_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseServiceKey) throw new Error("Missing service role key");

    // SECURITY: Require authenticated caller and verify privileges
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerErr } = await userClient.auth.getUser();
    if (callerErr || !caller) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: callerProfile } = await supabaseAdmin
      .from("users")
      .select("role, company_id")
      .eq("id", caller.id)
      .single();

    const callerRole = callerProfile?.role as string | undefined;
    if (callerRole !== "super_admin" && callerRole !== "company_admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, password, name, role, company_id }: CreateUserRequest =
      await req.json();

    // Restrict creatable roles
    const requestedRole = role || "user";
    if (requestedRole === "super_admin") {
      return new Response(
        JSON.stringify({ error: "super_admin cannot be created via API" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (callerRole === "company_admin" && requestedRole !== "user") {
      return new Response(
        JSON.stringify({ error: "company_admin may only create user accounts" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Force company scoping for company_admin callers
    const targetCompanyId = callerRole === "super_admin"
      ? (company_id === "no_company" ? null : company_id)
      : callerProfile?.company_id;

    console.log("Creating user with service role:", { email, name, role: requestedRole, company_id: targetCompanyId });

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin
      .createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });

    if (authError) {
      console.error("Auth error:", authError);
      throw authError;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (authData.user) {
      const { error: profileError } = await supabaseAdmin
        .from("users")
        .upsert({
          id: authData.user.id,
          name,
          email,
          role: requestedRole,
          company_id: targetCompanyId,
        }, { onConflict: "id" });

      if (profileError) throw profileError;

      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: authData.user.id, role: requestedRole }, { onConflict: "user_id,role" });

      if (roleError) throw roleError;
    }

    return new Response(
      JSON.stringify({
        message: "User created successfully",
        user: authData.user,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error: any) {
    console.error("Error in create-user function:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to create user",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
};

serve(handler);
