import Link from "next/link";
import { revalidatePath } from "next/cache";
import axios from "axios";
import { getServerApiUrl } from "@/lib/env";

type Kontak = {
  id: number;
  nama: string;
  umur: number;
};


export default async function HomePage() {
  const API_URL = getServerApiUrl();
  let kontak: Kontak[] = [];
  let errorMessage: string | null = null;

  // ================= FETCH DATA (SAFE) =================
  try {
    const res = await axios.get(API_URL);
    kontak = res.data.data ?? [];
  } catch (error) {
    errorMessage =
      "Gagal memuat data kontak. Coba lagi nanti atau backend tidak dapat dihubungi.";
  }

  // ================= CREATE (SERVER ACTION) =================
  async function createKontakAction(formData: FormData) {
    "use server";

    const apiUrl = getServerApiUrl();
    const nama = formData.get("nama");
    const umur = Number(formData.get("umur"));

    if (!nama || !umur) {
      return;
    }

    try {
      await axios.post(apiUrl, { nama, umur });
      revalidatePath("/");
    } catch {
      return;
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center font-poppins">
      <div className="bg-[#111] w-[400px] rounded-2xl p-8 text-white shadow-[0_0_30px_rgba(255,255,255,0.05)]">
        <h1 className="text-lg font-semibold mb-4 tracking-wide text-center">
          📇 Manajemen Kontak
        </h1>

        {/* ================= ERROR INFO (HALUS) ================= */}
        {errorMessage && (
          <div className="mb-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 px-4 py-3 text-sm text-yellow-400">
            ⚠ {errorMessage}
          </div>
        )}

        {/* ================= FORM CREATE ================= */}
        <form action={createKontakAction} className="flex flex-col gap-3 mb-6">
          <input
            name="nama"
            placeholder="Nama"
            disabled={!!errorMessage}
            className="w-full px-4 py-3 rounded-xl bg-[#1a1a1a] border border-[#222] text-white text-sm placeholder:text-gray-500 disabled:opacity-40"
          />

          <input
            name="umur"
            type="number"
            min={0}
            placeholder="Umur"
            disabled={!!errorMessage}
            className="w-full px-4 py-3 rounded-xl bg-[#1a1a1a] border border-[#222] text-white text-sm placeholder:text-gray-500 disabled:opacity-40"
          />

          <button
            type="submit"
            disabled={!!errorMessage}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#333] to-[#222] text-gray-300 text-sm font-medium disabled:opacity-40"
          >
            ➕ Tambah Kontak
          </button>
        </form>

        {/* ================= LIST KONTAK ================= */}
        <ul className="flex flex-col gap-3 max-h-[260px] overflow-y-auto pr-1">
          {kontak.length === 0 ? (
            <p className="text-center text-gray-500 text-sm">
              {errorMessage ? "Data tidak tersedia" : "Belum ada kontak"}
            </p>
          ) : (
            kontak.map((k) => (
              <li
                key={k.id}
                className="bg-[#1a1a1a] border border-[#222] rounded-xl px-4 py-3 flex justify-between items-center"
              >
                <div>
                  <p className="text-sm font-medium text-white">{k.nama}</p>
                  <p className="text-xs text-gray-400">Umur: {k.umur}</p>
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

        <div className="mt-8 text-center text-gray-500 text-sm">
          © 2026 Manajemen Kontak - by adam wahyu kurniawan
        </div>
      </div>
    </div>
  );
}
