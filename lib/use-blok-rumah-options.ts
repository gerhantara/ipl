"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { BLOK_RUMAH_OPTIONS } from "@/lib/blok-rumah-options";

// Urutkan sesuai urutan kanonik BLOK_RUMAH_OPTIONS (mis. 1/1 ... 4/11, A-1 ... BC-14)
// agar dropdown/datalist tetap rapi meski hasil query dari tabel `rumah` tidak berurutan.
function orderByCanonical(bloks: string[]): string[] {
  const order = new Map<string, number>();
  BLOK_RUMAH_OPTIONS.forEach((b, i) => order.set(b, i));
  return [...bloks].sort((a, b) => {
    const ia = order.get(a);
    const ib = order.get(b);
    if (ia !== undefined && ib !== undefined) return ia - ib;
    if (ia !== undefined) return -1;
    if (ib !== undefined) return 1;
    return a.localeCompare(b);
  });
}

/**
 * Mengambil daftar blok rumah dari tabel `rumah` (hanya yang is_aktif = true)
 * sebagai referensi pada saat pendaftaran / pembayaran.
 *
 * Fallback ke BLOK_RUMAH_OPTIONS statis jika query gagal atau tabel belum terisi,
 * sehingga halaman tetap berfungsi sebelum data `rumah` disiapkan.
 */
export function useBlokRumahOptions() {
  const [blokOptions, setBlokOptions] = useState<string[]>([...BLOK_RUMAH_OPTIONS]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchOptions = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("rumah")
        .select("blok_rumah")
        .eq("is_aktif", true);

      if (!active) return;

      if (data && data.length > 0) {
        setBlokOptions(orderByCanonical(data.map((r) => r.blok_rumah)));
      }
      setLoading(false);
    };

    fetchOptions();
    return () => {
      active = false;
    };
  }, []);

  return { blokOptions, loading };
}
