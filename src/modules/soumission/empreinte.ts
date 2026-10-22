import { createHash } from 'node:crypto'
import type { ChampsNote } from './ports'

/**
 * Forme canonique d'un montant décimal déjà validé : « 012.500 » et « 12.5 »
 * désignent la même valeur. Deux montants différents avant arrondi restent
 * distincts (12.345 et 12.35 ne fusionnent pas).
 */
export function montantCanonique(normalise: string): string {
  const [entier = '', fraction = ''] = normalise.split('.')
  const partieEntiere = entier.replace(/^0+/, '') || '0'
  const partieDecimale = fraction.replace(/0+$/, '')
  return partieDecimale ? `${partieEntiere}.${partieDecimale}` : partieEntiere
}

export function empreinteContenu(champs: ChampsNote): string {
  const canonique = JSON.stringify([montantCanonique(champs.montant), champs.date, champs.description])
  return createHash('sha256').update(canonique).digest('hex')
}

export function empreinteRecu(octets: Uint8Array): string {
  return createHash('sha256').update(octets).digest('hex')
}
