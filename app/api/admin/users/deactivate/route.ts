import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

// POST - Admin deactivate (ban) a user so they cannot login
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Verify the requester is an admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID wajib diisi" }, { status: 400 });
    }

    // Prevent admin from deactivating themselves
    if (userId === user.id) {
      return NextResponse.json({ error: "Anda tidak dapat menonaktifkan akun sendiri" }, { status: 400 });
    }

    // Ban the user for 10 years (effectively permanent deactivation)
    const { error } = await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: "87600h", // ~10 years
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deactivating user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}