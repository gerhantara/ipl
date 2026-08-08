"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, TrendingDown, Clock, Check, X, AlertTriangle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
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

      // Generate last 12 months keys
      const now = new Date();
      const months: { key: string; label: string }[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
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

        // Build monthly data for last 6 months
        const monthlyMap: Record<string, { pemasukan: number; pengeluaran: number }> = {};
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
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

  // Compute compliance data for pie chart (last 12 months)
  const totalWarga = wargaPayments.length;
  const totalBulan = 12;
  const totalSlot = totalWarga * totalBulan; // total expected payments
  const totalPaid = wargaPayments.reduce((sum, w) => sum + w.paidCount, 0);
  const totalUnpaid = Math.max(0, totalSlot - totalPaid);

  const complianceData = [
    { name: "Belum Bayar", value: totalUnpaid, color: "#dc2626" }, // strong red
    { name: "Lunas", value: totalPaid, color: "#86efac" }, // light green
  ];

  const compliancePercent = totalSlot > 0 ? Math.round((totalUnpaid / totalSlot) * 100) : 0;

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
            <CardDescription>6 bulan terakhir</CardDescription>
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

      {/* Payment Compliance Pie Chart - visible to all, emphasized on unpaid */}
      {totalWarga > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Ketertiban Pembayaran IPL Wajib
            </CardTitle>
            <CardDescription>
              Rekap status pembayaran IPL 12 bulan terakhir (semua warga)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 items-center">
              <div className="relative">
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={complianceData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      // Make "Belum Bayar" slice visually larger by giving it a bigger outer radius
                      outerRadius={(entry: { name?: string } | undefined) =>
                        entry && entry.name === "Belum Bayar" ? 130 : 100
                      }
                      innerRadius={50}
                      paddingAngle={2}
                      startAngle={90}
                      endAngle={-270}
                      label={({ name, value, percent }) =>
                        `${name}: ${value} (${((percent ?? 0) * 100).toFixed(0)}%)`
                      }
                      labelLine={false}
                      isAnimationActive={true}
                    >
                      {complianceData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          stroke={entry.name === "Belum Bayar" ? "#991b1b" : "#16a34a"}
                          strokeWidth={entry.name === "Belum Bayar" ? 4 : 1}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [
                        `${value ?? 0} pembayaran`,
                        name ?? "",
                      ]}
                    />
                    {/* Center label showing unpaid percentage */}
                    <text
                      x="50%"
                      y="50%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-foreground"
                    >
                      <tspan x="50%" dy="-0.5em" fontSize="28" fontWeight="bold" fill="#dc2626">
                        {compliancePercent}%
                      </tspan>
                      <tspan x="50%" dy="1.5em" fontSize="12" fill="currentColor">
                        Belum Bayar
                      </tspan>
                    </text>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-4">
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-red-600">Belum Bayar</p>
                      <p className="text-2xl font-bold text-red-700">{totalUnpaid}</p>
                      <p className="text-xs text-red-500 mt-1">
                        dari {totalSlot} total pembayaran seharusnya
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-red-600 flex items-center justify-center">
                      <AlertTriangle className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700">Lunas</p>
                      <p className="text-2xl font-bold text-green-700">{totalPaid}</p>
                      <p className="text-xs text-green-600 mt-1">
                        dari {totalSlot} total pembayaran seharusnya
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>
                    📊 Tingkat ketertiban:{" "}
                    <span className="font-semibold text-foreground">
                      {totalSlot > 0 ? Math.round((totalPaid / totalSlot) * 100) : 0}%
                    </span>
                  </p>
                  <p className="mt-1">
                    👥 Total warga: <span className="font-semibold text-foreground">{totalWarga} orang</span>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Matrix Table */}
      <Card>
        <CardHeader>
          <CardTitle>Status Pembayaran Warga</CardTitle>
          <CardDescription>
            Rekap pembayaran IPL 12 bulan terakhir (diurutkan dari yang paling sedikit membayar)
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