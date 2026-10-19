import { readReceipt, uploadReceipt } from '../../../lib/storage'
import { empreinteRecu } from '../empreinte'
import type { RecuStore } from '../ports'

/** Adaptateur S3 : un objet n'est réutilisé que si sa taille et son empreinte sont celles de la demande. */
export function creerRecuStoreS3(): RecuStore {
  return {
    async verifier(cle, attendu) {
      const octets = await readReceipt(cle)
      if (!octets) return 'absent'
      return octets.byteLength === attendu.taille && empreinteRecu(octets) === attendu.sha256
        ? 'conforme'
        : 'different'
    },
    async deposer(cle, octets, type) {
      await uploadReceipt(cle, Buffer.from(octets), type)
    },
  }
}
