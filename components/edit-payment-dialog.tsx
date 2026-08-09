"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface PembayaranRecord {
  id: string;
  user_id: string;
  jenis_iuran_id: string;
  rekening_id: string | null;
  tanggal_bayar: string;
  bulan_bayar: string[];
  nominal: number;
  bukti_transfer_url: string | null;
  status: string;
}

interface EditPaymentDialogProps {
  pembayaranId: string | null;
  isAdmin: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export default function EditPaymentDialog({
  pembayaranId,
  isAdmin,
  open,
  onOpenChange,
  onSaved,
}: EditPaymentDialogProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [jenisIuranList, setJenisIuranList] = useState<JenisIuran[]>([]);
  const [rekeningList, setRekeningList] = useState<Rekening[]>([]);
  const [keringananMap, setKeringananMap] = useState<Record<string, number>>({});
  const [isDouble, setIsDouble] = useState(false); // referensi tabel `rumah`: is_double => tarif ×2

  const [selectedJenis, setSelectedJenis] = useState<string>("");
  const [selectedRekening, setSelectedRekening] = useState<string>("");
  const [tanggalBayar, setTanggalBayar] = useState<string>("");
  const [bulanBayar, setBulanBayar] = useState<string[]>([]);
  const [nominal, setNominal] = useState<string>("");
  const [buktiFile, setBuktiFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reliefTotal, setReliefTotal] = useState<number>(0);

  // Generate month options for year 2026 only
  const monthOptions = [];
  for (let m = 0; m < 12; m++) {
    const d = new Date(2026, m, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    monthOptions.push({ value, label });
  }

  useEffect(() => {
    if (!open) return;
    const fetchData = async () => {
      setFetching(true);
      setError(null);
      setBuktiFile(null);

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

      if (pembayaranId) {
        const { data: p } = await supabase
          .from("pembayaran")
          .select("id, user_id, jenis_iuran_id, rekening_id, tanggal_bayar, bulan_bayar, nominal, bukti_transfer_url, status")
          .eq("id", pembayaranId)
          .single();

        if (p) {
          const rec = p as unknown as PembayaranRecord;
          setSelectedJenis(rec.jenis_iuran_id);
          setSelectedRekening(rec.rekening_id || "");
          setTanggalBayar(rec.tanggal_bayar);
          setBulanBayar(rec.bulan_bayar || []);
          setNominal(String(rec.nominal));

          // Load keringanan for this user's blok
          const { data: profile } = await supabase
            .from("profiles")
            .select("blok_rumah")
            .eq("id", rec.user_id)
            .single();
          if (profile?.blok_rumah) {
            // Keringanan per jenis iuran (FK jenis_iuran_id) + per tahun
            const { data: keringanan } = await supabase
              .from("keringanan_ipl")
              .select("tahun, nilai_keringanan, jenis_iuran_id")
              .eq("blok_rumah", profile.blok_rumah)
              .eq("is_active", true);
            if (keringanan) {
              const map: Record<string, number> = {};
              keringanan.forEach((k: { tahun: string; nilai_keringanan: number; jenis_iuran_id: string }) => {
                map[`${k.jenis_iuran_id}:${k.tahun}`] = Number(k.nilai_keringanan);
              });
              setKeringananMap(map);
            }

            // Referensi tabel `rumah`: jika blok rumah terdaftar is_double, tarif dikali 2
            const { data: rumahData } = await supabase
              .from("rumah")
              .select("is_double")
              .eq("blok_rumah", profile.blok_rumah)
              .eq("is_aktif", true)
              .maybeSingle();
            setIsDouble(Boolean(rumahData?.is_double));
          }
        }
      }
      setFetching(false);
    };
    fetchData();
  }, [open, pembayaranId, supabase]);

  const selectedJenisData = jenisIuranList.find((j) => j.id === selectedJenis);

  // Keringanan per bulan untuk jenis & tahun bulan pertama terpilih
  // (bulan tersedia hanya dalam 1 tahun, jadi nilainya konstan per bulan)
  const reliefPerMonth =
    selectedJenisData && bulanBayar.length > 0
      ? keringananMap[`${selectedJenisData.id}:${bulanBayar[0].split("-")[0]}`] || 0
      : 0;

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
    if (!pembayaranId) return;
    setLoading(true);
    setError(null);

    if (!selectedJenis || !selectedRekening || bulanBayar.length === 0) {
      setError("Jenis iuran, rekening, dan bulan wajib diisi");
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

      // Tentukan status setelah edit:
      // - Admin mengedit: status tetap (verified tetap verified)
      // - Warga mengedit pembayaran rejected/pending: kembalikan ke pending (resubmit)
      const { data: current } = await supabase
        .from("pembayaran")
        .select("status")
        .eq("id", pembayaranId)
        .single();

      let newStatus = (current?.status as string) || "pending";
      if (!isAdmin && newStatus === "rejected") {
        newStatus = "pending";
      }

      const updatePayload: Record<string, unknown> = {
        jenis_iuran_id: selectedJenis,
        rekening_id: selectedRekening,
        tanggal_bayar: tanggalBayar,
        bulan_bayar: bulanBayar,
        nominal: Number(nominal),
        status: newStatus,
        updated_at: new Date().toISOString(),
      };
      if (buktiUrl) {
        updatePayload.bukti_transfer_url = buktiUrl;
      }
      // Jika warga mengedit, bersihkan catatan penolakan admin
      if (!isAdmin) {
        updatePayload.catatan = null;
      }

      const { error: updateError } = await supabase
        .from("pembayaran")
        .update(updatePayload)
        .eq("id", pembayaranId);

      if (updateError) {
        setError("Gagal menyimpan perubahan: " + updateError.message);
        setLoading(false);
        return;
      }

      setLoading(false);
      onOpenChange(false);
      onSaved();
    } catch {
      setError("Terjadi kesalahan");
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Pembayaran</DialogTitle>
        </DialogHeader>
        {fetching ? (
          <p className="text-muted-foreground py-8 text-center">Memuat data...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {error}
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
              <Label htmlFor="bukti">Upload Bukti Transfer (opsional)</Label>
              <Input
                id="bukti"
                type="file"
                accept="image/*"
                onChange={(e) => setBuktiFile(e.target.files?.[0] || null)}
              />
              <p className="text-sm text-muted-foreground">
                Format: JPG, PNG. Maksimal 5MB. Kosongkan jika tidak ingin mengubah bukti.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Batal
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}