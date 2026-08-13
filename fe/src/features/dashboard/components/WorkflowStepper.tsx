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
      return 2;
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
    <div className="flex items-center justify-between">
      {STEPS.map((step, idx) => {
        const isComplete = idx < currentIndex;
        const isActive =
          idx === currentIndex || (currentIndex === 4 && idx === 3);
        const isLocked = idx > currentIndex && currentIndex < 4;

        return (
          <div key={step.key} className="flex flex-1 items-center">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold ${
                  isComplete
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : isActive
                      ? "border-indigo-500 bg-indigo-500 text-white"
                      : isLocked
                        ? "border-slate-700 bg-slate-800 text-slate-500"
                        : "border-slate-700 bg-slate-900 text-slate-300"
                }`}
              >
                {isComplete ? "✓" : idx + 1}
              </div>
              <p
                className={`mt-2 text-center text-xs font-medium ${
                  isActive ? "text-indigo-400" : "text-slate-400"
                }`}
              >
                {step.label}
              </p>
              {isActive && currentStatus && (
                <span className="mt-1 text-[10px] text-indigo-400">
                  (Sedang Aktif)
                </span>
              )}
              {isComplete && (
                <span className="mt-1 text-[10px] text-emerald-400">
                  (Selesai)
                </span>
              )}
              {isLocked && (
                <span className="mt-1 text-[10px] text-slate-500">
                  (Locked)
                </span>
              )}
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`mx-2 h-0.5 flex-1 ${
                  idx < currentIndex ? "bg-emerald-500" : "bg-slate-700"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
