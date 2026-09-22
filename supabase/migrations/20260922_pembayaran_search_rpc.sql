-- ============================================================================
-- RPC pencarian pembayaran (server-side / di database)
-- ----------------------------------------------------------------------------
-- Dipakai halaman Riwayat Pembayaran & Verifikasi Pembayaran. Pencarian
-- dilakukan di database, bukan di browser, agar tetap cepat saat data besar.
--
-- Mencari berdasarkan:
--   - nama warga        (profiles.full_name)
--   - blok rumah        (profiles.blok_rumah)
--   - jenis iuran       (jenis_iuran.nama)
--   - bulan             (bulan_bayar: "2024", "2024-01", "jan", "januari",
--                        maupun "jan 2024")
--
-- Jalankan sekali di Supabase SQL Editor pada database yang sudah ada.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.search_pembayaran(
  p_q TEXT DEFAULT NULL,
  p_status TEXT[] DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.created_at DESC), '[]'::jsonb)
  FROM (
    SELECT
      pb.id,
      pb.tanggal_bayar,
      pb.bulan_bayar,
      pb.nominal,
      pb.status,
      pb.bukti_transfer_url,
      pb.catatan,
      pb.created_at,
      jsonb_build_object('full_name', pr.full_name, 'blok_rumah', pr.blok_rumah) AS profiles,
      jsonb_build_object('nama', ji.nama) AS jenis_iuran,
      jsonb_build_object('nama_bank', rk.nama_bank, 'nomor_rekening', rk.nomor_rekening) AS rekening
    FROM public.pembayaran pb
    LEFT JOIN public.profiles pr ON pr.id = pb.user_id
    LEFT JOIN public.jenis_iuran ji ON ji.id = pb.jenis_iuran_id
    LEFT JOIN public.rekening rk ON rk.id = pb.rekening_id
    WHERE (p_user_id IS NULL OR pb.user_id = p_user_id)
      AND (p_status IS NULL OR pb.status = ANY(p_status))
      AND (
        p_q IS NULL
        OR btrim(p_q) = ''
        OR pr.full_name ILIKE '%' || p_q || '%'
        OR pr.blok_rumah ILIKE '%' || p_q || '%'
        OR ji.nama ILIKE '%' || p_q || '%'
        OR EXISTS (
          SELECT 1
          FROM unnest(pb.bulan_bayar) AS b
          CROSS JOIN LATERAL (
            SELECT COALESCE(
              (ARRAY['januari','februari','maret','april','mei','juni','juli',
                     'agustus','september','oktober','november','desember']
              )[NULLIF(substring(b FROM 6 FOR 2), '')::int],
              ''
            ) AS nama
          ) mb
          WHERE (
            substr(mb.nama, 1, 3) || ' ' || substr(b, 1, 4) || ' ' || mb.nama || ' ' || b
          ) ILIKE '%' || p_q || '%'
        )
      )
  ) t;
$$;
