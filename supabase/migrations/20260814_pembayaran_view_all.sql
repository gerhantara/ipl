-- ============================================================================
-- Ganti policy SELECT pembayaran: dari "hanya milik sendiri" menjadi
-- "semua user login bisa lihat semua pembayaran"
-- ----------------------------------------------------------------------------
-- schema.sql sudah diperbarui ("Authenticated users can view all pembayaran"),
-- tapi database yang sudah ada masih memakai policy lama
-- "Users can view their own pembayaran" (auth.uid() = user_id) karena
-- perubahan itu belum pernah dimigrasikan. Akibatnya Payment Matrix Table di
-- dashboard hanya menampilkan data pembayaran milik user yang sedang login,
-- meski warga lain sudah diverifikasi admin.
--
-- Jalankan sekali di Supabase SQL Editor pada database yang sudah ada.
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own pembayaran" ON public.pembayaran;
DROP POLICY IF EXISTS "Authenticated users can view all pembayaran" ON public.pembayaran;
CREATE POLICY "Authenticated users can view all pembayaran" ON public.pembayaran
  FOR SELECT USING (auth.uid() IS NOT NULL);
