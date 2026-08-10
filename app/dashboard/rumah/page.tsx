"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  CheckCircle2,
  House,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  Power,
  PowerOff,
} from "lucide-react";

interface Rumah {
  id: string;
  blok_rumah: string;
  nama_pemilik: string | null;
  tanggal_mulai: string | null;
  tanggal_selesai: string | null;
  is_double: boolean;
  is_aktif: boolean;
  created_at: string;
  updated_at: string;
}

export default function RumahPage() {
  const supabase = createClient();
  const [list, setList] = useState<Rumah[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Toggle aktif confirm dialog
  const [toggleTarget, setToggleTarget] = useState<Rumah | null>(null);
  const [toggleSaving, setToggleSaving] = useState(false);

  // Form states
  const [blokRumah, setBlokRumah] = useState("");
  const [namaPemilik, setNamaPemilik] = useState("");
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalSelesai, setTanggalSelesai] = useState("");
  const [isDouble, setIsDouble] = useState(false);
  const [isAktif, setIsAktif] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      // Hanya admin yang boleh mengakses halaman ini
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      setIsAdmin(profile?.role === "admin");
      if (profile?.role === "admin") {
        await fetchData();
      }
      setLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const fetchData = async () => {
    const { data } = await supabase
      .from("rumah")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setList(data);
  };

  const resetForm = () => {
    setBlokRumah("");
    setNamaPemilik("");
    setTanggalMulai("");
    setTanggalSelesai("");
    setIsDouble(false);
    setIsAktif(true);
    setEditingId(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (!blokRumah.trim()) {
      setError("Blok rumah wajib diisi");
      setSubmitting(false);
      return;
    }

    const payload = {
      blok_rumah: blokRumah.trim(),
      nama_pemilik: namaPemilik.trim() || null,
      tanggal_mulai: tanggalMulai || null,
      tanggal_selesai: tanggalSelesai || null,
      is_double: isDouble,
      is_aktif: isAktif,
    };

    if (editingId) {
      const { error: err } = await supabase
        .from("rumah")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", editingId);
      if (err) {
        setError(err.code === "23505" ? "Blok rumah sudah terdaftar" : "Gagal mengupdate data rumah");
        setSubmitting(false);
        return;
      }
    } else {
      const { error: err } = await supabase.from("rumah").insert(payload);
      if (err) {
        setError(err.code === "23505" ? "Blok rumah sudah terdaftar" : "Gagal menambah data rumah");
        setSubmitting(false);
        return;
      }
    }

    setDialogOpen(false);
    resetForm();
    fetchData();
    setSubmitting(false);
  };

  const handleEdit = (item: Rumah) => {
    setEditingId(item.id);
    setBlokRumah(item.blok_rumah);
    setNamaPemilik(item.nama_pemilik || "");
    setTanggalMulai(item.tanggal_mulai || "");
    setTanggalSelesai(item.tanggal_selesai || "");
    setIsDouble(item.is_double);
    setIsAktif(item.is_aktif);
    setDialogOpen(true);
  };

  const handleToggleAktif = async () => {
    if (!toggleTarget) return;
    setToggleSaving(true);

    const { error: err } = await supabase
      .from("rumah")
      .update({ is_aktif: !toggleTarget.is_aktif, updated_at: new Date().toISOString() })
      .eq("id", toggleTarget.id);

    setToggleSaving(false);
    if (!err) {
      setToggleTarget(null);
      fetchData();
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    const d = new Date(date);
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  };

  const filteredList = list.filter((item) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      item.blok_rumah.toLowerCase().includes(q) ||
      (item.nama_pemilik || "").toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>Memuat data...</p>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="max-w-md mx-auto mt-16">
        <Card>
          <CardContent className="text-center space-y-4 py-10">
            <ShieldAlert className="h-12 w-12 mx-auto text-destructive" />
            <div>
              <h2 className="text-xl font-bold">Akses Ditolak</h2>
              <p className="text-muted-foreground mt-1">
                Halaman ini hanya dapat diakses oleh user dengan role admin.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Referensi Rumah</h2>
          <p className="text-muted-foreground">
            Kelola data rumah sebagai referensi untuk pendaftaran & pembayaran
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1" /> Tambah
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Data Rumah" : "Tambah Data Rumah"}</DialogTitle>
              <DialogDescription>
                {editingId
                  ? "Perbarui informasi rumah pada tabel referensi."
                  : "Rekam rumah baru sebagai referensi blok."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="blokRumah">Blok Rumah</Label>
                <Input
                  id="blokRumah"
                  value={blokRumah}
                  onChange={(e) => setBlokRumah(e.target.value)}
                  placeholder="Contoh: A-1, 3/5, BC-12A"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="namaPemilik">Nama Pemilik</Label>
                <Input
                  id="namaPemilik"
                  value={namaPemilik}
                  onChange={(e) => setNamaPemilik(e.target.value)}
                  placeholder="Nama pemilik rumah"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tanggalMulai">Tanggal Mulai</Label>
                  <Input
                    id="tanggalMulai"
                    type="date"
                    value={tanggalMulai}
                    onChange={(e) => setTanggalMulai(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tanggalSelesai">Tanggal Selesai</Label>
                  <Input
                    id="tanggalSelesai"
                    type="date"
                    value={tanggalSelesai}
                    onChange={(e) => setTanggalSelesai(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isDouble"
                    checked={isDouble}
                    onChange={(e) => setIsDouble(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="isDouble">Rumah Double (tarif ×2)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isAktif"
                    checked={isAktif}
                    onChange={(e) => setIsAktif(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="isAktif">Aktif</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Menyimpan..." : "Simpan"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Cari blok atau nama pemilik..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Rumah</CardTitle>
          <CardDescription>
            {filteredList.length} dari {list.length} data rumah
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredList.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {list.length === 0 ? "Belum ada data rumah." : "Tidak ada hasil yang cocok."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Blok Rumah</TableHead>
                  <TableHead>Nama Pemilik</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredList.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <House className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{item.blok_rumah}</span>
                      </div>
                    </TableCell>
                    <TableCell>{item.nama_pemilik || "-"}</TableCell>
                    <TableCell className="text-sm">
                      <div>{formatDate(item.tanggal_mulai)}</div>
                      {item.tanggal_selesai && (
                        <div className="text-muted-foreground text-xs">
                          s.d. {formatDate(item.tanggal_selesai)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.is_double ? (
                        <Badge variant="secondary">Double</Badge>
                      ) : (
                        <Badge variant="outline">Single</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.is_aktif ? "default" : "outline"}>
                        {item.is_aktif ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setToggleTarget(item)}
                        >
                          {item.is_aktif ? (
                            <PowerOff className="h-4 w-4 text-red-600" />
                          ) : (
                            <Power className="h-4 w-4 text-green-600" />
                          )}
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

      {/* Confirm dialog aktivasi / deaktivasi */}
      <Dialog open={!!toggleTarget} onOpenChange={(open) => !open && setToggleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {toggleTarget?.is_aktif ? (
                <>
                  <PowerOff className="h-5 w-5 text-red-600" /> Nonaktifkan Rumah
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" /> Aktifkan Rumah
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {toggleTarget?.is_aktif ? (
                <>
                  Blok <span className="font-semibold">{toggleTarget.blok_rumah}</span> akan{" "}
                  <span className="font-semibold">dinonaktifkan</span> dan tidak lagi tersedia pada
                  pendaftaran & pembayaran. Data pembayaran yang sudah ada tetap tersimpan.
                </>
              ) : (
                <>
                  Blok <span className="font-semibold">{toggleTarget?.blok_rumah}</span> akan{" "}
                  <span className="font-semibold">diaktifkan</span> kembali dan tersedia pada
                  pendaftaran & pembayaran.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setToggleTarget(null)}>
              Batal
            </Button>
            <Button
              variant={toggleTarget?.is_aktif ? "destructive" : "default"}
              onClick={handleToggleAktif}
              disabled={toggleSaving}
            >
              {toggleSaving
                ? "Menyimpan..."
                : toggleTarget?.is_aktif
                  ? "Ya, Nonaktifkan"
                  : "Ya, Aktifkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
