-- ============================================================================
-- Tambah policy DELETE untuk pembayaran (khusus admin)
-- ----------------------------------------------------------------------------
-- Sebelumnya tabel pembayaran tidak punya policy DELETE sama sekali, sehingga
-- admin tidak bisa menghapus pembayaran (pending/rejected) dari halaman
-- Riwayat Pembayaran meski sudah lolos pengecekan role di UI.
--
-- Jalankan sekali di Supabase SQL Editor pada database yang sudah ada.
-- ============================================================================

DROP POLICY IF EXISTS "Admin can delete pembayaran" ON public.pembayaran;
CREATE POLICY "Admin can delete pembayaran" ON public.pembayaran
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
