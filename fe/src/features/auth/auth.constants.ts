import { User, UserRole } from "@/types";

/** Demo users — ganti dengan API login JWT saat backend auth siap */
export const DEMO_USERS: Array<User & { password: string }> = [
  {
    id: 1,
    username: "admin",
    password: "admin123",
    nama: "Administrator",
    role: "Admin",
  },
  {
    id: 2,
    username: "absensi",
    password: "absensi123",
    nama: "Petugas Absensi",
    role: "Petugas Absensi",
  },
  {
    id: 3,
    username: "approver",
    password: "approver123",
    nama: "Approver",
    role: "Approver",
  },
  {
    id: 4,
    username: "gaji",
    password: "gaji123",
    nama: "Staf Gaji",
    role: "Staf Gaji",
  },
];

export const ROLE_LABELS: Record<UserRole, string> = {
  Admin: "Administrator",
  "Petugas Absensi": "Petugas Absensi",
  Approver: "Approver",
  "Staf Gaji": "Staf Gaji",
};
