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

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, blok_rumah")
          .eq("id", user.id)
          .single();

        if (profileData) {
          setProfile(profileData);
        }
      }

      if (jenis) setJenisIuranList(jenis);
      if (rekening) setRekeningList(rekening);
    };

    fetchData();
  }, [supabase]);

  const selectedJenisData = jenisIuranList.find((j) => j.id === selectedJenis);

  const handleBulanChange = (bulan: string) => {
    if (bulanBayar.includes(bulan)) {
      setBulanBayar(bulanBayar.filter((b) => b !== bulan));
    } else {
      setBulanBayar([...bulanBayar, bulan]);
    }
  };

  useEffect(() => {
    if (selectedJenisData && bulanBayar.length > 0) {
      if (selectedJenisData.jenis === "wajib") {
        setNominal(String(selectedJenisData.nominal * bulanBayar.length));
      }
    }
  }, [selectedJenisData, bulanBayar]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!selectedJenis || !selectedRekening || bulanBayar.length === 0 || !buktiFile) {
      setError("Semua field wajib diisi");
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

      // Upload file to storage
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

      // Insert payment record (blok_rumah comes from profiles)
      const { error: insertError } = await supabase.from("pembayaran").insert({
        user_id: user.id,
        jenis_iuran_id: selectedJenis,
        rekening_id: selectedRekening,
        tanggal_bayar: tanggalBayar,
        bulan_bayar: bulanBayar,
        nominal: Number(nominal),
        bukti_transfer_url: urlData.publicUrl,
        status: "verified",
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
              Pembayaran Anda telah tercatat dan masuk ke saldo kas.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Button onClick={() => {
              setSuccess(false);
              setSelectedJenis("");
              setSelectedRekening("");
              setBulanBayar([]);
              setNominal("");
              setBuktiFile(null);
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

  // Generate month options for current and next 12 months
  const monthOptions = [];
  const now = new Date();
  for (let i = -12; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
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

            {/* Info Warga (read-only) */}
            {profile && (
              <div className="grid grid-cols-2 gap-4 bg-muted/50 p-3 rounded-md">
                <div>
                  <p className="text-sm text-muted-foreground">Nama</p>
                  <p className="font-medium">{profile.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Blok Rumah</p>
                  <p className="font-medium">{profile.blok_rumah || "-"}</p>
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
                  {jenisIuranList.map((jenis) => (
                    <SelectItem key={jenis.id} value={jenis.id}>
                      {jenis.nama} - Rp {jenis.nominal.toLocaleString("id-ID")}
                      <Badge variant={jenis.jenis === "wajib" ? "default" : "secondary"} className="ml-2">
                        {jenis.jenis}
                      </Badge>
                    </SelectItem>
                  ))}
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
                placeholder="Masukkan nominal"
                disabled={selectedJenisData?.jenis === "wajib"}
              />
              {selectedJenisData?.jenis === "wajib" && bulanBayar.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Nominal otomatis dihitung: Rp {selectedJenisData.nominal.toLocaleString("id-ID")} × {bulanBayar.length} bulan
                </p>
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
              <Label htmlFor="bukti">Upload Bukti Transfer</Label>
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