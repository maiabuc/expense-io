# API inventory — first source pass

Source: baseline SHA. Paths correspond to `src/app/api/<path>/route.ts`. Consumer links established by source search. Full field/error contracts and runtime validation remain pending.

| Method / path | Consumer | Source-visible boundary / effects | Status |
| --- | --- | --- | --- |
| GET/POST `/api/auth/[...nextauth]` | Auth.js login/session | Auth handlers from lib/auth | Handler inventory only |
| GET `/api/expense-notes` | Expenses page | Session; own notes; query sort interpolated | Read |
| POST `/api/expense-notes` | Expenses page | Session; multipart amount/date/description/receipt; insert/upload/update; 201 or 400/401/500 | Traced in architecture |
| POST `/api/expense-notes/receipt-suggestion` | Expenses page | Session; multipart receipt; optional amount/date via OCR | Read |
| GET `/api/expense-notes/[id]/receipt-url` | Expenses page | Session and own note; signed URL | Read |
| GET `/api/manager/expense-notes` | PendingApprovalsPanel | Manager; direct-report pending notes | Read |
| POST `/api/manager/expense-notes/[id]/approve` | PendingApprovalsPanel | Manager/direct report; pending read then update | Read |
| POST `/api/manager/expense-notes/[id]/reject` | PendingApprovalsPanel | Manager/direct report; pending read then update | Partial targeted read |
| GET `/api/manager/expense-notes/[id]/receipt-url` | PendingApprovalsPanel | Manager role; direct query by ID | Read; scope risk pending runtime |
| GET `/api/hr/expense-notes` | AdminConsole | RH; own-company root-manager pending notes | Read |
| POST `/api/hr/expense-notes/[id]/approve` | AdminConsole | RH; own-company root manager; pending read/update | Read |
| POST `/api/hr/expense-notes/[id]/reject` | AdminConsole | RH; own-company root manager; pending read/update | Partial targeted read |
| GET `/api/hr/expense-notes/[id]/receipt-url` | AdminConsole | RH; own-company root manager; signed URL | Read |
| GET `/api/hr/users` | AdminConsole | RH; own-company employee/manager directory | Read |
| PUT `/api/hr/users/[id]/manager` | AdminConsole | RH; target in company; selected manager role lookup; assignment | Read; company invariant pending |

All executed/tested/measured statuses: no. Server signup/login/logout actions in `src/app/actions/auth.ts` are additional interfaces, separate from this HTTP route inventory. Page/proxy guards do not replace API guards. Enumerate exact response fields and every error before contract changes.
