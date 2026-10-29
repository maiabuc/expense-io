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
  // Retrait des zéros décimaux terminaux par parcours arrière en temps
  // linéaire (AUD-029) : on recule un index tant que le caractère précédent
  // est un 0, puis on conserve la tranche avant cet index. Remplace
  // `fraction.replace(/0+$/, '')`, dont l'expression peut provoquer des
  // retours arrière coûteux sur une longue fraction. Résultat identique.
  let fin = fraction.length
  while (fin > 0 && fraction[fin - 1] === '0') fin--
  const partieDecimale = fraction.slice(0, fin)
  return partieDecimale ? `${partieEntiere}.${partieDecimale}` : partieEntiere
}

export function empreinteContenu(champs: ChampsNote): string {
  const canonique = JSON.stringify([montantCanonique(champs.montant), champs.date, champs.description])
  return createHash('sha256').update(canonique).digest('hex')
}

export function empreinteRecu(octets: Uint8Array): string {
  return createHash('sha256').update(octets).digest('hex')
}
