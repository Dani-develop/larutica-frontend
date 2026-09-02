import type { SystemUser } from "@/modules/crm/users/models/User";

export type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  role: SystemUser["role"];
  phone: string | null;
  business_name: string | null;
  status: SystemUser["status"];
  created_at: string;
  updated_at: string;
};

export function profileRowToSystemUser(row: ProfileRow): SystemUser {
  return {
    id: row.id,
    name: row.full_name,
    email: row.email,
    role: row.role,
    phone: row.phone ?? "",
    businessName: row.business_name ?? "",
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
