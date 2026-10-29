import { test, expect } from 'vitest'
import { isValidEmail } from '../../src/utils/validators'

const emailOfLength = (length: number) => `${'a'.repeat(length - 5)}@b.co`

test('[AUD-027,AUD-030][EMAIL-002][correction] email valide de 4095 unités accepté', () => {
  const email = emailOfLength(4095)
  expect(email).toHaveLength(4095)
  expect(isValidEmail(email)).toBe(true)
})

test('[AUD-027,AUD-030][EMAIL-003][correction] email valide de 4096 unités accepté', () => {
  const email = emailOfLength(4096)
  expect(email).toHaveLength(4096)
  expect(isValidEmail(email)).toBe(true)
})

test('[AUD-027,AUD-030][EMAIL-004][correction] email valide de 4097 unités refusé', () => {
  const email = emailOfLength(4097)
  expect(email).toHaveLength(4097)
  expect(isValidEmail(email)).toBe(false)
})

test('[AUD-027,AUD-030][EMAIL-005][reference] grammaire courte historique conservée sans normalisation', () => {
  // Oracle réservé à des entrées courtes : aucun ancien motif sur entrée adverse longue.
  const original = /^[^\s@]+@([^\s@]+\.[^\s@]+)$/
  const corpus = [
    '', 'a', '@b.co', 'a@', 'a@b', 'a@b.co', 'A@Sub.Example.CO',
    'a..b@c..d', 'a@..b', 'a@b..', 'é@dömäin.fr', '用戶@例子.測試',
    '.@a.b', 'a@.b', 'a@b.', 'a@@b.co', ' a@b.co', 'a@b.co ',
    'a\tb@c.co', 'a@b\nc.co', 'a\r@b.co', 'a@b.\u00a0co',
    'a\u200bb@c.co', 'a+b@b.co', 'a@b.c.d', 'a@...', 'a@..',
    ...Array.from(' \t\n\r\v\f\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff').flatMap(c => [c + 'a@b.co', 'a@b' + c + '.co', 'a@b.co' + c]),
  ]
  for (const email of corpus) expect(isValidEmail(email), JSON.stringify(email)).toBe(original.test(email))
})

test('[AUD-027,AUD-030][EMAIL-006][correction] domaine adverse à nombreux points refusé', () => {
  expect(isValidEmail(`a@${'a.'.repeat(1500)}@`)).toBe(false)
})
