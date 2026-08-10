import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

// Normalisasi blok menjadi slug untuk email cadangan
function emailFromBlok(blok: string): string {
  const slug = blok.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `rumah-${slug}@ipl.local`;
}

// Cari profil pemilik yang sudah terdaftar untuk sebuah blok
async function findProfileForBlok(
  adminClient: ReturnType<typeof createAdminClient>,
  blok: string
) {
  const { data } = await adminClient
    .from("profiles")
    .select("id, full_name, blok_rumah, email")
    .eq("blok_rumah", blok)
    .maybeSingle();
  return data as {
    id: string;
    full_name: string | null;
    blok_rumah: string | null;
    email: string | null;
  } | null;
}

// POST - Admin merekam pembayaran IPL atas nama blok rumah.
// Jika pemilik blok belum mendaftar, akun akan dibuat otomatis agar pembayaran
// tetap memiliki user_id (pembayaran.user_id NOT NULL REFERENCES profiles).
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Hanya admin
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
    const {
      blok_rumah,
      jenis_iuran_id,
      rekening_id,
      tanggal_bayar,
      bulan_bayar,
      nominal,
      bukti_transfer_url,
      email,
      phone,
      status,
    } = body;

    if (
      !blok_rumah ||
      !jenis_iuran_id ||
      !Array.isArray(bulan_bayar) ||
      bulan_bayar.length === 0 ||
      typeof nominal !== "number"
    ) {
      return NextResponse.json({ error: "Data pembayaran tidak lengkap" }, { status: 400 });
    }

    // Info blok dari tabel referensi `rumah`
    const { data: rumah } = await adminClient
      .from("rumah")
      .select("blok_rumah, nama_pemilik, is_double")
      .eq("blok_rumah", blok_rumah)
      .maybeSingle();

    // Cari pemilik yang sudah terdaftar
    let owner = await findProfileForBlok(adminClient, blok_rumah);

    // Belum ada akun -> buat otomatis
    let userCreated = false;
    if (!owner) {
      const ownerName = rumah?.nama_pemilik || blok_rumah;
      const ownerEmail = (email?.trim() || "").toLowerCase() || emailFromBlok(blok_rumah);
      const randomPassword = Math.random().toString(36).slice(-8) + "A1!";

      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: ownerEmail,
        password: randomPassword,
        email_confirm: true, // Auto-confirm; pemilik bisa reset password lewat lupa password
        user_metadata: { full_name: ownerName, role: "warga" },
      });

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 400 });
      }

      if (newUser.user) {
        await adminClient
          .from("profiles")
          .update({
            full_name: ownerName,
            phone: phone || null,
            blok_rumah,
            status_kepemilikan: "milik_sendiri",
            role: "warga",
          })
          .eq("id", newUser.user.id);

        owner = { id: newUser.user.id, full_name: ownerName, blok_rumah, email: ownerEmail };
        userCreated = true;
      }
    }

    if (!owner) {
      return NextResponse.json({ error: "Gagal menyiapkan pemilik blok" }, { status: 500 });
    }

    // Hitung total keringanan yang diterapkan untuk blok + jenis iuran (per bulan, per tahun)
    const years = [...new Set((bulan_bayar as string[]).map((b) => b.split("-")[0]))];
    const { data: keringananRows } = await adminClient
      .from("keringanan_ipl")
      .select("tahun, nilai_keringanan")
      .eq("blok_rumah", blok_rumah)
      .eq("jenis_iuran_id", jenis_iuran_id)
      .eq("is_active", 1) // kompatibel smallint/boolean
      .in("tahun", years);
    const keringananByYear = new Map(
      (keringananRows || []).map((k) => [k.tahun, Number(k.nilai_keringanan)])
    );
    const totalKeringanan = (bulan_bayar as string[]).reduce(
      (sum, b) => sum + (keringananByYear.get(b.split("-")[0]) || 0),
      0
    );

    // Simpan pembayaran (status default 'verified' karena direkam langsung oleh admin)
    const finalStatus = status === "pending" ? "pending" : "verified";
    const { data: payment, error: insertError } = await adminClient
      .from("pembayaran")
      .insert({
        user_id: owner.id,
        jenis_iuran_id,
        rekening_id: rekening_id || null,
        tanggal_bayar: tanggal_bayar || new Date().toISOString().split("T")[0],
        bulan_bayar,
        nominal,
        keringanan: totalKeringanan,
        bukti_transfer_url: bukti_transfer_url || null,
        status: finalStatus,
        verified_by: user.id,
        verified_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Gagal menyimpan pembayaran: " + insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      payment,
      user_created: userCreated,
      owner: { id: owner.id, full_name: owner.full_name, email: owner.email },
    });
  } catch (error) {
    console.error("Error creating payment as admin:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
