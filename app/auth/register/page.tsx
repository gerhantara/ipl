"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useBlokRumahOptions } from "@/lib/use-blok-rumah-options";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [pasangan, setPasangan] = useState("");
  const [blokRumah, setBlokRumah] = useState("");
  const [statusKepemilikan, setStatusKepemilikan] = useState("milik_sendiri");
  const [tanggalSelesaiKontrak, setTanggalSelesaiKontrak] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { blokOptions } = useBlokRumahOptions();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validasi ketersediaan blok_rumah: tolak pendaftaran jika blok sudah dipakai
    const blok = blokRumah.trim();
    if (!blok) {
      setError("Blok rumah wajib diisi.");
      setLoading(false);
      return;
    }

    // Tolak pendaftaran jika blok sudah terdaftar oleh pemilik lain
    // (catatan: is_double hanya penanda blok milik pemilik yang sama, bukan izin 2 pemilik)
    const { count, error: countError } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("blok_rumah", blok);

    if (!countError && count !== null && count >= 1) {
      setError(`Blok ${blok} sudah terdaftar oleh pemilik lain. Pendaftaran ditolak.`);
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Menonaktifkan email konfirmasi, aktivasi dilakukan oleh admin
        emailRedirectTo: `${location.origin}/auth/callback`,
        data: {
          full_name: fullName,
          phone,
          pasangan: pasangan || null,
          blok_rumah: blokRumah,
          status_kepemilikan: statusKepemilikan,
          tanggal_selesai_kontrak: statusKepemilikan === "kontrak" ? (tanggalSelesaiKontrak || null) : null,
          role: "warga",
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Registrasi Berhasil!</CardTitle>
            <CardDescription>
              Akun Anda telah dibuat dan sedang menunggu aktivasi dari admin. Silakan hubungi pengurus.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/auth/login">
              <Button className="w-full">Kembali ke Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Daftar Akun</CardTitle>
          <CardDescription>
            Buat akun baru untuk mengakses sistem IPL
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="fullName">Nama Lengkap</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Nama lengkap Anda"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
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
              <Label htmlFor="phone">No. Telepon</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="08xxxxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pasangan">Nama Pasangan</Label>
              <Input
                id="pasangan"
                type="text"
                placeholder="Kosongkan jika tidak ada / N/A"
                value={pasangan}
                onChange={(e) => setPasangan(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="blokRumah">Blok Rumah</Label>
              <Input
                id="blokRumah"
                type="text"
                list="blok-rumah-options"
                placeholder="Cari atau pilih blok rumah"
                value={blokRumah}
                onChange={(e) => setBlokRumah(e.target.value)}
                required
              />
              <datalist id="blok-rumah-options">
                {blokOptions.map((blok) => (
                  <option key={blok} value={blok} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status_kepemilikan">Status Kepemilikan Rumah</Label>
              <Select value={statusKepemilikan} onValueChange={setStatusKepemilikan}>
                <SelectTrigger id="status_kepemilikan">
                  <SelectValue placeholder="Pilih status kepemilikan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="milik_sendiri">Milik Sendiri</SelectItem>
                  <SelectItem value="kontrak">Kontrak</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {statusKepemilikan === "kontrak" && (
              <div className="space-y-2">
                <Label htmlFor="tanggal_selesai_kontrak">Tanggal Selesai Kontrak</Label>
                <Input
                  id="tanggal_selesai_kontrak"
                  type="date"
                  value={tanggalSelesaiKontrak}
                  onChange={(e) => setTanggalSelesaiKontrak(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Memproses..." : "Daftar"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Sudah punya akun?{" "}
            <Link href="/auth/login" className="text-primary hover:underline">
              Login disini
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}