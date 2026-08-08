"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { BLOK_RUMAH_OPTIONS } from "@/lib/blok-rumah-options";

interface KeringananIPL {
  id: string;
  blok_rumah: string;
  tahun: string; // 'YYYY'
  nilai_keringanan: number;
  is_active: boolean;
}

export default function KeringananIPLPage() {
  const supabase = createClient();
  const [list, setList] = useState<KeringananIPL[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [blokRumah, setBlokRumah] = useState("");
  const [tahun, setTahun] = useState("");
  const [nilaiKeringanan, setNilaiKeringanan] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generate year options (current year and 5 years before/after)
  const yearOptions: { value: string; label: string }[] = [];
  const nowYear = new Date().getFullYear();
  for (let i = -5; i <= 5; i++) {
    const y = nowYear + i;
    yearOptions.push({ value: String(y), label: String(y) });
  }

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data } = await supabase
      .from("keringanan_ipl")
      .select("*")
      .order("blok_rumah", { ascending: true })
      .order("tahun", { ascending: false });
    if (data) setList(data as KeringananIPL[]);
    setLoading(false);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);

  const resetForm = () => {
    setBlokRumah("");
    setTahun("");
    setNilaiKeringanan("");
    setIsActive(true);
    setEditingId(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (!blokRumah || !tahun || nilaiKeringanan === "") {
      setError("Blok rumah, tahun, dan nilai keringanan wajib diisi");
      setSubmitting(false);
      return;
    }

    const payload = {
      blok_rumah: blokRumah,
      tahun,
      nilai_keringanan: Number(nilaiKeringanan),
      is_active: isActive,
    };

    // Upsert: unique (blok_rumah, tahun) will update existing entry
    const { error: upsertError } = await supabase
      .from("keringanan_ipl")
      .upsert(payload, { onConflict: "blok_rumah,tahun" });

    if (upsertError) {
      setError("Gagal menyimpan data keringanan");
      setSubmitting(false);
      return;
    }

    setDialogOpen(false);
    resetForm();
    fetchData();
    setSubmitting(false);
  };

  const handleEdit = (item: KeringananIPL) => {
    setEditingId(item.id);
    setBlokRumah(item.blok_rumah);
    setTahun(item.tahun);
    setNilaiKeringanan(String(item.nilai_keringanan));
    setIsActive(item.is_active);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus data keringanan ini?")) return;
    await supabase.from("keringanan_ipl").delete().eq("id", id);
    setList(list.filter((l) => l.id !== id));
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>Memuat data...</p>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Keringanan IPL</h2>
          <p className="text-muted-foreground">
            Kelola nilai keringanan pembayaran IPL per blok dan per tahun
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Tambah</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Keringanan IPL" : "Tambah Keringanan IPL"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">{error}</div>}
              <div className="space-y-2">
                <Label>Blok Rumah</Label>
                <Select value={blokRumah} onValueChange={setBlokRumah}>
                  <SelectTrigger><SelectValue placeholder="Pilih blok rumah" /></SelectTrigger>
                  <SelectContent>
                    {BLOK_RUMAH_OPTIONS.map((blok) => (
                      <SelectItem key={blok} value={blok}>{blok}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tahun</Label>
                <Select value={tahun} onValueChange={setTahun}>
                  <SelectTrigger><SelectValue placeholder="Pilih tahun" /></SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((y) => (
                      <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nilai Keringanan (Rp)</Label>
                <Input
                  type="number"
                  value={nilaiKeringanan}
                  onChange={(e) => setNilaiKeringanan(e.target.value)}
                  placeholder="0"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Nilai potongan yang diberikan untuk blok & tahun ini.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_active" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded" />
                <Label htmlFor="is_active">Aktif</Label>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting}>{submitting ? "Menyimpan..." : "Simpan"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Daftar Keringanan IPL</CardTitle></CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Belum ada data keringanan IPL.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Blok Rumah</TableHead>
                  <TableHead>Tahun</TableHead>
                  <TableHead className="text-right">Nilai Keringanan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((item) => (
                  <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <Badge variant="secondary">{item.blok_rumah}</Badge>
                  </TableCell>
                  <TableCell>{item.tahun}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(item.nilai_keringanan))}</TableCell>
                  <TableCell>
                    <Badge variant={item.is_active ? "default" : "outline"}>{item.is_active ? "Aktif" : "Nonaktif"}</Badge>
                  </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
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