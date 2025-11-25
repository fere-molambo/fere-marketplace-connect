export const ShopInfoSection = ({ shop }: { shop: any }) => {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Informations de la boutique</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Description</p>
            <p className="text-foreground">{shop.description || "Aucune description"}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="text-foreground capitalize">{shop.shop_type?.replace("_", " ")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Statut légal</p>
              <p className="text-foreground capitalize">{shop.statut_legal || "Non défini"}</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Adresse</p>
            <p className="text-foreground">{shop.address || "Non définie"}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Contact</p>
              <p className="text-foreground">{shop.contact_phone || "Non défini"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="text-foreground">{shop.contact_email || "Non défini"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          L'édition complète des informations sera disponible prochainement
        </p>
      </div>
    </div>
  );
};
