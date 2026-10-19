// Ports du module de soumission (ADR-0002). Aucun type Next, pg ou AWS ici :
// le module est piloté par des paramètres et ne connaît ni SQL ni S3.

export type StatutNote = 'incomplete' | 'pending' | 'approved' | 'rejected'

export type TypeRecu = 'image/png' | 'image/jpeg' | 'image/webp' | 'application/pdf'

/** Note telle que le module la manipule ; les champs techniques de reprise restent internes. */
export interface NoteSoumise {
  id: string
  userId: string
  /** Montant stocké (numeric(10,2) rendu en chaîne par la base). */
  amount: string
  expenseDate: string
  description: string
  receiptKey: string
  status: StatutNote
  createdAt: string
  requestKey: string
  /** Empreinte du contenu saisi (montant avant arrondi, date, description). */
  empreinte: string
  recuSha256: string
  recuTaille: number
}

export interface ChampsNote {
  /** Montant décimal normalisé par la validation d'entrée, avant tout arrondi. */
  montant: string
  date: string
  description: string
}

export interface InfosRecu {
  sha256: string
  taille: number
  type: TypeRecu
  extension: string
}

export interface ReservationDemande {
  acteurId: string
  cle: string
  champs: ChampsNote
  empreinte: string
  /** Absent quand la reprise est faite sans nouveau fichier. */
  recu: InfosRecu | null
  /** Clé de stockage prévue, dérivée du compteur de reçu de la note créée. */
  clePrevue: (compteur: number, extension: string) => string
}

/** Persistance : opérations métier atomiques, jamais de SQL fourni par l'appelant. */
export interface DemandeStore {
  /**
   * Crée la note incomplete liée à (acteur, clé) ou retrouve celle qui existe déjà.
   * Sans note existante et sans reçu, rend null (rien n'est créé).
   */
  reserver(demande: ReservationDemande): Promise<{ note: NoteSoumise; creee: boolean } | null>
  /** Prend l'exécution de la demande : un seul détenteur à la fois, jeton et expiration. */
  prendre(note: NoteSoumise, jeton: string, dureeSecondes: number): Promise<boolean>
  /** Référence du reçu et passage à pending ensemble, seulement pour le détenteur du jeton. */
  finaliser(note: NoteSoumise, jeton: string): Promise<NoteSoumise | null>
  /** Libère la réservation du détenteur (sans effet si le jeton n'est plus le sien). */
  liberer(note: NoteSoumise, jeton: string): Promise<void>
  relire(acteurId: string, cle: string): Promise<NoteSoumise | null>
}

export type EtatRecuStocke = 'conforme' | 'absent' | 'different'

/** Stockage du reçu : clé prévue contrôlée par le serveur, vérification par empreinte et taille. */
export interface RecuStore {
  verifier(cle: string, attendu: { sha256: string; taille: number }): Promise<EtatRecuStocke>
  deposer(cle: string, octets: Uint8Array, type: TypeRecu): Promise<void>
}

export interface DemandeSoumission {
  acteurId: string
  cle: string
  champs: ChampsNote
  /** Fichier fourni ; absent seulement pour une reprise dont l'objet est déjà stocké. */
  recu: { octets: Uint8Array; type: TypeRecu; extension: string } | null
}

export type ResultatSoumission =
  | { type: 'creee'; note: NoteSoumise }
  | { type: 'existante'; note: NoteSoumise }

export type CodeErreurSoumission =
  | 'DEMANDE_CONTENU_DIFFERENT'
  | 'DEMANDE_EN_COURS'
  | 'RECU_REQUIS'
  | 'SOUMISSION_INACHEVEE'

export class ErreurSoumission extends Error {
  constructor(
    readonly code: CodeErreurSoumission,
    readonly cause?: unknown
  ) {
    super(code)
    this.name = 'ErreurSoumission'
  }
}
