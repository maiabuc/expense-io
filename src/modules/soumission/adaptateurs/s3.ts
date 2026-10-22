import { readReceiptVersion, uploadReceiptVersion } from '../../../lib/storage'
import { empreinteRecu } from '../empreinte'
import type { RecuStore } from '../ports'

/** Chaque dépôt compare la version S3 : un ancien traitement ne peut écraser un reçu déjà validé. */
export function creerRecuStoreS3(): RecuStore {
  const versions = new Map<string, string | null>()
  return {
    async verifier(cle, attendu) {
      const objet = await readReceiptVersion(cle)
      versions.set(cle, objet?.etag ?? null)
      if (!objet) return 'absent'
      return objet.body.byteLength === attendu.taille && empreinteRecu(objet.body) === attendu.sha256
        ? 'conforme' : 'different'
    },
    async deposer(cle, octets, type) {
      // Un appel direct doit lui aussi observer une version avant d'écrire.
      const version = versions.has(cle) ? versions.get(cle)! : (await readReceiptVersion(cle))?.etag ?? null
      await uploadReceiptVersion(cle, Buffer.from(octets), type, version)
      versions.delete(cle)
    },
  }
}
