import { PeriodeStatus } from "@/types";

const STEPS: { key: PeriodeStatus | string; label: string }[] = [
  { key: "Pengisian Absensi", label: "Absensi & Lembur" },
  { key: "Input Potongan", label: "Input Potongan" },
  { key: "Menunggu Approval", label: "Ajukan Approval" },
  { key: "Diproses Gaji", label: "Hitung & Selesai" },
];

function getStepIndex(status: PeriodeStatus): number {
  switch (status) {
    case "Pengisian Absensi":
    case "Ditolak":
      return 0;
    case "Menunggu Approval":
    case "Disetujui":
      return 2;
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
  const currentIndex = currentStatus ? getStepIndex(currentStatus) : 0;

  return (
    <div className="flex items-center justify-between py-2">
      {STEPS.map((step, idx) => {
        const isComplete = idx < currentIndex;
        const isActive =
          idx === currentIndex || (currentIndex === 4 && idx === 3);
        const isLocked = idx > currentIndex && currentIndex < 4;

        return (
          <div key={step.key} className="flex flex-1 items-center">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all ${
                  isComplete
                    ? "border-emerald-500 bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                    : isActive
                      ? "border-indigo-500 bg-indigo-600 text-white ring-4 ring-indigo-500/20 shadow-md shadow-indigo-500/30"
                      : isLocked
                        ? "border-slate-800 bg-slate-900/80 text-slate-600"
                        : "border-slate-700 bg-slate-900 text-slate-400"
                }`}
              >
                {isComplete ? "✓" : idx + 1}
              </div>

              <p
                className={`mt-2.5 text-center text-xs font-medium ${
                  isActive
                    ? "text-indigo-400 font-semibold"
                    : isComplete
                      ? "text-slate-300"
                      : "text-slate-500"
                }`}
              >
                {step.label}
              </p>

              <span className="mt-0.5 text-[10px]">
                {isActive && currentStatus && (
                  <span className="text-indigo-400/90 font-medium">
                    (Sedang Aktif)
                  </span>
                )}
                {isComplete && (
                  <span className="text-emerald-400/90">(Selesai)</span>
                )}
                {isLocked && <span className="text-slate-600">(Locked)</span>}
              </span>
            </div>

            {idx < STEPS.length - 1 && (
              <div
                className={`mx-3 h-[2px] flex-1 rounded-full transition-colors ${
                  idx < currentIndex ? "bg-emerald-500" : "bg-slate-800"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
