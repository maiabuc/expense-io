export const password = 'mot-de-passe-ci-fictif'
const uuid = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`
export const companies = { a: uuid(1), b: uuid(2) }
export const users = {
  a_hr: { id: uuid(101), email: 'rh@ci-a.invalid', name: 'RH A', role: 'hr_admin', company: companies.a, manager: null },
  a_root: { id: uuid(102), email: 'racine@ci-a.invalid', name: 'Manager racine A', role: 'manager', company: companies.a, manager: null },
  a_sub: { id: uuid(103), email: 'sub@ci-a.invalid', name: 'Manager subordonné A', role: 'manager', company: companies.a, manager: uuid(102) },
  a_employee: { id: uuid(104), email: 'employe@ci-a.invalid', name: 'Employé A', role: 'employee', company: companies.a, manager: uuid(102) },
  a_unrelated: { id: uuid(105), email: 'autre@ci-a.invalid', name: 'Autre employé A', role: 'employee', company: companies.a, manager: uuid(103) },
  b_hr: { id: uuid(201), email: 'rh@ci-b.invalid', name: 'RH B', role: 'hr_admin', company: companies.b, manager: null },
  b_root: { id: uuid(202), email: 'racine@ci-b.invalid', name: 'Manager racine B', role: 'manager', company: companies.b, manager: null },
  b_sub: { id: uuid(203), email: 'sub@ci-b.invalid', name: 'Manager subordonné B', role: 'manager', company: companies.b, manager: uuid(202) },
  b_employee: { id: uuid(204), email: 'employe@ci-b.invalid', name: 'Employé B', role: 'employee', company: companies.b, manager: uuid(202) },
  b_unrelated: { id: uuid(205), email: 'autre@ci-b.invalid', name: 'Autre employé B', role: 'employee', company: companies.b, manager: uuid(203) },
} as const
export type UserKey = keyof typeof users
export const notes = {
  employee: uuid(301), approved: uuid(302), rejected: uuid(303), root: uuid(304), sub: uuid(305), unrelated: uuid(306),
  b_employee: uuid(401), b_root: uuid(402),
}
export const absent = uuid(999)
export interface ExpenseNoteResponse {
  id: string; userId: string; amount: number; expenseDate: string; description: string;
  receiptKey: string; status: string; createdAt: string
}
