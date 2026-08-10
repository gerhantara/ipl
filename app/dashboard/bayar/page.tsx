"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface JenisIuran {
  id: string;
  nama: string;
  nominal: number;
  jenis: string;
}

interface Rekening {
  id: string;
  nama_bank: string;
  nomor_rekening: string;
  atas_nama: string;
}

interface Profile {
  full_name: string;
  blok_rumah: string | null;
  role: string;
}

interface RumahBlok {
  blok_rumah: string;
  nama_pemilik: string | null;
  is_double: boolean;
}

export default function BayarIPLPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [jenisIuranList, setJenisIuranList] = useState<JenisIuran[]>([]);
  const [rekeningList, setRekeningList] = useState<Rekening[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [selectedJenis, setSelectedJenis] = useState<string>("");
  const [selectedRekening, setSelectedRekening] = useState<string>("");
  const [tanggalBayar, setTanggalBayar] = useState<string>(new Date().toISOString().split("T")[0]);
  const [bulanBayar, setBulanBayar] = useState<string[]>([]);
  const [nominal, setNominal] = useState<string>("");
  const [buktiFile, setBuktiFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [keringananMap, setKeringananMap] = useState<Record<string, number>>({});
  const [reliefTotal, setReliefTotal] = useState<number>(0);
  const [isDouble, setIsDouble] = useState(false); // referensi tabel `rumah`: is_double => tarif ×2
  const [isAdmin, setIsAdmin] = useState(false);
  const [rumahList, setRumahList] = useState<RumahBlok[]>([]);
  const [selectedBlok, setSelectedBlok] = useState<string>("");
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [ownerRegistered, setOwnerRegistered] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerCreated, setOwnerCreated] = useState<string | null>(null);

  // Memuat data keringanan, status is_double, dan status pendaftaran untuk sebuah blok
  const loadBlokData = async (blok: string) => {
    if (!blok) {
      setKeringananMap({});
      setIsDouble(false);
      setOwnerName(null);
      setOwnerRegistered(false);
      return;
    }

    // Referensi tabel `rumah`: nama pemilik + is_double
    const { data: rumahData } = await supabase
      .from("rumah")
      .select("nama_pemilik, is_double")
      .eq("blok_rumah", blok)
      .eq("is_aktif", true)
      .maybeSingle();
    setIsDouble(Boolean(rumahData?.is_double));
    setOwnerName(rumahData?.nama_pemilik || null);

    // Keringanan per jenis iuran (FK jenis_iuran_id) + per tahun
    const { data: keringanan } = await supabase
      .from("keringanan_ipl")
      .select("tahun, nilai_keringanan, jenis_iuran_id")
      .eq("blok_rumah", blok)
      .eq("is_active", true);
    if (keringanan) {
      const map: Record<string, number> = {};
      keringanan.forEach((k: { tahun: string; nilai_keringanan: number; jenis_iuran_id: string }) => {
        map[`${k.jenis_iuran_id}:${k.tahun}`] = Number(k.nilai_keringanan);
      });
      setKeringananMap(map);
    }

    // Apakah pemilik blok sudah mendaftar?
    const { data: registered } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("blok_rumah", blok)
      .maybeSingle();
    setOwnerRegistered(Boolean(registered));
    if (registered?.full_name && !rumahData?.nama_pemilik) {
      setOwnerName(registered.full_name);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const { data: jenis } = await supabase
        .from("jenis_iuran")
        .select("*")
        .eq("aktif", true);

      const { data: rekening } = await supabase
        .from("rekening")
        .select("*")
        .eq("aktif", true);

      if (jenis) setJenisIuranList(jenis);
      if (rekening) setRekeningList(rekening);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, blok_rumah, role")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        setIsAdmin(profileData.role === "admin");

        if (profileData.role === "admin") {
          // Admin: daftar blok dari tabel referensi `rumah` (termasuk blok yang belum terdaftar)
          const { data: rumahListData } = await supabase
            .from("rumah")
            .select("blok_rumah, nama_pemilik, is_double")
            .eq("is_aktif", true)
            .order("blok_rumah", { ascending: true });
          setRumahList(rumahListData || []);

          const initialBlok = profileData.blok_rumah || rumahListData?.[0]?.blok_rumah || "";
          setSelectedBlok(initialBlok);
          await loadBlokData(initialBlok);
        } else {
          setSelectedBlok(profileData.blok_rumah || "");
          await loadBlokData(profileData.blok_rumah || "");
        }
      }
    };

    fetchData();
  }, [supabase]);

  const selectedJenisData = jenisIuranList.find((j) => j.id === selectedJenis);

  // Keringanan per bulan untuk jenis & tahun bulan pertama terpilih
  // (bulan tersedia hanya dalam 1 tahun, jadi nilainya konstan per bulan)
  const reliefPerMonth =
    selectedJenisData && bulanBayar.length > 0
      ? keringananMap[`${selectedJenisData.id}:${bulanBayar[0].split("-")[0]}`] || 0
      : 0;

  // Tahun acuan untuk menampilkan tarif bersih pada select jenis iuran
  const reliefYear =
    bulanBayar.length > 0 ? bulanBayar[0].split("-")[0] : String(new Date().getFullYear());

  const handleBulanChange = (bulan: string) => {
    if (bulanBayar.includes(bulan)) {
      setBulanBayar(bulanBayar.filter((b) => b !== bulan));
    } else {
      setBulanBayar([...bulanBayar, bulan]);
    }
  };

  const handleBlokChange = async (blok: string) => {
    setSelectedBlok(blok);
    setBulanBayar([]);
    setNominal("");
    setReliefTotal(0);
    setOwnerEmail("");
    setOwnerPhone("");
    await loadBlokData(blok);
  };

  useEffect(() => {
    if (selectedJenisData && bulanBayar.length > 0) {
      if (selectedJenisData.jenis === "wajib") {
        // Keringanan hanya berlaku untuk jenis iuran yang terpilih (via FK jenis_iuran_id),
        // dihitung per bulan berdasarkan tahun pada bulan tersebut.
        const totalRelief = bulanBayar.reduce(
          (sum, b) => sum + (keringananMap[`${selectedJenisData.id}:${b.split("-")[0]}`] || 0),
          0
        );
        setReliefTotal(totalRelief);

        // Tarif per bulan = (tarif ipl - keringanan); jika rumah is_double, dikali 2
        const total = bulanBayar.reduce((sum, b) => {
          const relief = keringananMap[`${selectedJenisData.id}:${b.split("-")[0]}`] || 0;
          const base = Math.max(selectedJenisData.nominal - relief, 0);
          return sum + (isDouble ? base * 2 : base);
        }, 0);

        setNominal(String(total));
      } else {
        setReliefTotal(0);
      }
    } else {
      setReliefTotal(0);
    }
  }, [selectedJenisData, bulanBayar, keringananMap, isDouble]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!selectedJenis || !selectedRekening || bulanBayar.length === 0) {
      setError("Semua field wajib diisi");
      setLoading(false);
      return;
    }
    if (!isAdmin && !buktiFile) {
      setError("Bukti transfer wajib diunggah");
      setLoading(false);
      return;
    }
    if (isAdmin && !ownerRegistered && !ownerEmail.trim()) {
      setError("Email pemilik wajib diisi untuk blok yang belum terdaftar");
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Anda harus login terlebih dahulu");
        setLoading(false);
        return;
      }

      // Upload bukti transfer (wajib untuk warga, opsional untuk admin)
      let buktiUrl: string | null = null;
      if (buktiFile) {
        const fileExt = buktiFile.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("bukti-transfer")
          .upload(fileName, buktiFile);

        if (uploadError) {
          setError("Gagal mengupload bukti transfer");
          setLoading(false);
          return;
        }

        const { data: urlData } = supabase.storage
          .from("bukti-transfer")
          .getPublicUrl(fileName);
        buktiUrl = urlData.publicUrl;
      }

      // Admin: rekam pembayaran atas nama blok (pemilik bisa belum terdaftar)
      if (isAdmin) {
        if (!selectedBlok) {
          setError("Pilih blok rumah terlebih dahulu");
          setLoading(false);
          return;
        }

        const res = await fetch("/api/admin/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blok_rumah: selectedBlok,
            jenis_iuran_id: selectedJenis,
            rekening_id: selectedRekening,
            tanggal_bayar: tanggalBayar,
            bulan_bayar: bulanBayar,
            nominal: Number(nominal),
            bukti_transfer_url: buktiUrl,
            email: ownerRegistered ? undefined : ownerEmail.trim(),
            phone: ownerRegistered ? undefined : ownerPhone.trim() || undefined,
          }),
        });

        const result = await res.json();
        if (!res.ok) {
          setError(result.error || "Gagal merekam pembayaran");
          setLoading(false);
          return;
        }

        setOwnerCreated(result.user_created ? result.owner?.email || null : null);
        setSuccess(true);
        setLoading(false);
        return;
      }

      // Warga: insert via client (status "pending" untuk diverifikasi admin)
      const { error: insertError } = await supabase.from("pembayaran").insert({
        user_id: user.id,
        jenis_iuran_id: selectedJenis,
        rekening_id: selectedRekening,
        tanggal_bayar: tanggalBayar,
        bulan_bayar: bulanBayar,
        nominal: Number(nominal),
        bukti_transfer_url: buktiUrl,
        status: "pending",
      });

      if (insertError) {
        setError("Gagal menyimpan data pembayaran");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch {
      setError("Terjadi kesalahan");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-green-600">Pembayaran Berhasil Dicatat!</CardTitle>
            <CardDescription>
              Pembayaran telah tercatat dan masuk ke saldo kas.
            </CardDescription>
            {ownerCreated && (
              <div className="mt-2 bg-amber-50 border border-amber-300/50 text-amber-700 text-sm p-3 rounded-md text-left">
                Akun pemilik blok ({ownerCreated}) telah dibuat otomatis karena belum terdaftar.
                Beri tahu pemilik untuk masuk melalui tautan lupa password.
              </div>
            )}
          </CardHeader>
          <CardContent className="flex gap-4">
            <Button onClick={() => {
              setSuccess(false);
              setSelectedJenis("");
              setSelectedRekening("");
              setBulanBayar([]);
              setNominal("");
              setBuktiFile(null);
              setOwnerEmail("");
              setOwnerPhone("");
              setOwnerCreated(null);
            }}>
              Bayar Lagi
            </Button>
            <Button variant="outline" onClick={() => router.push("/dashboard/riwayat")}>
              Lihat Riwayat
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Generate month options for year 2026 only
  const monthOptions = [];
  for (let m = 0; m < 12; m++) {
    const d = new Date(2026, m, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    monthOptions.push({ value, label });
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Bayar IPL</CardTitle>
          <CardDescription>
            Isi form berikut untuk mencatat pembayaran iuran Anda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {error}
              </div>
            )}

            {/* Info Warga / Info Blok */}
            <div className="space-y-3 bg-muted/50 p-3 rounded-md">
              {isAdmin ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Direkam Oleh</p>
                      <p className="font-medium">{profile?.full_name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Rekam untuk Blok</p>
                      <Select value={selectedBlok} onValueChange={handleBlokChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih blok rumah" />
                        </SelectTrigger>
                        <SelectContent>
                          {rumahList.map((r) => (
                            <SelectItem key={r.blok_rumah} value={r.blok_rumah}>
                              {r.blok_rumah}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {selectedBlok && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border/60 pt-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Nama Pemilik</p>
                        <p className="font-medium">{ownerName || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        {ownerRegistered ? (
                          <Badge className="bg-green-600">Sudah terdaftar</Badge>
                        ) : (
                          <Badge variant="outline">Belum terdaftar</Badge>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : profile ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nama</p>
                    <p className="font-medium">{profile.full_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Blok Rumah</p>
                    <p className="font-medium">{profile.blok_rumah || "-"}</p>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Admin: blok belum terdaftar => isi data akun pemilik */}
            {isAdmin && selectedBlok && !ownerRegistered && (
              <div className="space-y-3 border border-amber-300/50 bg-amber-50/50 p-3 rounded-md">
                <p className="text-sm font-medium text-amber-700">
                  Pemilik blok belum mendaftar — akun akan dibuat otomatis saat pembayaran disimpan.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ownerEmail">Email Pemilik</Label>
                    <Input
                      id="ownerEmail"
                      type="email"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      placeholder="nama@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ownerPhone">No. Telepon (opsional)</Label>
                    <Input
                      id="ownerPhone"
                      type="tel"
                      value={ownerPhone}
                      onChange={(e) => setOwnerPhone(e.target.value)}
                      placeholder="08xxxxxxxxxx"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Jenis Iuran */}
            <div className="space-y-2">
              <Label>Jenis Iuran</Label>
              <Select value={selectedJenis} onValueChange={setSelectedJenis}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis iuran" />
                </SelectTrigger>
                <SelectContent>
                  {jenisIuranList.map((jenis) => {
                    const relief = keringananMap[`${jenis.id}:${reliefYear}`] || 0;
                    const net = Math.max(jenis.nominal - relief, 0);
                    return (
                      <SelectItem key={jenis.id} value={jenis.id}>
                        {jenis.nama} - Rp {net.toLocaleString("id-ID")}
                        {relief > 0 && (
                          <>
                            <span className="ml-1 line-through text-muted-foreground">
                              Rp {jenis.nominal.toLocaleString("id-ID")}
                            </span>
                            <Badge variant="secondary" className="ml-2">
                              keringanan {relief.toLocaleString("id-ID")}
                            </Badge>
                          </>
                        )}
                        <Badge variant={jenis.jenis === "wajib" ? "default" : "secondary"} className="ml-2">
                          {jenis.jenis}
                        </Badge>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Bulan Bayar */}
            <div className="space-y-2">
              <Label>Pilih Bulan Pembayaran</Label>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {monthOptions.map((month) => (
                  <Button
                    key={month.value}
                    type="button"
                    variant={bulanBayar.includes(month.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleBulanChange(month.value)}
                    className="text-xs"
                  >
                    {month.label}
                  </Button>
                ))}
              </div>
              {bulanBayar.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Terpilih: {bulanBayar.length} bulan
                </p>
              )}
            </div>

            {/* Nominal */}
            <div className="space-y-2">
              <Label htmlFor="nominal">Nominal Transfer</Label>
              <Input
                id="nominal"
                type="number"
                value={nominal}
                onChange={(e) => setNominal(e.target.value)}
                readOnly={selectedJenisData?.jenis === "wajib" && bulanBayar.length > 0}
                placeholder="Masukkan nominal"
              />
              {selectedJenisData?.jenis === "wajib" && bulanBayar.length > 0 && (
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    Nominal otomatis dihitung: (Rp {selectedJenisData.nominal.toLocaleString("id-ID")}
                    {reliefPerMonth > 0 && (
                      <> − Rp {reliefPerMonth.toLocaleString("id-ID")} keringanan</>
                    )}
                    {isDouble && <> × 2 (rumah double)</>}
                    ) × {bulanBayar.length} bulan
                  </p>
                  {reliefTotal > 0 && (
                    <p className="text-green-600">
                      Total keringanan diterapkan: Rp {reliefTotal.toLocaleString("id-ID")}
                    </p>
                  )}
                  {isDouble && (
                    <p className="text-amber-600">
                      Blok rumah terdaftar sebagai rumah double, tarif dikalikan 2.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Tanggal Bayar */}
            <div className="space-y-2">
              <Label htmlFor="tanggal">Tanggal Transfer</Label>
              <Input
                id="tanggal"
                type="date"
                value={tanggalBayar}
                onChange={(e) => setTanggalBayar(e.target.value)}
              />
            </div>

            {/* Rekening Tujuan */}
            <div className="space-y-2">
              <Label>Transfer ke Rekening</Label>
              <Select value={selectedRekening} onValueChange={setSelectedRekening}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih rekening tujuan" />
                </SelectTrigger>
                <SelectContent>
                  {rekeningList.map((rek) => (
                    <SelectItem key={rek.id} value={rek.id}>
                      {rek.nama_bank} - {rek.nomor_rekening} ({rek.atas_nama})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bukti Transfer */}
            <div className="space-y-2">
              <Label htmlFor="bukti">
                Upload Bukti Transfer{!isAdmin && <span className="text-red-500"> *</span>}
              </Label>
              <Input
                id="bukti"
                type="file"
                accept="image/*"
                onChange={(e) => setBuktiFile(e.target.files?.[0] || null)}
              />
              <p className="text-sm text-muted-foreground">
                Format: JPG, PNG. Maksimal 5MB.
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Memproses..." : "Kirim Pembayaran"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}