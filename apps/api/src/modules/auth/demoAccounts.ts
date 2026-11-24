import { DEMO_ADMIN_USER_ID, DEMO_HOST_USER_ID } from "@luxestay/domain";
import { hashPassword } from "./crypto.js";
import type { StoredAuthUser } from "./repository.js";

export function buildDemoStaffUsers(): StoredAuthUser[] {
  const createdAt = "2026-01-01T00:00:00.000Z";
  return [
    {
      id: DEMO_HOST_USER_ID,
      email: "host@luxestay.vn",
      phone: "0909888777",
      fullName: "Minh Quân Host",
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80",
      provider: "password",
      role: "host",
      passwordHash: hashPassword("host1234"),
      createdAt,
    },
    {
      id: DEMO_ADMIN_USER_ID,
      email: "admin@luxestay.vn",
      phone: "0909999888",
      fullName: "Quản trị viên LuxeStay",
      avatar:
        "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=160&q=80",
      provider: "password",
      role: "admin",
      passwordHash: hashPassword("admin1234"),
      createdAt,
    },
  ];
}
