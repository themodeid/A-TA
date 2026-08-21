export * from "@/features/auth/types";
export * from "@/features/periode/types";
export * from "@/features/master/types";
export * from "@/features/absensi/types";
export * from "@/features/tunjangan/types";
export * from "@/features/potongan/types";
export * from "@/features/rekap/types";
export * from "@/features/dashboard/types";

export interface ApiResponse<T> {
  status: string;
  message?: string;
  data: T;
  count?: number;
}
