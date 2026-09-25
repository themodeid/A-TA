import { PeriodeStatus } from "@/types";

const STEPS: { key: string; label: string; description: string }[] = [
  {
    key: "PERIODE",
    label: "1. Periode & Inisialisasi",
    description: "Buka periode (16 s/d 15)",
  },
  {
    key: "TRANSAKSI",
    label: "2. Input Data Transaksi",
    description: "Absensi, Lembur & Potongan",
  },
  {
    key: "APPROVAL",
    label: "3. Verifikasi & Approval",
    description: "Pemeriksaan oleh Kepsek",
  },
  {
    key: "REKAP",
    label: "4. Rekapitulasi Gaji",
    description: "Hitung final & pembukuan",
  },
  {
    key: "SELESAI",
    label: "5. Slip Gaji & Selesai",
    description: "Cetak & distribusi slip",
  },
];

function getStepIndex(status?: PeriodeStatus): number {
  if (!status) return 0;
  switch (status) {
    case "Pengisian Absensi":
    case "Ditolak":
      return 1;
    case "Menunggu Approval":
      return 2;
    case "Disetujui":
    case "Diproses Gaji":
      return 3;
    case "Selesai":
      return 4;
    default:
      return 0;
  }
}

interface WorkflowStepperProps {
  currentStatus?: PeriodeStatus;
}

export function WorkflowStepper({ currentStatus }: WorkflowStepperProps) {
  const currentIndex = getStepIndex(currentStatus);

  return (
    <div className="py-2">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {STEPS.map((step, idx) => {
          const isComplete = idx < currentIndex;
          const isActive = idx === currentIndex;
          const isPending = idx > currentIndex;

          return (
            <div
              key={step.key}
              className={`relative flex flex-col p-3 rounded-xl border transition-colors ${
                isActive
                  ? "bg-zinc-850/80 border-zinc-600 shadow-none"
                  : isComplete
                    ? "bg-zinc-900/50 border-zinc-800"
                    : "bg-zinc-950/40 border-zinc-800/50 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-md text-[11px] font-semibold ${
                    isComplete
                      ? "bg-zinc-800 text-emerald-400 border border-zinc-700"
                      : isActive
                        ? "bg-zinc-100 text-zinc-950 font-bold"
                        : "bg-zinc-900 text-zinc-500 border border-zinc-800"
                  }`}
                >
                  {isComplete ? "✓" : idx + 1}
                </span>

                <span className="text-[10px] font-medium tracking-tight">
                  {isComplete && (
                    <span className="text-emerald-400 font-medium">Selesai</span>
                  )}
                  {isActive && (
                    <span className="text-zinc-200 font-semibold">
                      Sedang Aktif
                    </span>
                  )}
                  {isPending && <span className="text-zinc-500">Antrian</span>}
                </span>
              </div>

              <h4
                className={`text-xs font-semibold ${
                  isActive
                    ? "text-zinc-100"
                    : isComplete
                      ? "text-zinc-200"
                      : "text-zinc-400"
                }`}
              >
                {step.label}
              </h4>
              <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                {step.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
