"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, TrendingDown, Clock } from "lucide-react";
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

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUserRole(profile.role);
      }

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
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          monthlyMap[key] = { pemasukan: 0, pengeluaran: 0 };
        }

        pemasukan?.forEach((p) => {
          const key = (p.tanggal_bayar as string).substring(0, 7);
          if (monthlyMap[key]) {
            monthlyMap[key].pemasukan += Number(p.nominal);
          }
        });

        pengeluaran?.forEach((p) => {
          const key = (p.tanggal as string).substring(0, 7);
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
          .select("nominal, status, tanggal_bayar")
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
    </div>
  );
}