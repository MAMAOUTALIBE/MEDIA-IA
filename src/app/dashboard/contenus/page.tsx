import { ContentsTable } from "@/components/dashboard/contenus/contents-table";
import { NewContentButton } from "@/components/dashboard/contenus/new-content-button";

export const metadata = { title: "Contenus — CMR" };

export default function ContenusPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Contenus</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Gestion de la chaîne éditoriale : brouillons, validations, publications.
          </p>
        </div>
        <NewContentButton />
      </div>
      <ContentsTable />
    </div>
  );
}
