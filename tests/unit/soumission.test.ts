import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, expect } from 'vitest'
import { montantCanonique } from '../../src/modules/soumission/empreinte'
import { ErreurSoumission, type DemandeSoumission } from '../../src/modules/soumission/ports'
import { soumettre } from '../../src/modules/soumission/soumettre'
import { creerMemoire } from '../support/soumission-memoire'

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3])
const AUTRE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 9, 9, 9])
const demande = (surcharge: Partial<DemandeSoumission> = {}): DemandeSoumission => ({
  acteurId: 'u1', cle: 'cle-1', champs: { montant: '12.5', date: '2026-10-01', description: 'Taxi' },
  recu: { octets: PNG, type: 'image/png', extension: '.png' }, ...surcharge,
})
const code = (promesse: Promise<unknown>) => promesse.then(() => 'aucune erreur', (e) => (e as ErreurSoumission).code ?? String(e))

test('[AUD-003][SOUM-001][correction] première soumission : note créée, reçu déposé, finalisation pending', async () => {
  const m = creerMemoire()
  const resultat = await soumettre(m.deps, demande())
  expect(resultat.type).toBe('creee')
  expect(resultat.note.status).toBe('pending')
  expect(m.etat.depots).toBe(1)
  expect(m.objets.has(resultat.note.receiptKey)).toBe(true)
})

test('[AUD-003][SOUM-002][correction] répétition de la même demande : même note, aucun nouveau dépôt', async () => {
  const m = creerMemoire()
  const premiere = await soumettre(m.deps, demande())
  const repetition = await soumettre(m.deps, demande())
  expect(repetition.type).toBe('existante')
  expect(repetition.note.id).toBe(premiere.note.id)
  expect(m.lignes.size).toBe(1)
  expect(m.etat.depots).toBe(1)
})

test('[AUD-003][SOUM-003][correction] nouvelle clé avec le même contenu : dépense distincte', async () => {
  const m = creerMemoire()
  const a = await soumettre(m.deps, demande())
  const b = await soumettre(m.deps, demande({ cle: 'cle-2' }))
  expect(b.type).toBe('creee')
  expect(b.note.id).not.toBe(a.note.id)
  expect(m.lignes.size).toBe(2)
})

test('[AUD-003][SOUM-004][correction] même clé avec montant, description ou reçu différent : conflit sans modification', async () => {
  const m = creerMemoire()
  const initiale = await soumettre(m.deps, demande())
  for (const autre of [
    demande({ champs: { montant: '12.51', date: '2026-10-01', description: 'Taxi' } }),
    demande({ champs: { montant: '12.5', date: '2026-10-01', description: 'Repas' } }),
    demande({ recu: { octets: AUTRE, type: 'image/png', extension: '.png' } }),
  ]) expect(await code(soumettre(m.deps, autre))).toBe('DEMANDE_CONTENU_DIFFERENT')
  expect(m.lignes.get('u1:cle-1')!.note).toMatchObject({ id: initiale.note.id, status: 'pending', description: 'Taxi' })
  expect(m.etat.depots).toBe(1)
})

test('[AUD-003][SOUM-005][correction] panne du dépôt : note incomplete conservée, réservation libérée, reprise sur la même note', async () => {
  const m = creerMemoire()
  m.etat.panneDepot = 1
  expect(await code(soumettre(m.deps, demande()))).toBe('SOUMISSION_INACHEVEE')
  const ligne = m.lignes.get('u1:cle-1')!
  expect(ligne.note.status).toBe('incomplete')
  expect(ligne.jeton).toBeNull()
  const reprise = await soumettre(m.deps, demande())
  expect(reprise.type).toBe('creee')
  expect(reprise.note.id).toBe(ligne.note.id)
  expect(m.lignes.size).toBe(1)
})

test('[AUD-003][SOUM-006][correction] dépôt écrit puis erreur (résultat incertain) : relu et conforme, aucun second dépôt', async () => {
  const m = creerMemoire()
  m.etat.panneDepotApresEcriture = 1
  const resultat = await soumettre(m.deps, demande())
  expect(resultat.type).toBe('creee')
  expect(m.etat.depots).toBe(1)
})

test('[AUD-003][SOUM-007][correction] panne de finalisation : incomplete conservée, reprise sans fichier avec objet vérifié', async () => {
  const m = creerMemoire()
  m.etat.panneFinalisation = 1
  expect(await code(soumettre(m.deps, demande()))).toBe('SOUMISSION_INACHEVEE')
  expect(m.lignes.get('u1:cle-1')!.note.status).toBe('incomplete')
  const reprise = await soumettre(m.deps, demande({ recu: null }))
  expect(reprise.type).toBe('creee')
  expect(m.etat.depots).toBe(1)
})

test('[AUD-003][SOUM-008][correction] finalisation validée puis connexion perdue : relue en pending, pas de doublon', async () => {
  const m = creerMemoire()
  m.etat.panneFinalisationApresCommit = 1
  const resultat = await soumettre(m.deps, demande())
  expect(resultat.note.status).toBe('pending')
  expect(m.lignes.size).toBe(1)
  expect(m.etat.ecritures).toBe(1)
})

