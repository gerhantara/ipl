-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  blok_rumah TEXT,
  status_kepemilikan TEXT DEFAULT 'milik_sendiri' CHECK (status_kepemilikan IN ('milik_sendiri', 'kontrak')),
  role TEXT DEFAULT 'warga' CHECK (role IN ('admin', 'warga')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: update all" ON public.profiles;
CREATE POLICY "Profiles: update own or admin" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() = id
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Function to prevent non-admin from changing role
CREATE OR REPLACE FUNCTION public.prevent_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow role change only if the current user is an admin
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
      RAISE EXCEPTION 'Hanya admin yang dapat mengubah role pengguna';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to enforce role change restriction
DROP TRIGGER IF EXISTS prevent_role_change_trigger ON public.profiles;
CREATE TRIGGER prevent_role_change_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_change();

-- Jenis Iuran table
CREATE TABLE IF NOT EXISTS public.jenis_iuran (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nama TEXT NOT NULL,
  deskripsi TEXT,
  nominal DECIMAL(12,2) NOT NULL DEFAULT 0,
  jenis TEXT DEFAULT 'wajib' CHECK (jenis IN ('wajib', 'opsional')),
  aktif BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rekening table
CREATE TABLE IF NOT EXISTS public.rekening (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nama_bank TEXT NOT NULL,
  nomor_rekening TEXT NOT NULL,
  atas_nama TEXT NOT NULL,
  aktif BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Keringanan IPL table (relief/discount per blok per year)
CREATE TABLE IF NOT EXISTS public.keringanan_ipl (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  blok_rumah TEXT NOT NULL,
  tahun TEXT NOT NULL, -- Year like '2024'
  nilai_keringanan DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (blok_rumah, tahun)
);

-- Pembayaran table
CREATE TABLE IF NOT EXISTS public.pembayaran (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  jenis_iuran_id UUID REFERENCES public.jenis_iuran(id) NOT NULL,
  rekening_id UUID REFERENCES public.rekening(id),
  tanggal_bayar DATE NOT NULL DEFAULT CURRENT_DATE,
  bulan_bayar TEXT[] NOT NULL, -- Array of months like ['2024-01', '2024-02']
  nominal DECIMAL(12,2) NOT NULL,
  bukti_transfer_url TEXT,
  status TEXT DEFAULT 'verified' CHECK (status IN ('pending', 'verified', 'rejected')),
  verified_by UUID REFERENCES public.profiles(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  catatan TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pengeluaran table
CREATE TABLE IF NOT EXISTS public.pengeluaran (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  kategori TEXT NOT NULL,
  nominal DECIMAL(12,2) NOT NULL,
  keterangan TEXT,
  bukti_url TEXT,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.jenis_iuran ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rekening ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pembayaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengeluaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keringanan_ipl ENABLE ROW LEVEL SECURITY;

-- Policies for jenis_iuran
CREATE POLICY "Jenis iuran are viewable by everyone" ON public.jenis_iuran
  FOR SELECT USING (true);
CREATE POLICY "Only admin can manage jenis iuran" ON public.jenis_iuran
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Policies for rekening
CREATE POLICY "Rekening are viewable by everyone" ON public.rekening
  FOR SELECT USING (true);
CREATE POLICY "Only admin can manage rekening" ON public.rekening
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Policies for keringanan_ipl
CREATE POLICY "Keringanan IPL are viewable by authenticated" ON public.keringanan_ipl
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Only admin can manage keringanan IPL" ON public.keringanan_ipl
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Policies for pembayaran
DROP POLICY IF EXISTS "Users can view their own pembayaran" ON public.pembayaran;
CREATE POLICY "Authenticated users can view all pembayaran" ON public.pembayaran
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert pembayaran" ON public.pembayaran
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin can update pembayaran" ON public.pembayaran
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Policies for pengeluaran
CREATE POLICY "Pengeluaran are viewable by admin" ON public.pengeluaran
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admin can manage pengeluaran" ON public.pengeluaran
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'warga')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage bucket for bukti transfer
INSERT INTO storage.buckets (id, name, public) VALUES ('bukti-transfer', 'bukti-transfer', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can upload bukti transfer" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'bukti-transfer');

CREATE POLICY "Anyone can view bukti transfer" ON storage.objects
  FOR SELECT USING (bucket_id = 'bukti-transfer');

CREATE POLICY "Anyone can update bukti transfer" ON storage.objects
  FOR UPDATE USING (bucket_id = 'bukti-transfer');

-- View for dashboard statistics
CREATE OR REPLACE VIEW public.dashboard_stats AS
SELECT 
  (SELECT COALESCE(SUM(nominal), 0) FROM public.pembayaran WHERE status = 'verified') as total_pemasukan,
  (SELECT COALESCE(SUM(nominal), 0) FROM public.pengeluaran) as total_pengeluaran,
  (SELECT COUNT(*) FROM public.pembayaran WHERE status = 'pending') as pending_verification;

-- View for monthly report
CREATE OR REPLACE VIEW public.monthly_report AS
SELECT 
  TO_CHAR(tanggal_bayar, 'YYYY-MM') as bulan,
  SUM(nominal) as total_pemasukan
FROM public.pembayaran 
WHERE status = 'verified'
GROUP BY TO_CHAR(tanggal_bayar, 'YYYY-MM')
ORDER BY bulan DESC;

-- Migration: Add blok_rumah column to existing pembayaran table (run on existing database)
-- ALTER TABLE public.pembayaran ADD COLUMN IF NOT EXISTS blok_rumah TEXT;

-- Insert default jenis iuran
INSERT INTO public.jenis_iuran (nama, deskripsi, nominal, jenis) VALUES
('IPL Bulanan', 'Iuran Pemeliharaan Lingkungan bulanan', 50000, 'wajib'),
('Iuran Keamanan', 'Iuran untuk petugas keamanan', 30000, 'wajib'),
('Iuran Sampah', 'Iuran pengangkutan sampah', 20000, 'wajib');

-- Insert default rekening
INSERT INTO public.rekening (nama_bank, nomor_rekening, atas_nama) VALUES
('BCA', '1234567890', 'Bendahara RT'),
('Mandiri', '0987654321', 'Bendahara RT');