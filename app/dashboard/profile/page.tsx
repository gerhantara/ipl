"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Save, AlertCircle, CheckCircle2 } from "lucide-react";

export default function ProfilePage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);

  // Profile data
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [blokRumah, setBlokRumah] = useState("");
  const [role, setRole] = useState("warga");
  const [currentEmail, setCurrentEmail] = useState("");

  // Email change
  const [newEmail, setNewEmail] = useState("");

  // Messages
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [emailMsg, setEmailMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentEmail(user.email || "");
      setNewEmail(user.email || "");

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("full_name, phone, blok_rumah, role, email")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
      }

      if (profile) {
        setFullName(profile.full_name || "");
        setPhone(profile.phone || "");
        setBlokRumah(profile.blok_rumah || "");
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
        blok_rumah: blokRumah.trim(),
        email: currentEmail,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      setProfileMsg({ type: "error", text: error.message });
    } else {
      setProfileMsg({ type: "success", text: "Profil berhasil diperbarui." });
    }
    setSaving(false);
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
              placeholder="Contoh: A1, B12, C3"
            />
          </div>

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
            Email digunakan untuk login. Perubahan email memerlukan konfirmasi melalui email lama dan baru.
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
            {savingEmail ? "Memproses..." : "Kirim Konfirmasi Ubah Email"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}