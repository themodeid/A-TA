import { Periode } from "../periode/types";
import { KoreksiJam } from "../koreksi-jam/types";

export interface DashboardAlert {
  type: "warning" | "info" | "error";
  message: string;
}

export interface DashboardSummary {
  periode: Periode;
  metrics: {
    total_pegawai: number;
    persentase_kehadiran: number;
    estimasi_pengeluaran_gaji: number;
    total_potongan_terkumpul: number;
  };
  alerts: DashboardAlert[];
  recent_koreksi_jam: KoreksiJam[];
}
