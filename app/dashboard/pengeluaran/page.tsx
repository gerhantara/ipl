"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";

interface Pengeluaran {
  id: string;
  tanggal: string;
  kategori: string;
  nominal: number;
  keterangan: string | null;
  bukti_url: string | null;
}

const KATEGORI_OPTIONS = ["Sampah", "Keamanan", "Perbaikan", "Kebersihan", "Lainnya"];

export default function PengeluaranPage() {
  const supabase = createClient();
  const [pengeluaranList, setPengeluaranList] = useState<Pengeluaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [tanggal, setTanggal] = useState(new Date().toISOString().split("T")[0]);
  const [kategori, setKategori] = useState("");
  const [nominal, setNominal] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [buktiFile, setBuktiFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPengeluaran();
  }, []);

  const fetchPengeluaran = async () => {
    const { data } = await supabase
      .from("pengeluaran")
      .select("*")
      .order("tanggal", { ascending: false });
    if (data) setPengeluaranList(data);
    setLoading(false);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Anda harus login");
        setSubmitting(false);
        return;
      }

      let buktiUrl: string | null = null;

      if (buktiFile) {
        const fileExt = buktiFile.name.split(".").pop();
        const fileName = `pengeluaran/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("bukti-transfer")
          .upload(fileName, buktiFile);
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("bukti-transfer").getPublicUrl(fileName);
          buktiUrl = urlData.publicUrl;
        }
      }

      const { error: insertError } = await supabase.from("pengeluaran").insert({
        tanggal,
        kategori,
        nominal: Number(nominal),
        keterangan: keterangan || null,
        bukti_url: buktiUrl,
        created_by: user.id,
      });

      if (insertError) {
        setError("Gagal menyimpan pengeluaran");
        setSubmitting(false);
        return;
      }

      setDialogOpen(false);
      setKategori("");
      setNominal("");
      setKeterangan("");
      setBuktiFile(null);
      fetchPengeluaran();
    } catch {
      setError("Terjadi kesalahan");
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus pengeluaran ini?")) return;
    await supabase.from("pengeluaran").delete().eq("id", id);
    setPengeluaranList(pengeluaranList.filter((p) => p.id !== id));
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>Memuat data...</p>
      </div>
    );

  const totalPengeluaran = pengeluaranList.reduce((sum, p) => sum + Number(p.nominal), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pengeluaran</h2>
          <p className="text-muted-foreground">Catat pengeluaran kas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Tambah</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Catat Pengeluaran</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">{error}</div>}
              <div className="space-y-2">
                <Label>Tanggal</Label>
                <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select value={kategori} onValueChange={setKategori}>
                  <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                  <SelectContent>
                    {KATEGORI_OPTIONS.map((k) => (
                      <SelectItem key={k} value={k}>{k}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nominal</Label>
                <Input type="number" value={nominal} onChange={(e) => setNominal(e.target.value)} placeholder="0" required />
              </div>
              <div className="space-y-2">
                <Label>Keterangan</Label>
                <Textarea value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder="Keterangan pengeluaran" />
              </div>
              <div className="space-y-2">
                <Label>Bukti/Struk (opsional)</Label>
                <Input type="file" accept="image/*" onChange={(e) => setBuktiFile(e.target.files?.[0] || null)} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting}>{submitting ? "Menyimpan..." : "Simpan"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Daftar Pengeluaran</span>
            <span className="text-red-600">{formatCurrency(totalPengeluaran)}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pengeluaranList.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Belum ada pengeluaran.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead className="text-right">Nominal</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pengeluaranList.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{new Date(p.tanggal).toLocaleDateString("id-ID")}</TableCell>
                    <TableCell className="font-medium">{p.kategori}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.keterangan || "-"}</TableCell>
                    <TableCell className="text-right font-medium text-red-600">{formatCurrency(Number(p.nominal))}</TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}