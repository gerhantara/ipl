import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Menyimpan data pendaftaran ke tabel `profiles` secara lengkap.
 *
 * Dipanggil dari halaman register setelah signUp berhasil sebagai jaring
 * pengaman: memastikan seluruh isian form (full_name, phone, pasangan,
 * blok_rumah, status_kepemilikan, tanggal_selesai_kontrak, dst) tersimpan
 * walau trigger `handle_new_user` di database belum ada / belum lengkap.
 *
 * Keamanan: hanya user yang sedang login (session) boleh menulis profilnya
 * sendiri (userId harus sama dengan session user.id). Role selalu dipaksa
 * "warga" agar pendaftaran publik tidak bisa mengangkat diri jadi admin.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      userId,
      fullName,
      phone,
      pasangan,
      blokRumah,
      statusKepemilikan,
      tanggalSelesaiKontrak,
    } = body;

    // Hanya boleh menulis profil akun sendiri
    if (!userId || userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const status =
      statusKepemilikan === "kontrak" ? "kontrak" : "milik_sendiri";
    const profileData = {
      email: user.email ?? "",
      full_name: fullName || user.email || "",
      phone: phone || null,
      pasangan: pasangan || null,
      blok_rumah: blokRumah || null,
      status_kepemilikan: status,
      tanggal_selesai_kontrak:
        status === "kontrak" ? tanggalSelesaiKontrak || null : null,
      role: "warga",
      updated_at: new Date().toISOString(),
    };

    // Cek apakah baris profile sudah dibuat (oleh trigger on_auth_user_created)
    const { data: existing } = await adminClient
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    let error: { message: string } | null = null;

    if (!existing) {
      // Trigger belum ada / belum membuat baris → insert baru (nonaktif sampai diaktivasi admin)
      ({ error } = await adminClient.from("profiles").insert({
        id: userId,
        ...profileData,
        is_active: false,
      }));
    } else {
      // Baris sudah ada → lengkapi kolom (jangan ubah is_active agar tidak
      // memicu trigger sync_ban_on_is_active pada user yang sudah aktif)
      ({ error } = await adminClient
        .from("profiles")
        .update(profileData)
        .eq("id", userId));
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving registration profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
