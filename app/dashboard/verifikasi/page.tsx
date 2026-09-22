"use client";

import { useMemo, useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useDebouncedValue } from "@/lib/use-debounced-value";
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
import { SortableHead, useSortedData, SortState } from "@/components/ui/sortable-head";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Eye, Search, X, Pencil, ChevronsUpDown, ChevronUp, ChevronDown } from "lucide-react";
import EditPaymentDialog from "@/components/edit-payment-dialog";

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
  const [sortState, setSortState] = useState<SortState>({ col: null, dir: null });
  const [pembayaranList, setPembayaranList] = useState<Pembayaran[]>([]);
  const [rejectedList, setRejectedList] = useState<Pembayaran[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebouncedValue(searchQuery, 300);
  const [searching, setSearching] = useState(false);
  const requestSeq = useRef(0);

  const formatBulan = (bulanArr: string[]) =>
    bulanArr.map((b) => {
      const [year, month] = b.split("-");
      return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("id-ID", { month: "short", year: "numeric" });
    }).join(", ");

  const sortedAktif = useMemo(
    () => useSortedData(pembayaranList, { sortCol: sortState.col, sortDir: sortState.dir, onSort: () => {} }),
    [pembayaranList, sortState]
  );

  const sortedDibatalkan = useMemo(
    () => useSortedData(rejectedList, { sortCol: sortState.col, sortDir: sortState.dir, onSort: () => {} }),
    [rejectedList, sortState]
  );
  const [loading, setLoading] = useState(true);
  const [selectedPembayaran, setSelectedPembayaran] = useState<Pembayaran | null>(null);
  const [catatan, setCatatan] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const fetchData = async (q: string) => {
    const seq = ++requestSeq.current;
    setSearching(true);

    const { data, error } = await supabase.rpc("search_pembayaran", {
      p_q: q.trim() || null,
      p_status: ["verified", "rejected"],
      p_user_id: null,
    });

    // Abaikan respons yang datang terlambat
    if (seq !== requestSeq.current) return;

    if (error) {
      console.error("Error fetching pembayaran:", error);
    } else if (data) {
      const rows = data as unknown as Pembayaran[];
      setPembayaranList(rows.filter((r) => r.status === "verified"));
      setRejectedList(rows.filter((r) => r.status === "rejected"));
    }

    setSearching(false);
    setLoading(false);
  };

  useEffect(() => {
    fetchData(debouncedQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);

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
    fetchData(debouncedQuery);
  };

  const handleRestore = async (pembayaran: Pembayaran) => {
    setActionLoading(true);
    await supabase.from("pembayaran").update({
      status: "verified",
      catatan: null,
    }).eq("id", pembayaran.id);
    setActionLoading(false);
    fetchData(debouncedQuery);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><p>Memuat data...</p></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Pembayaran & Verifikasi</h2>
        <p className="text-muted-foreground">Batalkan pembayaran yang salah/bukti tidak sesuai</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Cari nama, blok, jenis iuran, atau bulan..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            Mencari...
          </span>
        )}
      </div>

      {/* Pembayaran Aktif */}
      <Card>
        <CardHeader>
          <CardTitle>Pembayaran Aktif ({sortedAktif.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedAktif.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {pembayaranList.length === 0 ? "Tidak ada pembayaran aktif." : "Tidak ada hasil yang cocok."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead sortKey="full_name" sortState={sortState} setSortState={setSortState}>Warga</SortableHead>
                  <SortableHead sortKey="blok_rumah" sortState={sortState} setSortState={setSortState}>Blok Rumah</SortableHead>
                  <SortableHead sortKey="tanggal_bayar" sortState={sortState} setSortState={setSortState}>Tanggal</SortableHead>
                  <SortableHead sortKey="jenis_iuran" sortState={sortState} setSortState={setSortState}>Jenis Iuran</SortableHead>
                  <SortableHead sortKey="bulan_bayar" sortState={sortState} setSortState={setSortState}>Bulan</SortableHead>
                  <SortableHead sortKey="nominal" sortState={sortState} setSortState={setSortState} align="right">Nominal</SortableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAktif.map((p) => (
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
                      <div className="flex gap-2 justify-center">
                        <Button variant="outline" size="sm" onClick={() => { setSelectedPembayaran(p); setCatatan(p.catatan || ""); }}>
                          <Eye className="h-4 w-4 mr-1" /> Detail
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => { setEditId(p.id); setEditOpen(true); }}>
                          <Pencil className="h-4 w-4 mr-1" /> Edit
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

      {/* Pembayaran Dibatalkan */}
      {sortedDibatalkan.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Dibatalkan ({sortedDibatalkan.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead sortKey="full_name" sortState={sortState} setSortState={setSortState}>Warga</SortableHead>
                  <SortableHead sortKey="blok_rumah" sortState={sortState} setSortState={setSortState}>Blok Rumah</SortableHead>
                  <SortableHead sortKey="tanggal_bayar" sortState={sortState} setSortState={setSortState}>Tanggal</SortableHead>
                  <SortableHead sortKey="jenis_iuran" sortState={sortState} setSortState={setSortState}>Jenis Iuran</SortableHead>
                  <SortableHead sortKey="nominal" sortState={sortState} setSortState={setSortState} align="right">Nominal</SortableHead>
                  <SortableHead sortKey="catatan" sortState={sortState} setSortState={setSortState}>Catatan</SortableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDibatalkan.map((p) => (
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
                      <div className="flex gap-2 justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore(p)}
                          disabled={actionLoading}
                        >
                          Kembalikan
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => { setEditId(p.id); setEditOpen(true); }}>
                          <Pencil className="h-4 w-4 mr-1" /> Edit
                        </Button>
                      </div>
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

      <EditPaymentDialog
        pembayaranId={editId}
        isAdmin={true}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={() => {
          setEditId(null);
          fetchData(debouncedQuery);
        }}
      />
    </div>
  );
}
