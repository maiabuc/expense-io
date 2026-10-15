// Horloge réservée au sous-processus de test ; aucune modification de l'application.
if (process.env.ARLA_TEST_RUN !== '1' || process.env.CI_FIXED_TIME !== '2026-10-14T22:00:01Z') {
  throw new Error('Horloge simulée interdite hors campagne CI.')
}
const OriginalDate = Date
const instant = OriginalDate.parse(process.env.CI_FIXED_TIME)
globalThis.Date = new Proxy(OriginalDate, {
  construct(target, args, receiver) { return Reflect.construct(target, args.length ? args : [instant], receiver) },
  apply() { return new OriginalDate(instant).toString() },
  get(target, property, receiver) { return property === 'now' ? () => instant : Reflect.get(target, property, receiver) },
})
process.stderr.write(`CI_CLOCK=${new Date().toISOString()}\n`)
