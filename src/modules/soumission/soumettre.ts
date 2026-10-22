import { empreinteContenu, empreinteRecu } from './empreinte'
import {
  ErreurSoumission,
  type DemandeSoumission,
  type DemandeStore,
  type InfosRecu,
  type NoteSoumise,
  type RecuStore,
  type ResultatSoumission,
} from './ports'

export interface DependancesSoumission {
  demandes: DemandeStore
  recus: RecuStore
  /** Clé de stockage prévue à partir du compteur de reçu de la note. */
  clePrevue: (compteur: number, extension: string) => string
  /**
   * Délai de récupération après arrêt. L'exclusion repose sur le verrou de
   * connexion et les écritures S3 conditionnelles, jamais sur ce délai seul.
   */
  dureeReservationSecondes?: number
  jeton?: () => string
}

const DUREE_PAR_DEFAUT_SECONDES = 120

/**
 * Soumet ou reprend une note de frais. Une demande (acteur, clé) correspond à une seule
 * note : la première exécution la crée en incomplete, envoie ou vérifie le reçu, puis la
 * passe en pending ; toute répétition retrouve la même note, sans jamais la remettre à
 * pending ni écraser une décision.
 */
export async function soumettre(
  deps: DependancesSoumission,
  demande: DemandeSoumission
): Promise<ResultatSoumission> {
  return deps.demandes.executer(demande.acteurId, demande.cle, (demandes) =>
    soumettreSousVerrou({ ...deps, demandes }, demande))
}

async function soumettreSousVerrou(deps: DependancesSoumission, demande: DemandeSoumission): Promise<ResultatSoumission> {
  const jeton = (deps.jeton ?? (() => globalThis.crypto.randomUUID()))()
  const duree = deps.dureeReservationSecondes ?? DUREE_PAR_DEFAUT_SECONDES
  const empreinte = empreinteContenu(demande.champs)
  const recu: InfosRecu | null = demande.recu && {
    sha256: empreinteRecu(demande.recu.octets),
    taille: demande.recu.octets.byteLength,
    type: demande.recu.type,
    extension: demande.recu.extension,
  }

  const reservation = await deps.demandes.reserver({
    acteurId: demande.acteurId,
    cle: demande.cle,
    champs: demande.champs,
    empreinte,
    recu,
    clePrevue: deps.clePrevue,
  })
  if (!reservation) throw new ErreurSoumission('RECU_REQUIS')
  const { note } = reservation

  // Même clé avec un contenu ou un reçu différent : conflit, aucune modification.
  if (note.empreinte !== empreinte || (recu && note.recuSha256 !== recu.sha256)) {
    throw new ErreurSoumission('DEMANDE_CONTENU_DIFFERENT')
  }
  if (note.status !== 'incomplete') return { type: 'existante', note }

  // Une seule exécution active par demande, garantie par la base.
  if (!(await deps.demandes.prendre(note, jeton, duree))) {
    const relue = await deps.demandes.relire(demande.acteurId, demande.cle)
    if (relue && relue.status !== 'incomplete') return { type: 'existante', note: relue }
    throw new ErreurSoumission('DEMANDE_EN_COURS')
  }

  try {
    await assurerRecu(deps.recus, note, demande)
  } catch (erreur) {
    await liberer(deps, note, jeton)
    if (erreur instanceof ErreurSoumission) throw erreur
    throw new ErreurSoumission('SOUMISSION_INACHEVEE', erreur)
  }

  try {
    const finalisee = await deps.demandes.finaliser(note, jeton)
    if (finalisee) return { type: 'creee', note: finalisee }
  } catch (erreur) {
    // Résultat incertain : relire l'état avant de conclure à un échec.
    const relue = await relireSansErreur(deps, demande)
    if (relue && relue.status !== 'incomplete') return { type: 'creee', note: relue }
    await liberer(deps, note, jeton)
    throw new ErreurSoumission('SOUMISSION_INACHEVEE', erreur)
  }

  // Aucune ligne finalisée : une autre exécution a repris la demande, ou la
  // réservation a expiré. On rend l'état réel, jamais un succès supposé.
  const relue = await relireSansErreur(deps, demande)
  if (relue && relue.status !== 'incomplete') return { type: 'existante', note: relue }
  throw new ErreurSoumission('SOUMISSION_INACHEVEE')
}

async function assurerRecu(recus: RecuStore, note: NoteSoumise, demande: DemandeSoumission) {
  const attendu = { sha256: note.recuSha256, taille: note.recuTaille }
  const etat = await recus.verifier(note.receiptKey, attendu)
  if (etat === 'conforme') return
  // Objet absent ou différent : seul un fichier fourni dont l'empreinte est celle de la demande peut le remplacer.
  if (!demande.recu) throw new ErreurSoumission('RECU_REQUIS')
  try {
    await recus.deposer(note.receiptKey, demande.recu.octets, demande.recu.type)
  } catch (erreur) {
    // Résultat incertain du dépôt : l'objet a peut-être été écrit.
    if ((await recus.verifier(note.receiptKey, attendu).catch(() => 'absent')) === 'conforme') return
    throw erreur
  }
  if ((await recus.verifier(note.receiptKey, attendu)) !== 'conforme') {
    throw new Error('Reçu non conforme après dépôt.')
  }
}

async function liberer(deps: DependancesSoumission, note: NoteSoumise, jeton: string) {
  await deps.demandes.liberer(note, jeton).catch(() => undefined)
}

async function relireSansErreur(deps: DependancesSoumission, demande: DemandeSoumission) {
  return deps.demandes.relire(demande.acteurId, demande.cle).catch(() => null)
}
