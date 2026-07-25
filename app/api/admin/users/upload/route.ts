import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import * as ExcelJS from "exceljs";

interface WargaRow {
  email: string;
  full_name?: string;
  nama?: string;
  phone?: string;
  telepon?: string;
  blok_rumah?: string;
  blok?: string;
  role?: string;
}

// POST - Bulk upload users from Excel
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Verify the requester is an admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    // Get the form data
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    // Check file extension
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
      return NextResponse.json({ error: "File harus berformat Excel (.xlsx atau .xls)" }, { status: 400 });
    }

    // Read the file
    const arrayBuffer = await file.arrayBuffer();

    // Parse Excel file using ExcelJS
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return NextResponse.json({ error: "File Excel kosong atau tidak ada sheet" }, { status: 400 });
    }

    // Get headers from first row
    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber - 1] = cell.value?.toString().trim().toLowerCase() || "";
    });

    // Parse data rows
    const jsonData: WargaRow[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row
      
      const rowData: Record<string, string> = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (header) {
          rowData[header] = cell.value?.toString().trim() || "";
        }
      });
      
      if (rowData.email) {
        jsonData.push(rowData as unknown as WargaRow);
      }
    });

    if (jsonData.length === 0) {
      return NextResponse.json({ error: "File Excel kosong atau tidak ada data" }, { status: 400 });
    }

    // Validate and process each row
    const results = {
      success: [] as { email: string; full_name: string }[],
      failed: [] as { email: string; reason: string }[],
      skipped: [] as { email: string; reason: string }[],
    };

    // Get existing emails to check for duplicates
    const { data: existingUsers } = await adminClient
      .from("profiles")
      .select("email");
    const existingEmails = new Set(existingUsers?.map((u) => u.email.toLowerCase()) || []);

    for (const row of jsonData) {
      const email = row.email?.toString().trim().toLowerCase();
      const fullName = row.full_name?.toString().trim() || row.nama?.toString().trim() || "";
      const phone = row.phone?.toString().trim() || row.telepon?.toString().trim() || "";
      const blokRumah = row.blok_rumah?.toString().trim() || row.blok?.toString().trim() || "";
      const role = row.role?.toString().trim().toLowerCase() || "warga";

      // Validate email
      if (!email) {
        results.failed.push({
          email: row.email || "N/A",
          reason: "Email tidak valid atau kosong",
        });
        continue;
      }

      // Check if email already exists
      if (existingEmails.has(email)) {
        results.skipped.push({
          email,
          reason: "Email sudah terdaftar",
        });
        continue;
      }

      // Validate role
      if (role !== "warga" && role !== "admin") {
        results.failed.push({
          email,
          reason: "Role harus 'warga' atau 'admin'",
        });
        continue;
      }

      // Generate a random password (user can change later)
      const randomPassword = Math.random().toString(36).slice(-8) + "A1!";

      try {
        // Create user with admin API
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
          email,
          password: randomPassword,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            full_name: fullName || email,
            role: role,
          },
        });

        if (createError) {
          results.failed.push({
            email,
            reason: createError.message,
          });
          continue;
        }

        // Update the profile with additional data
        if (newUser.user) {
          await adminClient
            .from("profiles")
            .update({
              full_name: fullName || email,
              phone: phone || null,
              blok_rumah: blokRumah || null,
              role: role,
            })
            .eq("id", newUser.user.id);

          // Add to existing emails to prevent duplicates within the same upload
          existingEmails.add(email);

          results.success.push({
            email,
            full_name: fullName || email,
          });
        }
      } catch (error) {
        results.failed.push({
          email,
          reason: "Terjadi kesalahan saat membuat akun",
        });
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: jsonData.length,
        created: results.success.length,
        failed: results.failed.length,
        skipped: results.skipped.length,
      },
      details: results,
    });
  } catch (error) {
    console.error("Error uploading users:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}