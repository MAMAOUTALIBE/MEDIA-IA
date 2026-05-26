export interface Mention {
  id: string;
  actor: { name: string; initials: string; color: string };
  message: string;
  context: string;
  at: string;
  unread: boolean;
}

export const mentions: Mention[] = [
  {
    id: "n1",
    actor: { name: "Vincent Moreau", initials: "VM", color: "#f472b6" },
    message: "vous a mentionné dans un commentaire",
    context: "« @vous merci de valider la tribune avant 18h. »",
    at: "2026-05-26T10:48:00",
    unread: true,
  },
  {
    id: "n2",
    actor: { name: "Fatou Ndiaye", initials: "FN", color: "#a78bfa" },
    message: "vous a assigné comme validateur",
    context: "Reportage — Inondations dans le delta · étape Chef d'édition",
    at: "2026-05-26T10:21:00",
    unread: true,
  },
  {
    id: "n3",
    actor: { name: "Ndèye Faye", initials: "NF", color: "#f59e0b" },
    message: "a répondu à votre commentaire",
    context: "« Bien noté, je prépare la version verticale pour TikTok. »",
    at: "2026-05-26T09:42:00",
    unread: true,
  },
  {
    id: "n4",
    actor: { name: "Aïssatou Diop", initials: "AD", color: "#22d3ee" },
    message: "vous a partagé un brouillon",
    context: "Interview — Ministre de la Culture · révision 2",
    at: "2026-05-26T09:05:00",
    unread: false,
  },
  {
    id: "n5",
    actor: { name: "Sophie Martin", initials: "SM", color: "#c084fc" },
    message: "a demandé votre avis éditorial",
    context: "Politique — Tribune libre · sensibilité éditoriale",
    at: "2026-05-26T08:30:00",
    unread: false,
  },
];
