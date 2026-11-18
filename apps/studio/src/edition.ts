// Welke versie draait er: je eigen Vystara Studio, of Folio (de deelbare desktop-app)?
// Wordt één keer bij het opstarten opgehaald; daarna synchroon te gebruiken.
export interface Edition {
  edition: 'vystara' | 'folio';
  productName: string;
}
export let edition: Edition = { edition: 'vystara', productName: 'Vystara Studio' };
export const isFolio = () => edition.edition === 'folio';

export async function loadEdition() {
  try {
    const r = await fetch('/api/info');
    if (r.ok) edition = await r.json();
  } catch {
    /* oude server: Vystara */
  }
  document.title = edition.productName;
  document.documentElement.dataset.edition = edition.edition;
}
