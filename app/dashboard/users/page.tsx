"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Plus, Pencil, KeyRound, UserX, UserCheck, Eye, EyeOff, AlertCircle, CheckCircle2, Search } from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  blok_rumah: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

export default function UsersPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  
  // Form states
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // Add user form
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newBlokRumah, setNewBlokRumah] = useState("");
  const [newRole, setNewRole] = useState("warga");
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  // Edit user form
  const [editUser, setEditUser] = useState<UserProfile | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBlokRumah, setEditBlokRumah] = useState("");
  const [editRole, setEditRole] = useState("warga");
  
  // Password change form
  const [passwordUserId, setPasswordUserId] = useState<string | null>(null);
  const [passwordEmail, setPasswordEmail] = useState("");
  const [changePassword, setChangePassword] = useState("");
  const [showChangePassword, setShowChangePassword] = useState(false);
  
  // Deactivate user
  const [deactivateUser, setDeactivateUser] = useState<UserProfile | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching users:", error);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const resetAddForm = () => {
    setNewEmail("");
    setNewPassword("");
    setNewFullName("");
    setNewPhone("");
    setNewBlokRumah("");
    setNewRole("warga");
    setShowNewPassword(false);
    setMsg(null);
  };

  const handleAddUser = async () => {
    setSaving(true);
    setMsg(null);

    if (!newEmail.trim() || !newPassword.trim()) {
      setMsg({ type: "error", text: "Email dan password wajib diisi." });
      setSaving(false);
      return;
    }

    if (newPassword.length < 6) {
      setMsg({ type: "error", text: "Password minimal 6 karakter." });
      setSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail.trim(),
          password: newPassword,
          full_name: newFullName.trim() || newEmail.trim(),
          phone: newPhone.trim(),
          blok_rumah: newBlokRumah.trim(),
          role: newRole,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMsg({ type: "error", text: result.error || "Gagal menambahkan user." });
      } else {
        setMsg({ type: "success", text: "User berhasil ditambahkan." });
        resetAddForm();
        fetchUsers();
        setTimeout(() => {
          setShowAddDialog(false);
          setMsg(null);
        }, 1500);
      }
    } catch (error) {
      setMsg({ type: "error", text: "Terjadi kesalahan." });
    }
    setSaving(false);
  };

  const handleEditUser = async () => {
    if (!editUser) return;
    setSaving(true);
    setMsg(null);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: editFullName.trim(),
        phone: editPhone.trim(),
        blok_rumah: editBlokRumah.trim(),
        role: editRole,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editUser.id);

    if (error) {
      setMsg({ type: "error", text: error.message });
    } else {
      setMsg({ type: "success", text: "Data user berhasil diperbarui." });
      fetchUsers();
      setTimeout(() => {
        setShowEditDialog(false);
        setMsg(null);
      }, 1500);
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (!passwordUserId) return;
    setSaving(true);
    setMsg(null);

    if (changePassword.length < 6) {
      setMsg({ type: "error", text: "Password minimal 6 karakter." });
      setSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/users/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: passwordUserId,
          newPassword: changePassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMsg({ type: "error", text: result.error || "Gagal mengubah password." });
      } else {
        setMsg({ type: "success", text: "Password berhasil diubah." });
        setChangePassword("");
        setTimeout(() => {
          setShowPasswordDialog(false);
          setMsg(null);
        }, 1500);
      }
    } catch (error) {
      setMsg({ type: "error", text: "Terjadi kesalahan." });
    }
    setSaving(false);
  };

  const handleDeactivateUser = async () => {
    if (!deactivateUser) return;
    setSaving(true);
    setMsg(null);

    try {
      const response = await fetch("/api/admin/users/deactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: deactivateUser.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMsg({ type: "error", text: result.error || "Gagal menonaktifkan user." });
      } else {
        setMsg({ type: "success", text: "User berhasil dinonaktifkan." });
        fetchUsers();
        setTimeout(() => {
          setShowDeactivateDialog(false);
          setMsg(null);
        }, 1500);
      }
    } catch (error) {
      setMsg({ type: "error", text: "Terjadi kesalahan." });
    }
    setSaving(false);
  };

  const openEditDialog = (user: UserProfile) => {
    setEditUser(user);
    setEditFullName(user.full_name || "");
    setEditPhone(user.phone || "");
    setEditBlokRumah(user.blok_rumah || "");
    setEditRole(user.role);
    setMsg(null);
    setShowEditDialog(true);
  };

  const openPasswordDialog = (user: UserProfile) => {
    setPasswordUserId(user.id);
    setPasswordEmail(user.email);
    setChangePassword("");
    setShowChangePassword(false);
    setMsg(null);
    setShowPasswordDialog(true);
  };

  const openDeactivateDialog = (user: UserProfile) => {
    setDeactivateUser(user);
    setMsg(null);
    setShowDeactivateDialog(true);
  };

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.email.toLowerCase().includes(query) ||
      (user.full_name?.toLowerCase().includes(query)) ||
      (user.blok_rumah?.toLowerCase().includes(query))
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Memuat data user...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Manajemen User</h2>
          <p className="text-muted-foreground">Kelola akun dan data warga</p>
        </div>
        <Button onClick={() => { resetAddForm(); setShowAddDialog(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Tambah User
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari nama, email, atau blok rumah..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar User ({filteredUsers.length})</CardTitle>
          <CardDescription>Semua user terdaftar dalam sistem</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {searchQuery ? "Tidak ada user yang cocok." : "Belum ada user terdaftar."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Blok Rumah</TableHead>
                  <TableHead>Telepon</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name || "-"}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.blok_rumah ? (
                        <Badge variant="secondary">{user.blok_rumah}</Badge>
                      ) : "-"}
                    </TableCell>
                    <TableCell>{user.phone || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === "admin" ? "default" : "outline"} className="capitalize">
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(user)}
                          title="Edit Data"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openPasswordDialog(user)}
                          title="Ubah Password"
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeactivateDialog(user)}
                          title="Nonaktifkan User"
                          className="text-destructive hover:text-destructive"
                        >
                          <UserX className="h-4 w-4" />
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

      {/* Add User Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah User Baru</DialogTitle>
            <DialogDescription>Buat akun baru untuk warga</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add_email">Email *</Label>
              <Input
                id="add_email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="email@contoh.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add_password">Password *</Label>
              <div className="relative">
                <Input
                  id="add_password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add_name">Nama Lengkap</Label>
              <Input
                id="add_name"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                placeholder="Nama lengkap"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add_phone">Nomor Telepon</Label>
              <Input
                id="add_phone"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="081234567890"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add_blok">Blok Rumah</Label>
              <Input
                id="add_blok"
                value={newBlokRumah}
                onChange={(e) => setNewBlokRumah(e.target.value)}
                placeholder="A1, B12, dll"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add_role">Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warga">Warga</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {msg && (
              <div className={`flex items-start gap-2 text-sm p-3 rounded-md ${
                msg.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-destructive/10 text-destructive border border-destructive/20"
              }`}>
                {msg.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                )}
                <span>{msg.text}</span>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Batal</Button>
              <Button onClick={handleAddUser} disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Data User</DialogTitle>
            <DialogDescription>Perbarui informasi profil user</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <p className="text-sm text-muted-foreground">{editUser?.email}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_name">Nama Lengkap</Label>
              <Input
                id="edit_name"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                placeholder="Nama lengkap"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_phone">Nomor Telepon</Label>
              <Input
                id="edit_phone"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="081234567890"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_blok">Blok Rumah</Label>
              <Input
                id="edit_blok"
                value={editBlokRumah}
                onChange={(e) => setEditBlokRumah(e.target.value)}
                placeholder="A1, B12, dll"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_role">Role</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warga">Warga</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {msg && (
              <div className={`flex items-start gap-2 text-sm p-3 rounded-md ${
                msg.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-destructive/10 text-destructive border border-destructive/20"
              }`}>
                {msg.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                )}
                <span>{msg.text}</span>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>Batal</Button>
              <Button onClick={handleEditUser} disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ubah Password User</DialogTitle>
            <DialogDescription>
              Ubah password untuk <strong>{passwordEmail}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="change_pass">Password Baru</Label>
              <div className="relative">
                <Input
                  id="change_pass"
                  type={showChangePassword ? "text" : "password"}
                  value={changePassword}
                  onChange={(e) => setChangePassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowChangePassword(!showChangePassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showChangePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {msg && (
              <div className={`flex items-start gap-2 text-sm p-3 rounded-md ${
                msg.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-destructive/10 text-destructive border border-destructive/20"
              }`}>
                {msg.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                )}
                <span>{msg.text}</span>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>Batal</Button>
              <Button onClick={handleChangePassword} disabled={saving || !changePassword}>
                {saving ? "Menyimpan..." : "Ubah Password"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deactivate User Dialog */}
      <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nonaktifkan User</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menonaktifkan user <strong>{deactivateUser?.full_name || deactivateUser?.email}</strong>?
              User tidak akan bisa login lagi, tetapi data pembayaran tetap tersimpan.
            </DialogDescription>
          </DialogHeader>
          
          {msg && (
            <div className={`flex items-start gap-2 text-sm p-3 rounded-md ${
              msg.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-destructive/10 text-destructive border border-destructive/20"
            }`}>
              {msg.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              )}
              <span>{msg.text}</span>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeactivateDialog(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDeactivateUser} disabled={saving}>
              {saving ? "Memproses..." : "Nonaktifkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}