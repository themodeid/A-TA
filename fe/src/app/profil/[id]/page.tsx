"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { getPublicApiUrl } from "@/lib/env";

const API_URL = getPublicApiUrl();

type Kontak = {
  id: number;
  nama: string;
  umur: number;
  hobi: string;
};

export default function ProfilPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [kontak, setKontak] = useState<Kontak | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ================= FETCH =================
  useEffect(() => {
    let ignore = false;

    async function fetchKontak() {
      if (!id) return;
      try {
        const res = await axios.get(`${API_URL}/${id}`);
        if (!ignore) setKontak(res.data.data);
      } catch (error) {
        setErrorMessage("Backend tidak dapat dihubungi atau data tidak ditemukan");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    fetchKontak();
    return () => {
      ignore = true;
    };
  }, [id]);

  // ================= UPDATE =================
  async function updateKontak(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!kontak || !id) return;

    setSaving(true);
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);

    try {
      await axios.put(`${API_URL}/${id}`, {
        nama: formData.get("nama"),
        umur: Number(formData.get("umur")),
      });

      router.push("/");
    } catch (error) {
      setErrorMessage("Gagal menyimpan perubahan");
    } finally {
      setSaving(false);
    }
  }

  // ================= DELETE =================
  async function deleteKontak() {
    if (!confirm("Yakin ingin menghapus kontak ini?")) return;
    if (!id) return;

    setSaving(true);
    setErrorMessage(null);

    try {
      await axios.delete(`${API_URL}/${id}`);
      router.push("/");
    } catch (error) {
      setErrorMessage("Gagal menghapus kontak");
    } finally {
      setSaving(false);
    }
  }

  // ================= LOADING =================
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-gray-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center font-poppins">
      <div className="bg-[#111] w-[400px] rounded-2xl p-8 text-white shadow-[0_0_30px_rgba(255,255,255,0.05)]">
        <h1 className="text-lg font-semibold mb-4 tracking-wide text-center">
          👤 Profil Kontak
        </h1>

        {/* ================= ERROR INFO ================= */}
        {errorMessage && (
          <div className="mb-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 px-4 py-3 text-sm text-yellow-400">
            ⚠ {errorMessage}
          </div>
        )}

        {/* ================= FORM ================= */}
        <form onSubmit={updateKontak} className="flex flex-col gap-3 mb-6">
          <input
            name="nama"
            defaultValue={kontak?.nama ?? ""}
            disabled={!kontak || saving}
            className="w-full px-4 py-3 rounded-xl bg-[#1a1a1a] border border-[#222] text-white text-sm disabled:opacity-40"
            required
          />

          <input
            type="number"
            name="umur"
            defaultValue={kontak?.umur ?? 0}
            disabled={!kontak || saving}
            className="w-full px-4 py-3 rounded-xl bg-[#1a1a1a] border border-[#222] text-white text-sm disabled:opacity-40"
            required
          />

          <button
            type="submit"
            disabled={!kontak || saving}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#333] to-[#222] text-gray-300 text-sm font-medium disabled:opacity-40"
          >
            💾 {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </form>

        {/* ================= DELETE ================= */}
        <button
          onClick={deleteKontak}
          disabled={!kontak || saving}
          className="w-full py-3 rounded-xl mb-4 bg-gradient-to-r from-red-700 to-red-900 text-red-100 text-sm font-medium disabled:opacity-40"
        >
          🗑 {saving ? "Memproses..." : "Hapus Kontak"}
        </button>

        {/* ================= FOOTER ================= */}
        <div className="text-center text-sm text-gray-400">
          <Link href="/" className="text-blue-400 hover:underline">
            ← Kembali ke Home
          </Link>
        </div>
      </div>
    </div>
  );
}
