-- ============================================================================
-- Perbaikan: data pendaftaran (form register) tidak tersimpan ke tabel profiles
-- ----------------------------------------------------------------------------
-- Masalah:
--   Trigger `handle_new_user` lama hanya menyalin `full_name` dan `role` dari
--   `auth.users.raw_user_meta_data`. Kolom phone, pasangan, blok_rumah,
--   status_kepemilikan, tanggal_selesai_kontrak TIDAK pernah tersimpan,
--   sehingga user yang daftar sendiri muncul tanpa data di daftar admin.
--   Jika trigger tidak ada di database, baris profile bahkan tidak dibuat.
--
-- Jalankan seluruh blok ini di Supabase SQL Editor (sekali saja).
-- ============================================================================

-- 1) Perbarui fungsi trigger agar menyalin SEMUA data pendaftaran
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, full_name, phone, pasangan, blok_rumah,
    status_kepemilikan, tanggal_selesai_kontrak, role, is_active
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    NULLIF(NEW.raw_user_meta_data->>'pasangan', ''),
    NULLIF(NEW.raw_user_meta_data->>'blok_rumah', ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'status_kepemilikan', ''), 'milik_sendiri'),
    NULLIF(NEW.raw_user_meta_data->>'tanggal_selesai_kontrak', '')::date,
    COALESCE(NEW.raw_user_meta_data->>'role', 'warga'),
    false -- akun baru nonaktif sampai diaktivasi admin
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2) Pastikan trigger aktif (membuat ulang jika belum ada di database)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3) Opsional — Perbaiki user yang SUDAH terdaftar: lengkapi kolom profile
--    yang masih kosong dari raw_user_meta_data (tanpa menimpa data yang sudah ada)
UPDATE public.profiles p
SET
  phone                   = COALESCE(p.phone, NULLIF(u.raw_user_meta_data->>'phone', '')),
  pasangan                = COALESCE(p.pasangan, NULLIF(u.raw_user_meta_data->>'pasangan', '')),
  blok_rumah              = COALESCE(p.blok_rumah, NULLIF(u.raw_user_meta_data->>'blok_rumah', '')),
  status_kepemilikan      = COALESCE(
                              p.status_kepemilikan,
                              NULLIF(u.raw_user_meta_data->>'status_kepemilikan', ''),
                              'milik_sendiri'
                            ),
  tanggal_selesai_kontrak = COALESCE(
                              p.tanggal_selesai_kontrak,
                              NULLIF(u.raw_user_meta_data->>'tanggal_selesai_kontrak', '')::date
                            ),
  updated_at              = NOW()
FROM auth.users u
WHERE u.id = p.id
  AND (
    p.phone IS NULL
    OR p.pasangan IS NULL
    OR p.blok_rumah IS NULL
    OR p.status_kepemilikan IS NULL
    OR p.tanggal_selesai_kontrak IS NULL
  );

-- 4) Opsional — Buat baris profile untuk user di auth.users yang BELUM punya
--    baris profile sama sekali (mis. trigger lama belum pernah ada).
--    is_active = true agar tidak mengunci user yang sebenarnya sudah bisa
--    masuk aplikasi (middleware memperlakukan profile kosong sebagai aktif).
INSERT INTO public.profiles (
  id, email, full_name, phone, pasangan, blok_rumah,
  status_kepemilikan, tanggal_selesai_kontrak, role, is_active
)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email),
  NULLIF(u.raw_user_meta_data->>'phone', ''),
  NULLIF(u.raw_user_meta_data->>'pasangan', ''),
  NULLIF(u.raw_user_meta_data->>'blok_rumah', ''),
  COALESCE(NULLIF(u.raw_user_meta_data->>'status_kepemilikan', ''), 'milik_sendiri'),
  NULLIF(u.raw_user_meta_data->>'tanggal_selesai_kontrak', '')::date,
  COALESCE(u.raw_user_meta_data->>'role', 'warga'),
  true
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
