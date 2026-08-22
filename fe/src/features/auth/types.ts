export type UserRole = "Admin" | "Petugas Absensi" | "Approver" | "Staf Gaji";

export interface User {
  id: number;
  username: string;
  nama: string;
  role: UserRole;
}
