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

interface JenisIuran {
  id: string;
  nama: string;
  deskripsi: string | null;
  nominal: number;
  jenis: string;
  aktif: boolean;
}

export default function JenisIuranPage() {
  const supabase = createClient();
  const [list, setList] = useState<JenisIuran[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [nama, setNama] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [nominal, setNominal] = useState("");
  const [jenis, setJenis] = useState("wajib");
  const [aktif, setAktif] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data } = await supabase.from("jenis_iuran").select("*").order("created_at", { ascending: false });
    if (data) setList(data);
    setLoading(false);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);

  const resetForm = () => {
    setNama("");
    setDeskripsi("");
    setNominal("");
    setJenis("wajib");
    setAktif(true);
    setEditingId(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (!nama || !nominal) {
      setError("Nama dan nominal wajib diisi");
      setSubmitting(false);
      return;
    }

    const payload = {
      nama,
      deskripsi: deskripsi || null,
      nominal: Number(nominal),
      jenis,
      aktif,
    };

    if (editingId) {
      const { error } = await supabase.from("jenis_iuran").update(payload).eq("id", editingId);
      if (error) setError("Gagal mengupdate data");
    } else {
      const { error } = await supabase.from("jenis_iuran").insert(payload);
      if (error) setError("Gagal menambah data");
    }

    if (!error) {
      setDialogOpen(false);
      resetForm();
      fetchData();
    }
    setSubmitting(false);
  };

  const handleEdit = (item: JenisIuran) => {
    setEditingId(item.id);
    setNama(item.nama);
    setDeskripsi(item.deskripsi || "");
    setNominal(String(item.nominal));
    setJenis(item.jenis);
    setAktif(item.aktif);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus jenis iuran ini?")) return;
    await supabase.from("jenis_iuran").delete().eq("id", id);
    setList(list.filter((l) => l.id !== id));
  };

  const handleToggleAktif = async (item: JenisIuran) => {
    await supabase.from("jenis_iuran").update({ aktif: !item.aktif }).eq("id", item.id);
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
          <h2 className="text-2xl font-bold tracking-tight">Jenis Iuran</h2>
          <p className="text-muted-foreground">Kelola jenis iuran</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Tambah</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingId ? "Edit Jenis Iuran" : "Tambah Jenis Iuran"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">{error}</div>}
              <div className="space-y-2">
                <Label>Nama Iuran</Label>
                <Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Contoh: IPL Bulanan" required />
              </div>
              <div className="space-y-2">
                <Label>Deskripsi</Label>
                <Input value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} placeholder="Deskripsi singkat" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nominal</Label>
                  <Input type="number" value={nominal} onChange={(e) => setNominal(e.target.value)} placeholder="0" required />
                </div>
                <div className="space-y-2">
                  <Label>Jenis</Label>
                  <Select value={jenis} onValueChange={setJenis}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wajib">Wajib</SelectItem>
                      <SelectItem value="opsional">Opsional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
        <CardHeader><CardTitle>Daftar Jenis Iuran</CardTitle></CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Belum ada jenis iuran.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead className="text-right">Nominal</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.nama}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.deskripsi || "-"}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(item.nominal))}</TableCell>
                    <TableCell>
                      <Badge variant={item.jenis === "wajib" ? "default" : "secondary"}>{item.jenis}</Badge>
                    </TableCell>
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