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
  DialogFooter,
} from "@/components/ui/dialog";
import { Eye, X } from "lucide-react";

interface Pembayaran {
  id: string;
  tanggal_bayar: string;
  bulan_bayar: string[];
  nominal: number;
  status: string;
  bukti_transfer_url: string | null;
  catatan: string | null;
  profiles: { full_name: string; blok_rumah: string | null } | null;
  jenis_iuran: { nama: string } | null;
  rekening: { nama_bank: string; nomor_rekening: string } | null;
}

export default function VerifikasiPage() {
  const supabase = createClient();
  const [pembayaranList, setPembayaranList] = useState<Pembayaran[]>([]);
  const [rejectedList, setRejectedList] = useState<Pembayaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPembayaran, setSelectedPembayaran] = useState<Pembayaran | null>(null);
  const [catatan, setCatatan] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    // Ambil pembayaran verified (aktif)
    const { data: verified } = await supabase
      .from("pembayaran")
      .select(`
        id, tanggal_bayar, bulan_bayar, nominal, status, bukti_transfer_url, catatan,
        profiles!user_id (full_name, blok_rumah),
        jenis_iuran (nama),
        rekening (nama_bank, nomor_rekening)
      `)
      .eq("status", "verified")
      .order("created_at", { ascending: false });

    // Ambil pembayaran rejected (dibatalkan)
    const { data: rejected } = await supabase
      .from("pembayaran")
      .select(`
        id, tanggal_bayar, bulan_bayar, nominal, status, bukti_transfer_url, catatan,
        profiles!user_id (full_name, blok_rumah),
        jenis_iuran (nama),
        rekening (nama_bank, nomor_rekening)
      `)
      .eq("status", "rejected")
      .order("created_at", { ascending: false });

    if (verified) setPembayaranList(verified as unknown as Pembayaran[]);
    if (rejected) setRejectedList(rejected as unknown as Pembayaran[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);

  const formatBulan = (bulanArr: string[]) =>
    bulanArr.map((b) => {
      const [year, month] = b.split("-");
      return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("id-ID", { month: "short", year: "numeric" });
    }).join(", ");

  const handleReject = async (pembayaran: Pembayaran) => {
    setActionLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("pembayaran").update({
      status: "rejected",
      verified_by: user?.id,
      verified_at: new Date().toISOString(),
      catatan: catatan || null,
    }).eq("id", pembayaran.id);
    setSelectedPembayaran(null);
    setCatatan("");
    setActionLoading(false);
    fetchData();
  };

  const handleRestore = async (pembayaran: Pembayaran) => {
    setActionLoading(true);
    await supabase.from("pembayaran").update({
      status: "verified",
      catatan: null,
    }).eq("id", pembayaran.id);
    setActionLoading(false);
    fetchData();
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><p>Memuat data...</p></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Pembayaran & Verifikasi</h2>
        <p className="text-muted-foreground">Batalkan pembayaran yang salah/bukti tidak sesuai</p>
      </div>

      {/* Pembayaran Aktif */}
      <Card>
        <CardHeader>
          <CardTitle>Pembayaran Aktif ({pembayaranList.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {pembayaranList.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Tidak ada pembayaran aktif.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Warga</TableHead>
                  <TableHead>Blok Rumah</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Jenis Iuran</TableHead>
                  <TableHead>Bulan</TableHead>
                  <TableHead className="text-right">Nominal</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pembayaranList.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <p className="font-medium">{p.profiles?.full_name || "-"}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{p.profiles?.blok_rumah || "-"}</Badge>
                    </TableCell>
                    <TableCell>{new Date(p.tanggal_bayar).toLocaleDateString("id-ID")}</TableCell>
                    <TableCell>{p.jenis_iuran?.nama || "-"}</TableCell>
                    <TableCell className="text-sm">{formatBulan(p.bulan_bayar)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(p.nominal)}</TableCell>
                    <TableCell className="text-center">
                      <Button variant="outline" size="sm" onClick={() => { setSelectedPembayaran(p); setCatatan(p.catatan || ""); }}>
                        <Eye className="h-4 w-4 mr-1" /> Detail
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pembayaran Dibatalkan */}
      {rejectedList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Dibatalkan ({rejectedList.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Warga</TableHead>
                  <TableHead>Blok Rumah</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Jenis Iuran</TableHead>
                  <TableHead className="text-right">Nominal</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rejectedList.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <p className="font-medium">{p.profiles?.full_name || "-"}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{p.profiles?.blok_rumah || "-"}</Badge>
                    </TableCell>
                    <TableCell>{new Date(p.tanggal_bayar).toLocaleDateString("id-ID")}</TableCell>
                    <TableCell>{p.jenis_iuran?.nama || "-"}</TableCell>
                    <TableCell className="text-right font-medium">
                      <span className="line-through text-muted-foreground">{formatCurrency(p.nominal)}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.catatan || "-"}</TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(p)}
                        disabled={actionLoading}
                      >
                        Kembalikan
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialog Detail & Reject */}
      <Dialog open={!!selectedPembayaran} onOpenChange={() => setSelectedPembayaran(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detail Pembayaran</DialogTitle></DialogHeader>
          {selectedPembayaran && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-muted-foreground">Nama</p><p className="font-medium">{selectedPembayaran.profiles?.full_name}</p></div>
                <div><p className="text-sm text-muted-foreground">Blok Rumah</p><p className="font-medium">{selectedPembayaran.profiles?.blok_rumah || "-"}</p></div>
                <div><p className="text-sm text-muted-foreground">Jenis</p><p className="font-medium">{selectedPembayaran.jenis_iuran?.nama}</p></div>
                <div><p className="text-sm text-muted-foreground">Nominal</p><p className="font-medium">{formatCurrency(selectedPembayaran.nominal)}</p></div>
                <div><p className="text-sm text-muted-foreground">Rekening</p><p className="font-medium">{selectedPembayaran.rekening?.nama_bank} - {selectedPembayaran.rekening?.nomor_rekening}</p></div>
                <div><p className="text-sm text-muted-foreground">Status</p><Badge variant="default" className="bg-green-600">Verified</Badge></div>
              </div>
              {selectedPembayaran.bukti_transfer_url && (
                <div><p className="text-sm text-muted-foreground mb-2">Bukti Transfer</p>
                  <img src={selectedPembayaran.bukti_transfer_url} alt="Bukti" className="w-full rounded-lg border" /></div>
              )}
              <div className="space-y-2">
                <Label>Catatan / Alasan Pembatalan</Label>
                <Input value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Contoh: Bukti tidak jelas, nominal tidak sesuai" />
              </div>
              <DialogFooter>
                <Button
                  variant="destructive"
                  onClick={() => handleReject(selectedPembayaran)}
                  disabled={actionLoading}
                  className="w-full"
                >
                  <X className="h-4 w-4 mr-1" /> Batalkan Pembayaran Ini
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}