test('[AUD-003][SOUM-009][correction] exécution concurrente de la même demande : refus sans second dépôt, une seule finalisation', async () => {
  const m = creerMemoire()
  let liberer!: () => void
  m.etat.attenteDepot = new Promise<void>((resolve) => { liberer = resolve })
  const commence = new Promise<void>((resolve) => { m.etat.depotCommence = resolve })
  const premiere = soumettre(m.deps, demande())
  await commence
  expect(await code(soumettre(m.deps, demande()))).toBe('DEMANDE_EN_COURS')
  liberer()
  expect((await premiere).type).toBe('creee')
  expect(m.etat.depots).toBe(1)
  expect(m.etat.ecritures).toBe(1)
})

test('[AUD-003][SOUM-010][correction] réservation d’une exécution arrêtée : refusée avant expiration, reprise après', async () => {
  const m = creerMemoire()
  m.etat.panneDepot = 1
  await code(soumettre(m.deps, demande())) // crée la note
  const ligne = m.lignes.get('u1:cle-1')!
  ligne.jeton = 'ancien-processus'; ligne.expire = 120 // exécution arrêtée en cours d'envoi
  expect(await code(soumettre(m.deps, demande()))).toBe('DEMANDE_EN_COURS')
  expect(m.etat.depots).toBe(1)
  m.etat.maintenant = 121
  expect((await soumettre(m.deps, demande())).type).toBe('creee')
})

test('[AUD-003][SOUM-011][correction] reprise sans fichier : objet absent ou différent non réutilisé, fichier fourni accepté', async () => {
  const m = creerMemoire()
  m.etat.panneDepot = 1
  await code(soumettre(m.deps, demande()))
  const cleObjet = m.lignes.get('u1:cle-1')!.note.receiptKey
  expect(await code(soumettre(m.deps, demande({ recu: null })))).toBe('RECU_REQUIS')
  expect(m.lignes.get('u1:cle-1')!.jeton).toBeNull()
  m.objets.set(cleObjet, { octets: AUTRE, type: 'image/png' })
  expect(await code(soumettre(m.deps, demande({ recu: null })))).toBe('RECU_REQUIS')
  const reprise = await soumettre(m.deps, demande())
  expect(reprise.type).toBe('creee')
  expect(m.objets.get(cleObjet)!.octets).toEqual(PNG)
})

test('[AUD-003][SOUM-012][correction] note déjà décidée : la répétition rend la décision actuelle sans la remettre pending', async () => {
  const m = creerMemoire()
  await soumettre(m.deps, demande())
  m.lignes.get('u1:cle-1')!.note.status = 'approved'
  const repetition = await soumettre(m.deps, demande())
  expect(repetition).toMatchObject({ type: 'existante', note: { status: 'approved' } })
  expect(m.lignes.get('u1:cle-1')!.note.status).toBe('approved')
})

test('[AUD-003][SOUM-013][correction] demande inconnue sans fichier : reçu requis, aucune note créée', async () => {
  const m = creerMemoire()
  expect(await code(soumettre(m.deps, demande({ recu: null })))).toBe('RECU_REQUIS')
  expect(m.lignes.size).toBe(0)
})

test('[AUD-003][SOUM-014][correction] réservation perdue avant la finalisation : aucun succès supposé', async () => {
  const m = creerMemoire()
  const finaliser = m.demandes.finaliser
  m.demandes.finaliser = async (note, jeton) => { m.lignes.get('u1:cle-1')!.jeton = 'autre'; return finaliser(note, jeton) }
  expect(await code(soumettre(m.deps, demande()))).toBe('SOUMISSION_INACHEVEE')
  expect(m.lignes.get('u1:cle-1')!.note.status).toBe('incomplete')
})

test('[AUD-003][SOUM-016][correction] montant canonique : mêmes valeurs fusionnées, valeurs distinctes avant arrondi conservées', () => {
  expect(montantCanonique('12.50')).toBe(montantCanonique('12.5'))
  expect(montantCanonique('012.5')).toBe('12.5')
  expect(montantCanonique('.5')).toBe('0.5')
  expect(montantCanonique('5.')).toBe('5')
  expect(montantCanonique('12.345')).not.toBe(montantCanonique('12.35'))
})

test('[AUD-003][SOUM-015][correction] le module de soumission n’importe ni Next, ni pg, ni le SDK AWS, ni les adaptateurs', () => {
  const dossier = 'src/modules/soumission'
  const interdit = /from\s+['"](next|next\/.*|pg|@aws-sdk\/.*|@\/.*|.*lib\/.*|.*adaptateurs.*)['"]/
  const coeur = readdirSync(dossier).filter((f) => f.endsWith('.ts') && f !== 'assemblage.ts')
  expect(coeur.length).toBeGreaterThanOrEqual(3)
  for (const f of coeur) expect(readFileSync(join(dossier, f), 'utf8'), f).not.toMatch(interdit)
  // Contrôle positif : l'interdit détecte bien les adaptateurs réels.
  expect(readFileSync(join(dossier, 'adaptateurs/postgres.ts'), 'utf8')).toMatch(interdit)
})
