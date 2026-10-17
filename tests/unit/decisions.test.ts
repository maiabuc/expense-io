import { test, expect } from 'vitest'
import { ExpenseNote } from '../../src/domain/ExpenseNote'
import { User } from '../../src/domain/User'

const pending = () => new ExpenseNote({ id: 'note-ci', userId: 'employe-ci', amount: 12.34,
  expenseDate: '2026-10-01', description: 'Taxi', receiptKey: 'receipt.png', status: 'pending' })

test('[AUD-007][DOM-001][reference] une note pending peut être approuvée sans changer son contenu', () => {
  const original = pending(); const result = original.approve()
  expect(result.toJSON()).toEqual({ ...original.toJSON(), status: 'approved' })
  expect(original.status).toBe('pending')
})
test('[AUD-007][DOM-002][reference] une note pending peut être rejetée', () => {
  expect(pending().reject().status).toBe('rejected')
})
test('[AUD-007][DOM-003][reference] une approbation ne peut pas être inversée dans le modèle', () => {
  expect(() => pending().approve().reject()).toThrow()
})
test('[AUD-007][DOM-004][reference] une décision identique ne peut pas être rejouée dans le modèle', () => {
  expect(() => pending().reject().reject()).toThrow()
})
test('[AUD-006][DOM-005][reference] un manager gère son collaborateur direct et pas un autre', () => {
  const manager = new User({ id: 'm', email: 'm@ci.invalid', name: 'Manager', role: 'manager', managerId: null })
  const employee = (managerId: string) => new User({ id: 'e', email: 'e@ci.invalid', name: 'Employé', role: 'employee', managerId })
  expect(manager.canManage(employee('m'))).toBe(true)
  expect(manager.canManage(employee('autre'))).toBe(false)
})
test('[AUD-011][DOM-006][reference] seul un manager sans supérieur est manager racine', () => {
  expect(new User({ id: 'm', email: 'm@ci.invalid', name: 'Manager', role: 'manager', managerId: null }).isRootManager()).toBe(true)
  expect(new User({ id: 'e', email: 'e@ci.invalid', name: 'Employé', role: 'employee', managerId: null }).isRootManager()).toBe(false)
})
