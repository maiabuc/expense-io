import { receiptKeyFor } from '@/lib/storage'
import { creerDemandeStorePostgres } from './adaptateurs/postgres'
import { creerRecuStoreS3 } from './adaptateurs/s3'
import type { DependancesSoumission } from './soumettre'

// Point d'assemblage concret : les adaptateurs réels sont injectés ici, jamais dans le module.
export function dependancesReelles(): DependancesSoumission {
  return {
    demandes: creerDemandeStorePostgres(),
    recus: creerRecuStoreS3(),
    clePrevue: receiptKeyFor,
  }
}
