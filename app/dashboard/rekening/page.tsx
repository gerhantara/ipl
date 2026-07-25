"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";

interface Rekening {
  id: string;
  nama_bank: string;
  nomor_rekening: string;
  atas_nama: string;
  aktif: boolean;
}

export default function RekeningPage() {
  const supabase = createClient();
  const [list, setList] = useState<Rekening[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [namaBank, setNamaBank] = useState("");
  const [nomorRekening, setNomorRekening] = useState("");
  const [atasNama, setAtasNama] = useState("");
  const [aktif, setAktif] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data } = await supabase.from("rekening").select("*").order("created_at", { ascending: false });
    if (data) setList(data);
    setLoading(false);
  };

  const resetForm = () => {
    setNamaBank("");
    setNomorRekening("");
    setAtasNama("");
    setAktif(true);
    setEditingId(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (!namaBank || !nomorRekening || !atasNama) {
      setError("Semua field wajib diisi");
      setSubmitting(false);
      return;
    }

    const payload = { nama_bank: namaBank, nomor_rekening: nomorRekening, atas_nama: atasNama, aktif };

    if (editingId) {
      const { error } = await supabase.from("rekening").update(payload).eq("id", editingId);
      if (error) setError("Gagal mengupdate data");
    } else {
      const { error } = await supabase.from("rekening").insert(payload);
      if (error) setError("Gagal menambah data");
    }

    if (!error) {
      setDialogOpen(false);
      resetForm();
      fetchData();
    }
    setSubmitting(false);
  };

  const handleEdit = (item: Rekening) => {
    setEditingId(item.id);
    setNamaBank(item.nama_bank);
    setNomorRekening(item.nomor_rekening);
    setAtasNama(item.atas_nama);
    setAktif(item.aktif);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus rekening ini?")) return;
    await supabase.from("rekening").delete().eq("id", id);
    setList(list.filter((l) => l.id !== id));
  };

  const handleToggleAktif = async (item: Rekening) => {
    await supabase.from("rekening").update({ aktif: !item.aktif }).eq("id", item.id);
    fetchData();
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
          <h2 className="text-2xl font-bold tracking-tight">Rekening</h2>
          <p className="text-muted-foreground">Kelola rekening untuk pembayaran</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Tambah</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingId ? "Edit Rekening" : "Tambah Rekening"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">{error}</div>}
              <div className="space-y-2">
                <Label>Nama Bank</Label>
                <Input value={namaBank} onChange={(e) => setNamaBank(e.target.value)} placeholder="Contoh: BCA" required />
              </div>
              <div className="space-y-2">
                <Label>Nomor Rekening</Label>
                <Input value={nomorRekening} onChange={(e) => setNomorRekening(e.target.value)} placeholder="1234567890" required />
              </div>
              <div className="space-y-2">
                <Label>Atas Nama</Label>
                <Input value={atasNama} onChange={(e) => setAtasNama(e.target.value)} placeholder="Nama pemilik rekening" required />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="aktif" checked={aktif} onChange={(e) => setAktif(e.target.checked)} className="rounded" />
                <Label htmlFor="aktif">Aktif</Label>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting}>{submitting ? "Menyimpan..." : "Simpan"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Daftar Rekening</CardTitle></CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Belum ada rekening.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bank</TableHead>
                  <TableHead>Nomor Rekening</TableHead>
                  <TableHead>Atas Nama</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{item.nama_bank}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{item.nomor_rekening}</TableCell>
                    <TableCell>{item.atas_nama}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleToggleAktif(item)}>
                        <Badge variant={item.aktif ? "default" : "outline"}>{item.aktif ? "Aktif" : "Nonaktif"}</Badge>
                      </Button>
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