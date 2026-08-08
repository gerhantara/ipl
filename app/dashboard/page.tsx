"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, TrendingDown, Clock, Check, X } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Stats {
  totalPemasukan: number;
  totalPengeluaran: number;
  pendingVerification: number;
}

interface MonthlyData {
  bulan: string;
  pemasukan: number;
  pengeluaran: number;
}

interface WargaPaymentRow {
  id: string;
  full_name: string;
  blok_rumah: string | null;
  paidMonths: string[];
  paidCount: number;
}

export default function DashboardPage() {
  const supabase = createClient();
  const [stats, setStats] = useState<Stats>({
    totalPemasukan: 0,
    totalPengeluaran: 0,
    pendingVerification: 0,
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [userRole, setUserRole] = useState<string>("warga");
  const [loading, setLoading] = useState(true);

  // Payment matrix state
  const [last12Months, setLast12Months] = useState<{ key: string; label: string }[]>([]);
  const [wargaPayments, setWargaPayments] = useState<WargaPaymentRow[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUserRole(profile.role);
      }

      // Generate months for year 2026 only
      const months: { key: string; label: string }[] = [];
      for (let m = 0; m < 12; m++) {
        const d = new Date(2026, m, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
        months.push({ key, label });
      }
      setLast12Months(months);
      const monthKeys = new Set(months.map((m) => m.key));

      if (profile?.role === "admin") {
        // Fetch all stats for admin
        const { data: pemasukan } = await supabase
          .from("pembayaran")
          .select("nominal, status, tanggal_bayar")
          .eq("status", "verified");

        const { data: pengeluaran } = await supabase
          .from("pengeluaran")
          .select("nominal, tanggal");

        const { data: pending } = await supabase
          .from("pembayaran")
          .select("id")
          .eq("status", "pending");

        const totalPemasukan = pemasukan?.reduce((sum, p) => sum + Number(p.nominal), 0) || 0;
        const totalPengeluaran = pengeluaran?.reduce((sum, p) => sum + Number(p.nominal), 0) || 0;

        setStats({
          totalPemasukan,
          totalPengeluaran,
          pendingVerification: pending?.length || 0,
        });

        // Build monthly data for year 2026
        const monthlyMap: Record<string, { pemasukan: number; pengeluaran: number }> = {};
        for (let m = 0; m < 12; m++) {
          const d = new Date(2026, m, 1);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          monthlyMap[key] = { pemasukan: 0, pengeluaran: 0 };
        }

        pemasukan?.forEach((p) => {
          const key = String(p.tanggal_bayar).substring(0, 7);
          if (monthlyMap[key]) {
            monthlyMap[key].pemasukan += Number(p.nominal);
          }
        });

        pengeluaran?.forEach((p) => {
          const key = String(p.tanggal).substring(0, 7);
          if (monthlyMap[key]) {
            monthlyMap[key].pengeluaran += Number(p.nominal);
          }
        });

        const chartData = Object.entries(monthlyMap).map(([bulan, val]) => ({
          bulan,
          pemasukan: val.pemasukan,
          pengeluaran: val.pengeluaran,
        }));

        setMonthlyData(chartData);
      } else {
        // Fetch user's own payment stats
        const { data: myPayments } = await supabase
          .from("pembayaran")
          .select("nominal, status")
          .eq("user_id", user.id);

        const totalPemasukan = myPayments
          ?.filter((p) => p.status === "verified")
          .reduce((sum, p) => sum + Number(p.nominal), 0) || 0;

        const pendingCount = myPayments?.filter((p) => p.status === "pending").length || 0;

        setStats({
          totalPemasukan,
          totalPengeluaran: 0,
          pendingVerification: pendingCount,
        });
      }

      // Fetch all warga profiles and payments (visible to all authenticated users)
      const { data: wargaProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, blok_rumah")
        .eq("role", "warga")
        .order("full_name", { ascending: true });

      // Fetch all verified payments with bulan_bayar
      const { data: allPayments } = await supabase
        .from("pembayaran")
        .select("user_id, bulan_bayar")
        .eq("status", "verified");

      // Build user -> paid months map (only for last 12 months)
      const userPaidMonths: Record<string, Set<string>> = {};
      allPayments?.forEach((payment) => {
        if (!payment.user_id || !payment.bulan_bayar) return;
        if (!userPaidMonths[payment.user_id]) {
          userPaidMonths[payment.user_id] = new Set();
        }
        (payment.bulan_bayar as string[]).forEach((bulan: string) => {
          if (monthKeys.has(bulan)) {
            userPaidMonths[payment.user_id].add(bulan);
          }
        });
      });

      // Build payment rows (convert Set to sorted array for React-safe state)
      const rows: WargaPaymentRow[] = (wargaProfiles || []).map((warga) => {
        const paidSet = userPaidMonths[warga.id] || new Set<string>();
        return {
          id: warga.id,
          full_name: warga.full_name || "Tanpa Nama",
          blok_rumah: warga.blok_rumah,
          paidMonths: Array.from(paidSet),
          paidCount: paidSet.size,
        };
      });

      // Sort by least paid first (ascending)
      rows.sort((a, b) => a.paidCount - b.paidCount);

      setWargaPayments(rows);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Memuat data...</p>
      </div>
    );
  }

  const saldoKas = stats.totalPemasukan - stats.totalPengeluaran;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          {userRole === "admin"
            ? "Ringkasan keuangan iuran pemeliharaan lingkungan"
            : "Ringkasan pembayaran IPL Anda"}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {userRole === "admin" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo Kas</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${saldoKas >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(saldoKas)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total saldo tersedia
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {userRole === "admin" ? "Total Pemasukan" : "Total Dibayar"}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalPemasukan)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {userRole === "admin" ? "Dari pembayaran terverifikasi" : "Pembayaran terverifikasi"}
            </p>
          </CardContent>
        </Card>

        {userRole === "admin" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pengeluaran</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(stats.totalPengeluaran)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total kas dikeluarkan
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {userRole === "admin" ? "Perlu Verifikasi" : "Pending"}
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.pendingVerification}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {userRole === "admin" ? "Pembayaran menunggu" : "Pembayaran Anda menunggu"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts - Admin only */}
      {userRole === "admin" && monthlyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Grafik Pemasukan vs Pengeluaran</CardTitle>
            <CardDescription>Tahun 2026</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bulan" />
                <YAxis
                  tickFormatter={(value) =>
                    new Intl.NumberFormat("id-ID", {
                      notation: "compact",
                      compactDisplay: "short",
                    }).format(value)
                  }
                />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                />
                <Legend />
                <Bar dataKey="pemasukan" name="Pemasukan" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pengeluaran" name="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Payment Matrix Table */}
      <Card>
        <CardHeader>
          <CardTitle>Status Pembayaran Warga</CardTitle>
          <CardDescription>
            Rekap pembayaran IPL tahun 2026 (diurutkan dari yang paling sedikit membayar)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {wargaPayments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Belum ada data warga.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10 min-w-[180px]">Nama Warga</TableHead>
                    <TableHead className="text-center">Blok</TableHead>
                    {last12Months.map((month) => (
                      <TableHead key={month.key} className="text-center min-w-[70px]">
                        {month.label}
                      </TableHead>
                    ))}
                    <TableHead className="text-center min-w-[80px]">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wargaPayments.map((warga) => {
                    const paidSet = new Set(warga.paidMonths);
                    return (
                      <TableRow key={warga.id}>
                        <TableCell className="font-medium sticky left-0 bg-background z-10">
                          {warga.full_name}
                        </TableCell>
                        <TableCell className="text-center">
                          {warga.blok_rumah ? (
                            <Badge variant="secondary">{warga.blok_rumah}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        {last12Months.map((month) => {
                          const isPaid = paidSet.has(month.key);
                          return (
                            <TableCell key={month.key} className="text-center">
                              {isPaid ? (
                                <span className="inline-flex items-center justify-center">
                                  <Check className="h-4 w-4 text-green-600" />
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center">
                                  <X className="h-4 w-4 text-red-600" />
                                </span>
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center">
                          <Badge variant={warga.paidCount === 12 ? "default" : warga.paidCount >= 6 ? "secondary" : "destructive"}>
                            {warga.paidCount}/12
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}