import Link from "next/link";
import { revalidatePath } from "next/cache";
import axios from "axios";
import { getServerApiUrl } from "@/lib/env";

type Kontak = {
  id: number;
  nama: string;
  umur: number;
  hobi: string;
};

// Next.js secara otomatis menyediakan searchParams di root props Page
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const resolvedParams = await searchParams;
  // Pastikan page minimal bernilai 1
  const currentPage = Math.max(1, Number(resolvedParams.page) || 1);

  const API_URL = getServerApiUrl();
  let kontak: Kontak[] = [];
  let errorMessage: string | null = null;

  // ================= FETCH DATA BERDASARKAN PAGE =================
  try {
    const res = await axios.get(`${API_URL}?page=${currentPage}`);
    kontak = res.data.data ?? [];
  } catch (error) {
    errorMessage = "Gagal memuat data kontak.";
  }

  // ================= CREATE (SERVER ACTION) =================
  async function createKontakAction(formData: FormData) {
    "use server";
    const apiUrl = getServerApiUrl();
    const nama = formData.get("nama");
    const umur = Number(formData.get("umur"));
    const hobi = formData.get("hobi");

    if (!nama || !umur) return;

    try {
      await axios.post(apiUrl, { nama, umur, hobi });
      revalidatePath("/");
    } catch {
      return;
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center font-poppins">
      <div className="bg-[#111] w-[400px] rounded-2xl p-8 text-white shadow-[0_0_30px_rgba(255,255,255,0.05)]">
        <h1 className="text-lg font-semibold mb-4 tracking-wide text-center">
          📇 Manajemen Kontak (Hal {currentPage})
        </h1>

        {errorMessage && (
          <div className="mb-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 px-4 py-3 text-sm text-yellow-400">
            ⚠ {errorMessage}
          </div>
        )}

        {/* Form tetap sama */}
        <form action={createKontakAction} className="flex flex-col gap-3 mb-6">
          <input
            name="nama"
            placeholder="Nama"
            disabled={!!errorMessage}
            className="w-full px-4 py-3 rounded-xl bg-[#1a1a1a] border border-[#222] text-white text-sm"
          />
          <input
            name="umur"
            type="number"
            placeholder="Umur"
            disabled={!!errorMessage}
            className="w-full px-4 py-3 rounded-xl bg-[#1a1a1a] border border-[#222] text-white text-sm"
          />
          <input
            name="hobi"
            placeholder="Hobi"
            disabled={!!errorMessage}
            className="w-full px-4 py-3 rounded-xl bg-[#1a1a1a] border border-[#222] text-white text-sm"
          />
          <button
            type="submit"
            disabled={!!errorMessage}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#333] to-[#222] text-gray-300 text-sm font-medium"
          >
            ➕ Tambah Kontak
          </button>
        </form>

        {/* List Kontak */}
        <ul className="flex flex-col gap-3 max-h-[260px] overflow-y-auto pr-1">
          {kontak.length === 0 ? (
            <p className="text-center text-gray-500 text-sm">
              Belum ada data di halaman ini.
            </p>
          ) : (
            kontak.map((k) => (
              <li
                key={k.id}
                className="bg-[#1a1a1a] border border-[#222] rounded-xl px-4 py-3 flex justify-between items-center"
              >
                <div>
                  <p className="text-sm font-medium text-white">{k.nama}</p>
                  <p className="text-xs text-gray-400">
                    Umur: {k.umur} | Hobi: {k.hobi}
                  </p>
                </div>
                <Link
                  href={`/profil/${k.id}`}
                  className="text-xs px-3 py-1.5 rounded-lg bg-[#222] text-gray-300 hover:text-white"
                >
                  Profil
                </Link>
              </li>
            ))
          )}
        </ul>

        {/* ================= TOMBOL NAVIGASI PAGINATION ================= */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-[#222]">
          <Link
            href={`/?page=${currentPage - 1}`}
            className={`text-xs px-4 py-2 rounded-xl bg-[#1a1a1a] border border-[#222] ${currentPage <= 1 ? "opacity-30 pointer-events-none" : "hover:bg-[#222]"}`}
          >
            ◀ Prev
          </Link>
          <span className="text-xs text-gray-400">Halaman {currentPage}</span>
          <Link
            href={`/?page=${currentPage + 1}`}
            // Tombol next akan mati jika data di halaman ini kurang dari 10 (artinya sudah habis)
            className={`text-xs px-4 py-2 rounded-xl bg-[#1a1a1a] border border-[#222] ${kontak.length < 10 ? "opacity-30 pointer-events-none" : "hover:bg-[#222]"}`}
          >
            Next ▶
          </Link>
        </div>

        <div className="mt-6 text-center text-gray-500 text-sm">
          © 2026 Manajemen Kontak
        </div>
      </div>
    </div>
  );
}
