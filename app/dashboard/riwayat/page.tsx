"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

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
  const [pembayaranList, setPembayaranList] = useState<Pembayaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("warga");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile) setUserRole(profile.role);

      let query = supabase
        .from("pembayaran")
        .select(`
          id,
          tanggal_bayar,
          bulan_bayar,
          nominal,
          status,
          bukti_transfer_url,
          catatan,
          profiles!user_id (full_name, blok_rumah),
          jenis_iuran (nama),
          rekening (nama_bank, nomor_rekening)
        `)
        .order("created_at", { ascending: false });

      if (profile?.role !== "admin") {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching pembayaran:", error);
        setErrorMsg(error.message);
      }

      if (data) setPembayaranList(data as unknown as Pembayaran[]);
      setLoading(false);
    };

    fetchData();
  }, [supabase]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatBulan = (bulanArr: string[]) => {
    return bulanArr.map((b) => {
      const [year, month] = b.split("-");
      const date = new Date(Number(year), Number(month) - 1, 1);
      return date.toLocaleDateString("id-ID", { month: "short", year: "numeric" });
    }).join(", ");
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

      <Card>
        <CardHeader>
          <CardTitle>Daftar Pembayaran ({pembayaranList.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {pembayaranList.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Belum ada riwayat pembayaran.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {userRole === "admin" && (
                      <>
                        <TableHead>Warga</TableHead>
                        <TableHead>Blok Rumah</TableHead>
                      </>
                    )}
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Jenis Iuran</TableHead>
                    <TableHead>Bulan</TableHead>
                    <TableHead className="text-right">Nominal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Bukti</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pembayaranList.map((p) => (
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}