"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Save, AlertCircle, CheckCircle2, KeyRound, Eye, EyeOff } from "lucide-react";
import { useBlokRumahOptions } from "@/lib/use-blok-rumah-options";

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const { blokOptions } = useBlokRumahOptions();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);

  // Profile data
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [pasangan, setPasangan] = useState("");
  const [blokRumah, setBlokRumah] = useState("");
  const [statusKepemilikan, setStatusKepemilikan] = useState("milik_sendiri");
  const [tanggalSelesaiKontrak, setTanggalSelesaiKontrak] = useState("");
  const [role, setRole] = useState("warga");
  const [currentEmail, setCurrentEmail] = useState("");

  // Email change
  const [newEmail, setNewEmail] = useState("");

  // Password change
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Messages
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [emailMsg, setEmailMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentEmail(user.email || "");
      setNewEmail(user.email || "");

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("full_name, phone, pasangan, blok_rumah, status_kepemilikan, tanggal_selesai_kontrak, role, email")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
      }

      if (profile) {
        setFullName(profile.full_name || "");
        setPhone(profile.phone || "");
        setPasangan(profile.pasangan || "");
        setBlokRumah(profile.blok_rumah || "");
        setStatusKepemilikan(profile.status_kepemilikan || "milik_sendiri");
        setTanggalSelesaiKontrak(profile.tanggal_selesai_kontrak || "");
        setRole(profile.role || "warga");
      }
      setLoading(false);
    };

    fetchProfile();
  }, [supabase]);

  const handleSaveProfile = async () => {
    setSaving(true);
    setProfileMsg(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setProfileMsg({ type: "error", text: "Sesi tidak valid." });
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        phone: phone.trim(),
        pasangan: pasangan.trim() || null,
        blok_rumah: blokRumah.trim(),
        status_kepemilikan: statusKepemilikan,
        tanggal_selesai_kontrak: statusKepemilikan === "kontrak" ? (tanggalSelesaiKontrak || null) : null,
        email: currentEmail,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      setProfileMsg({ type: "error", text: error.message });
    } else {
      setProfileMsg({ type: "success", text: "Profil berhasil diperbarui." });
      window.dispatchEvent(new Event("profile-updated"));
      router.refresh();
    }
    setSaving(false);
  };

  const handlePasswordChange = async () => {
    setSavingPassword(true);
    setPasswordMsg(null);

    if (newPassword.length < 6) {
      setPasswordMsg({ type: "error", text: "Password baru minimal harus 6 karakter." });
      setSavingPassword(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "Konfirmasi password tidak cocok." });
      setSavingPassword(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setPasswordMsg({ type: "error", text: error.message });
    } else {
      setPasswordMsg({ type: "success", text: "Password berhasil diubah." });
      setNewPassword("");
      setConfirmPassword("");
    }
    setSavingPassword(false);
  };

  const handleEmailChange = async () => {
    setSavingEmail(true);
    setEmailMsg(null);

    const trimmedEmail = newEmail.trim();

    if (trimmedEmail === currentEmail) {
      setEmailMsg({ type: "error", text: "Email baru sama dengan email saat ini." });
      setSavingEmail(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ email: trimmedEmail });

    if (error) {
      setEmailMsg({ type: "error", text: error.message });
    } else {
      setEmailMsg({
        type: "success",
        text: "Link konfirmasi telah dikirim ke email lama dan email baru. Silakan cek kedua kotak masuk untuk mengonfirmasi perubahan.",
      });
    }
    setSavingEmail(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Memuat data profil...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Profil Saya</h2>
        <p className="text-muted-foreground">Kelola informasi akun dan data pribadi Anda</p>
      </div>

      {/* Profile Data Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" /> Data Profil
          </CardTitle>
          <CardDescription>
            Data ini digunakan untuk identifikasi pembayaran IPL Anda
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Role (read-only) */}
          <div className="space-y-2">
            <Label>Role</Label>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="capitalize">{role}</Badge>
              <span className="text-xs text-muted-foreground">(tidak dapat diubah)</span>
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="full_name">Nama Lengkap / Display Name</Label>
            <Input
              id="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Masukkan nama lengkap"
            />
          </div>

          {/* Blok Rumah */}
          <div className="space-y-2">
            <Label htmlFor="blok_rumah">Blok Rumah</Label>
            <Input
              id="blok_rumah"
              value={blokRumah}
              onChange={(e) => setBlokRumah(e.target.value)}
              list="blok-rumah-options"
              placeholder="Cari atau pilih blok rumah"
            />
            <datalist id="blok-rumah-options">
              {blokOptions.map((blok) => (
                <option key={blok} value={blok} />
              ))}
            </datalist>
          </div>

          {/* Status Kepemilikan */}
          <div className="space-y-2">
            <Label htmlFor="status_kepemilikan">Status Kepemilikan Rumah</Label>
            <select
              id="status_kepemilikan"
              value={statusKepemilikan}
              onChange={(e) => setStatusKepemilikan(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="milik_sendiri">Milik Sendiri</option>
              <option value="kontrak">Kontrak</option>
            </select>
          </div>

          {/* Tanggal Selesai Kontrak (hanya untuk kontrak) */}
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

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Nomor Telepon</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Contoh: 081234567890"
            />
          </div>

          {/* Pasangan */}
          <div className="space-y-2">
            <Label htmlFor="pasangan">Nama Pasangan</Label>
            <Input
              id="pasangan"
              value={pasangan}
              onChange={(e) => setPasangan(e.target.value)}
              placeholder="Kosongkan jika tidak ada / N/A"
            />
          </div>

          {/* Message */}
          {profileMsg && (
            <div className={`flex items-start gap-2 text-sm p-3 rounded-md ${
              profileMsg.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-destructive/10 text-destructive border border-destructive/20"
            }`}>
              {profileMsg.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              )}
              <span>{profileMsg.text}</span>
            </div>
          )}

          <Button onClick={handleSaveProfile} disabled={saving}>
            <Save className="h-4 w-4 mr-1" />
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </CardContent>
      </Card>

      {/* Email Change Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" /> Ubah Email
          </CardTitle>
          <CardDescription>
            Email digunakan untuk login.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="email@contoh.com"
            />
            <p className="text-xs text-muted-foreground">
              Email saat ini: <strong>{currentEmail}</strong>
            </p>
          </div>

          {/* Message */}
          {emailMsg && (
            <div className={`flex items-start gap-2 text-sm p-3 rounded-md ${
              emailMsg.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-destructive/10 text-destructive border border-destructive/20"
            }`}>
              {emailMsg.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              )}
              <span>{emailMsg.text}</span>
            </div>
          )}

          <Button onClick={handleEmailChange} disabled={savingEmail || newEmail.trim() === currentEmail}>
            <Mail className="h-4 w-4 mr-1" />
            {savingEmail ? "Memproses..." : "Simpan"}
          </Button>
        </CardContent>
      </Card>

      {/* Password Change Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" /> Ubah Password
          </CardTitle>
          <CardDescription>
            Pastikan password baru minimal 6 karakter.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new_password">Password Baru</Label>
            <div className="relative">
              <Input
                id="new_password"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Masukkan password baru"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm_password">Konfirmasi Password Baru</Label>
            <div className="relative">
              <Input
                id="confirm_password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Message */}
          {passwordMsg && (
            <div className={`flex items-start gap-2 text-sm p-3 rounded-md ${
              passwordMsg.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-destructive/10 text-destructive border border-destructive/20"
            }`}>
              {passwordMsg.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              )}
              <span>{passwordMsg.text}</span>
            </div>
          )}

          <Button
            onClick={handlePasswordChange}
            disabled={savingPassword || !newPassword || !confirmPassword}
          >
            <KeyRound className="h-4 w-4 mr-1" />
            {savingPassword ? "Memproses..." : "Ubah Password"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}