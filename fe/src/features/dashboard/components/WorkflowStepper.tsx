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
              className={`relative flex flex-col p-3 rounded-xl border transition-all ${
                isActive
                  ? "bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-950/50"
                  : isComplete
                    ? "bg-slate-900/40 border-emerald-800/60"
                    : "bg-slate-950/40 border-slate-800/80 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    isComplete
                      ? "bg-emerald-500 text-slate-950"
                      : isActive
                        ? "bg-indigo-600 text-white ring-2 ring-indigo-400"
                        : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {isComplete ? "✓" : idx + 1}
                </span>

                <span className="text-[10px] font-medium">
                  {isComplete && (
                    <span className="text-emerald-400 font-semibold">Selesai</span>
                  )}
                  {isActive && (
                    <span className="text-indigo-400 font-semibold animate-pulse">
                      ● Aktif
                    </span>
                  )}
                  {isPending && <span className="text-slate-500">Menunggu</span>}
                </span>
              </div>

              <h4
                className={`text-xs font-bold ${
                  isActive
                    ? "text-indigo-200"
                    : isComplete
                      ? "text-slate-200"
                      : "text-slate-400"
                }`}
              >
                {step.label}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                {step.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
