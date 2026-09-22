"use client";

import { useMemo, useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Download, Eye, Pencil, Search, Trash } from "lucide-react";
import EditPaymentDialog from "@/components/edit-payment-dialog";
import { jsPDF } from "jspdf";

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

export default function RiwayatPage() {
  const supabase = createClient();
  const [sortState, setSortState] = useState<SortState>({ col: null, dir: null });
  const [pembayaranList, setPembayaranList] = useState<Pembayaran[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebouncedValue(searchQuery, 300);
  const [searching, setSearching] = useState(false);
  const requestSeq = useRef(0);

  const formatBulan = (bulanArr: string[]) => {
    return bulanArr.map((b) => {
      const [year, month] = b.split("-");
      const date = new Date(Number(year), Number(month) - 1, 1);
      return date.toLocaleDateString("id-ID", { month: "short", year: "numeric" });
    }).join(", ");
  };

  const sortedPembayaran = useMemo(
    () => useSortedData(pembayaranList, { sortCol: sortState.col, sortDir: sortState.dir, onSort: () => {} }),
    [pembayaranList, sortState]
  );
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("warga");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async (q: string) => {
    const seq = ++requestSeq.current;
    setSearching(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSearching(false);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile) setUserRole(profile.role);

    const { data, error } = await supabase.rpc("search_pembayaran", {
      p_q: q.trim() || null,
      p_status: null,
      p_user_id: profile?.role === "admin" ? null : user.id,
    });

    // Abaikan respons yang datang terlambat (pencarian lebih baru sudah dikirim)
    if (seq !== requestSeq.current) return;

    if (error) {
      console.error("Error fetching pembayaran:", error);
      setErrorMsg(error.message);
    } else {
      setErrorMsg(null);
    }

    if (data) setPembayaranList(data as unknown as Pembayaran[]);
    setSearching(false);
    setLoading(false);
  };

  useEffect(() => {
    fetchData(debouncedQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  const handleVerifikasi = async (p: Pembayaran) => {
    if (!confirm("Verifikasi pembayaran ini?")) return;
    setActionLoading(p.id);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("pembayaran")
      .update({
        status: "verified",
        verified_by: user?.id,
        verified_at: new Date().toISOString(),
      })
      .eq("id", p.id);
    if (error) setErrorMsg(error.message);
    setActionLoading(null);
    fetchData(debouncedQuery);
  };

  const handleHapus = async (p: Pembayaran) => {
    if (!confirm("Yakin ingin menghapus pembayaran ini?")) return;
    setActionLoading(p.id);
    const { error } = await supabase.from("pembayaran").delete().eq("id", p.id);
    if (error) setErrorMsg(error.message);
    setActionLoading(null);
    fetchData(debouncedQuery);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleDownloadReceipt = (p: Pembayaran) => {
    if (p.status !== "verified") return;

    const document = new jsPDF();
    const leftMargin = 20;
    let yPosition = 25;
    const addLine = (label: string, value: string) => {
      document.setFont("helvetica", "bold");
      document.text(label, leftMargin, yPosition);
      document.setFont("helvetica", "normal");
      document.text(value, leftMargin + 45, yPosition);
      yPosition += 10;
    };

    document.setFontSize(18);
    document.setFont("helvetica", "bold");
    document.text("KUITANSI PEMBAYARAN IPL", leftMargin, yPosition);
    yPosition += 8;
    document.setFontSize(10);
    document.setFont("helvetica", "normal");
    document.text("Dokumen pembayaran resmi", leftMargin, yPosition);
    yPosition += 18;

    addLine("ID Pembayaran", p.id);
    addLine("Nama", p.profiles?.full_name || "-");
    addLine("Blok Rumah", p.profiles?.blok_rumah || "-");
    addLine("Tanggal Bayar", new Date(p.tanggal_bayar).toLocaleDateString("id-ID"));
    addLine("Jenis Iuran", p.jenis_iuran?.nama || "-");
    addLine("Periode", formatBulan(p.bulan_bayar));
    addLine("Nominal", formatCurrency(p.nominal));
    addLine(
      "Rekening",
      p.rekening ? `${p.rekening.nama_bank} - ${p.rekening.nomor_rekening}` : "-"
    );
    addLine("Status", "Terverifikasi oleh admin");

    yPosition += 12;
    document.setFontSize(9);
    document.setTextColor(100);
    document.text(
      `Dicetak pada ${new Date().toLocaleString("id-ID")}`,
      leftMargin,
      yPosition
    );

    const safeId = p.id.replace(/[^a-zA-Z0-9-_]/g, "-");
    document.save(`kuitansi-pembayaran-${safeId}.pdf`);
  };

  const getStatusBadge = (status: string) => {
    if (status === "verified") return <Badge className="bg-green-600">Terverifikasi</Badge>;
    if (status === "pending") return <Badge className="bg-yellow-500">Pending</Badge>;
    if (status === "rejected") return <Badge className="bg-red-600">Ditolak</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Memuat data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Riwayat Pembayaran</h2>
        <p className="text-muted-foreground">
          {userRole === "admin" ? "Semua data pembayaran warga" : "Riwayat pembayaran IPL Anda"}
        </p>
      </div>

      {errorMsg && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
          {errorMsg}
        </div>
      )}

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

      <Card>
        <CardHeader>
          <CardTitle>Daftar Pembayaran ({sortedPembayaran.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedPembayaran.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {pembayaranList.length === 0
                ? "Belum ada riwayat pembayaran."
                : "Tidak ada hasil yang cocok."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {userRole === "admin" && (
                      <>
                        <SortableHead sortKey="full_name" sortState={sortState} setSortState={setSortState}>Warga</SortableHead>
                        <SortableHead sortKey="blok_rumah" sortState={sortState} setSortState={setSortState}>Blok Rumah</SortableHead>
                      </>
                    )}
                    <SortableHead sortKey="tanggal_bayar" sortState={sortState} setSortState={setSortState}>Tanggal</SortableHead>
                    <SortableHead sortKey="jenis_iuran" sortState={sortState} setSortState={setSortState}>Jenis Iuran</SortableHead>
                    <SortableHead sortKey="bulan_bayar" sortState={sortState} setSortState={setSortState}>Bulan</SortableHead>
                    <SortableHead sortKey="nominal" sortState={sortState} setSortState={setSortState} align="right">Nominal</SortableHead>
                      <SortableHead sortKey="status" sortState={sortState} setSortState={setSortState}>Status</SortableHead>
                      <TableHead className="text-center">Bukti</TableHead>
                      <TableHead className="text-center">Kuitansi</TableHead>
                      {userRole === "admin" && (
                        <TableHead className="text-center">Aksi</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedPembayaran.map((p) => (
                      <TableRow key={p.id}>
                      {userRole === "admin" && (
                        <>
                          <TableCell className="font-medium">
                            {p.profiles?.full_name || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{p.profiles?.blok_rumah || "-"}</Badge>
                          </TableCell>
                        </>
                      )}
                      <TableCell>
                        {new Date(p.tanggal_bayar).toLocaleDateString("id-ID")}
                      </TableCell>
                      <TableCell>{p.jenis_iuran?.nama || "-"}</TableCell>
                      <TableCell className="text-sm">{formatBulan(p.bulan_bayar)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(p.nominal)}
                      </TableCell>
                      <TableCell>{getStatusBadge(p.status)}</TableCell>
                      <TableCell className="text-center">
                        {p.bukti_transfer_url && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Bukti Transfer</DialogTitle>
                              </DialogHeader>
                              <img
                                src={p.bukti_transfer_url}
                                alt="Bukti Transfer"
                                className="w-full rounded-lg"
                              />
                              {p.catatan && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  <strong>Catatan Admin:</strong> {p.catatan}
                                </p>
                              )}
                            </DialogContent>
                          </Dialog>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {p.status === "verified" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownloadReceipt(p)}
                            title="Download kuitansi PDF"
                            aria-label="Download kuitansi PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                      {userRole === "admin" && (
                        <TableCell className="text-center">
                          {(p.status === "pending" || p.status === "rejected") && (
                            <div className="flex gap-2 justify-center">
                              <Button
                                variant="outline"
                                size="icon"
                                disabled={actionLoading === p.id}
                                onClick={() => handleVerifikasi(p)}
                                title="Verifikasi pembayaran"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                disabled={actionLoading === p.id}
                                onClick={() => { setEditId(p.id); setEditOpen(true); }}
                                title="Edit pembayaran"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                disabled={actionLoading === p.id}
                                onClick={() => handleHapus(p)}
                                title="Hapus pembayaran"
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <EditPaymentDialog
        pembayaranId={editId}
        isAdmin={userRole === "admin"}
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
