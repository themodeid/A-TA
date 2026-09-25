"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getSlipById, getRekapByPeriode } from "@/features/rekap/api/rekap.api";
import { SlipGaji, RekapGaji } from "@/types";
import { SlipGajiView } from "@/features/rekap/components/SlipGajiView";
import { Button } from "@/components/ui/Button";

export default function SlipPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [slip, setSlip] = useState<SlipGaji | null>(null);
  const [allRekap, setAllRekap] = useState<RekapGaji[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || isNaN(id)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getSlipById(id)
      .then((data) => {
        setSlip(data);
        if (data?.id_periode) {
          getRekapByPeriode(data.id_periode)
            .then(setAllRekap)
            .catch(() => setAllRekap([]));
        }
      })
      .catch(() => setSlip(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePrint = () => window.print();

  // Cari index pegawai saat ini dan navigasi previous/next
  const currentIndex = allRekap.findIndex((r) => r.id_rekap === id);
  const prevRekap = currentIndex > 0 ? allRekap[currentIndex - 1] : null;
  const nextRekap =
    currentIndex >= 0 && currentIndex < allRekap.length - 1
      ? allRekap[currentIndex + 1]
      : null;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
          <p className="text-xs text-zinc-400">Memuat slip gaji...</p>
        </div>
      </div>
    );
  }

  if (!slip) {
    return (
      <div className="min-h-screen bg-zinc-950 p-8 flex flex-col items-center justify-center text-center">
        <span className="text-4xl mb-3">📄</span>
        <h2 className="text-lg font-bold text-zinc-200">
          Slip Gaji Tidak Ditemukan
        </h2>
        <p className="text-xs text-zinc-400 mt-1 mb-6">
          Data slip gaji dengan ID #{id} tidak tersedia atau telah diperbarui.
        </p>
        <Link href="/rekap-gaji">
          <Button variant="primary">
            ← Kembali ke Rekap Gaji
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-4 sm:p-6 print:bg-white print:p-0">
      {/* HEADER NAVIGASI & KONTROL (Disembunyikan saat print) */}
      <div className="mx-auto max-w-4xl mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        {/* Tombol Kembali & Breadcrumb */}
        <div className="flex items-center gap-3">
          <Link href="/rekap-gaji">
            <Button
              variant="secondary"
              size="sm"
              className="text-xs flex items-center gap-1.5"
            >
              <span>←</span>
              <span>Kembali ke Daftar Rekap Gaji</span>
            </Button>
          </Link>
        </div>

        {/* Tombol Aksi: Navigasi Pegawai Lain & Cetak */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Pegawai Sebelumnya */}
          {prevRekap && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push(`/rekap-gaji/slip/${prevRekap.id_rekap}`)}
              className="text-xs"
              title={`Lihat slip ${prevRekap.nama_dan_tanggal_lahir}`}
            >
              ◀ Sebelumnya
            </Button>
          )}

          {/* Pegawai Berikutnya */}
          {nextRekap && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push(`/rekap-gaji/slip/${nextRekap.id_rekap}`)}
              className="text-xs"
              title={`Lihat slip ${nextRekap.nama_dan_tanggal_lahir}`}
            >
              Berikutnya ▶
            </Button>
          )}

          {/* Tombol Print / Cetak PDF */}
          <Button
            onClick={handlePrint}
            variant="primary"
            size="sm"
            className="text-xs flex items-center gap-1.5"
          >
            <span>🖨️</span>
            <span>Cetak / Simpan PDF</span>
          </Button>
        </div>
      </div>

      {/* KERTAS SLIP GAJI */}
      <SlipGajiView slip={slip} />

      {/* FOOTER NAVIGASI BAWAH (Disembunyikan saat print) */}
      <div className="mx-auto max-w-4xl mt-6 flex justify-center print:hidden">
        <Link href="/rekap-gaji">
          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-400 hover:text-zinc-200 text-xs"
          >
            ← Selesai & Kembali ke Tabel Rekap Gaji
          </Button>
        </Link>
      </div>
    </div>
  );
}
