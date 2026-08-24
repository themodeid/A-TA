import { z } from "zod";

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Username minimal 3 karakter")
    .max(50, "Username maksimal 50 karakter")
    .regex(
      /^[a-zA-Z0-9_.]+$/,
      "Username hanya boleh mengandung huruf, angka, garis bawah (_), atau titik (.)",
    ),
  password: z
    .string()
    .min(6, "Password minimal 6 karakter")
    .max(100, "Password maksimal 100 karakter"),
  role: z
    .enum(["Admin", "Petugas Absensi", "Approver", "Staf Gaji"] as const)
    .default("Staf Gaji"),
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username tidak boleh kosong"),
  password: z.string().min(1, "Password tidak boleh kosong"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
