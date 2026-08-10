"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Tampilkan pesan jika diarahkan ke sini karena akun nonaktif (dari middleware)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "inactive") {
      setError("Akun Anda belum aktif / dinonaktifkan. Silakan hubungi admin untuk aktivasi.");
      supabase.auth.signOut();
    }
  }, [supabase]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Akun yang diban/dinonaktifkan tidak bisa login
      if (/banned|ban/i.test(error.message)) {
        setError("Akun Anda dinonaktifkan. Silakan hubungi admin untuk aktivasi.");
      } else {
        setError(error.message);
      }
      setLoading(false);
      return;
    }

    // Pertahanan ganda: user dengan is_active = false tidak boleh login
    if (data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_active")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profile && profile.is_active === false) {
        await supabase.auth.signOut();
        setError("Akun Anda belum aktif / dinonaktifkan. Silakan hubungi admin untuk aktivasi.");
        setLoading(false);
        return;
      }
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Masuk ke akun Anda untuk mengakses sistem IPL
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Memproses..." : "Masuk"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Belum punya akun?{" "}
            <Link href="/auth/register" className="text-primary hover:underline">
              Daftar disini
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}