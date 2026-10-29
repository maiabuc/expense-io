import { test, expect } from 'vitest'
import { montantCanonique, empreinteContenu } from '../../src/modules/soumission/empreinte'

test('[AUD-029][CANON-001][reference] la forme canonique conserve les valeurs du corpus historique', () => {
  const corpus = [
    ['0', '0'], ['000', '0'], ['000.000', '0'], ['012.500', '12.5'],
    ['.5', '0.5'], ['5.', '5'], ['00012.0030400', '12.00304'],
    ['12.345', '12.345'], ['12.35', '12.35'], ['99999999.9900', '99999999.99'],
  ]
  for (const [input, expected] of corpus) expect(montantCanonique(input), input).toBe(expected)
})

test('[AUD-029][CANON-002][reference] les équivalences avant arrondi ne fusionnent pas deux montants distincts', () => {
  for (const [left, right] of [['012.500', '12.5'], ['.5', '0.5'], ['5.', '5']]) {
    expect(montantCanonique(left)).toBe(montantCanonique(right))
    expect(empreinteContenu({ montant: left, date: '2026-10-01', description: 'Taxi' }))
      .toBe(empreinteContenu({ montant: right, date: '2026-10-01', description: 'Taxi' }))
  }
  expect(empreinteContenu({ montant: '12.345', date: '2026-10-01', description: 'Taxi' }))
    .not.toBe(empreinteContenu({ montant: '12.35', date: '2026-10-01', description: 'Taxi' }))
})

test('[AUD-029][CANON-003][correction] les longues fractions restent exactes sans limite nouvelle de précision', () => {
  // Taille modérée pour caractériser le résultat même sur l'ancien motif ;
  // les mesures de complexité sont menées séparément avec délai de processus.
  const internalZeros = '0'.repeat(4_000)
  const tiny = `0.${internalZeros}1`
  expect(montantCanonique(tiny)).toBe(tiny)
  expect(montantCanonique(`${tiny}${'0'.repeat(4_000)}`)).toBe(tiny)
  expect(montantCanonique(`12.${'0'.repeat(8_000)}`)).toBe('12')
})

test('[AUD-029][CANON-004][reference] les empreintes fixes restent compatibles avec les demandes historiques', () => {
  // Références SHA-256 du format JSON historique [montant canonique, date,
  // description], figées avant correction ; aucune conversion flottante.
  const corpus = [
    ['012.500', 'a72547348a074cd4c352f826c1d8e54545435e8829733e1aa0fe5fbcf0d4828c'],
    ['.500', 'cd2561a9674863d7d0a9455703401767e921bbafbf1b6a07b2ca5d3375fbd56f'],
    ['5.', '99318f0af14c7ada416f4d0ed6fb5d07971b0566c993783a3b012ca1abf007ef'],
    ['12.3450', 'c07d66b37ec2bdf015aa8aa3cf2ba3398f81bd930ec25c527ba736e17e8e25d7'],
    ['12.350', '048a0cab6bb20f0c2e0c9febade8b16d696bab0b65adbf35feef2f248a1eb0ad'],
  ]
  for (const [montant, expected] of corpus) {
    expect(empreinteContenu({ montant, date: '2026-10-01', description: 'Taxi' }), montant).toBe(expected)
  }
})
