import type { User } from "@/types";

export const users: User[] = [
  { id: "u1", name: "Aïssatou Diop", email: "a.diop@cmr.tv", role: "journalist", team: "Politique", active: true, lastActive: "2026-05-26T10:42:00", initials: "AD", color: "#22d3ee" },
  { id: "u2", name: "Mathieu Lefèvre", email: "m.lefevre@cmr.tv", role: "editor", team: "International", active: true, lastActive: "2026-05-26T10:55:00", initials: "ML", color: "#60a5fa" },
  { id: "u3", name: "Fatou Ndiaye", email: "f.ndiaye@cmr.tv", role: "chief", team: "Société", active: true, lastActive: "2026-05-26T11:01:00", initials: "FN", color: "#a78bfa" },
  { id: "u4", name: "Vincent Moreau", email: "v.moreau@cmr.tv", role: "direction", team: "Direction", active: true, lastActive: "2026-05-26T09:20:00", initials: "VM", color: "#f472b6" },
  { id: "u5", name: "Ndèye Faye", email: "n.faye@cmr.tv", role: "community_manager", team: "Réseaux", active: true, lastActive: "2026-05-26T10:30:00", initials: "NF", color: "#f59e0b" },
  { id: "u6", name: "Karim Benali", email: "k.benali@cmr.tv", role: "journalist", team: "Sport", active: true, lastActive: "2026-05-26T10:12:00", initials: "KB", color: "#10b981" },
  { id: "u7", name: "Claire Dubois", email: "c.dubois@cmr.tv", role: "editor", team: "Économie", active: true, lastActive: "2026-05-26T10:48:00", initials: "CD", color: "#38bdf8" },
  { id: "u8", name: "Omar Touré", email: "o.toure@cmr.tv", role: "journalist", team: "Culture", active: true, lastActive: "2026-05-26T09:58:00", initials: "OT", color: "#ec4899" },
  { id: "u9", name: "Sophie Martin", email: "s.martin@cmr.tv", role: "chief", team: "Politique", active: true, lastActive: "2026-05-26T10:35:00", initials: "SM", color: "#c084fc" },
  { id: "u10", name: "Ibrahim Sow", email: "i.sow@cmr.tv", role: "journalist", team: "Sport", active: false, lastActive: "2026-05-25T18:00:00", initials: "IS", color: "#22d3ee" },
  { id: "u11", name: "Élise Rousseau", email: "e.rousseau@cmr.tv", role: "admin", team: "Direction", active: true, lastActive: "2026-05-26T11:00:00", initials: "ER", color: "#10b981" },
  { id: "u12", name: "Tidiane Ba", email: "t.ba@cmr.tv", role: "community_manager", team: "Réseaux", active: true, lastActive: "2026-05-26T10:20:00", initials: "TB", color: "#f59e0b" },
];

export const currentUser = users[10]; // Élise Rousseau, admin
export const usersById = Object.fromEntries(users.map((u) => [u.id, u]));
