"use client";

interface UploadSuccessToastProps {
  show: boolean;
  message: string;
  onDismiss?: () => void;
}

export function UploadSuccessToast({
  show,
  message,
  onDismiss,
}: UploadSuccessToastProps) {
  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 top-4 z-50 upload-success-enter"
    >
      <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-white px-4 py-3 shadow-lg shadow-green-100/80">
        <div className="upload-success-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500">
          <svg
            className="h-5 w-5 text-white upload-success-check"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <div className="min-w-[200px]">
          <p className="text-sm font-semibold text-green-800">Berhasil!</p>
          <p className="text-sm text-green-700">{message}</p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="ml-2 rounded p-1 text-green-600 hover:bg-green-50"
            aria-label="Tutup notifikasi"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
