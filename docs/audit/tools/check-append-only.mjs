// Contrôle documentaire : préserve les préfixes historiques des fiches d'audit.
import { createHash } from 'node:crypto'
import { readFile, writeFile, readdir } from 'node:fs/promises'
import { resolve, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'

const dossierParDefaut = fileURLToPath(new URL('../../../', import.meta.url))
const manifeste = JSON.parse(await readFile(new URL('../evidence/audit-content-baseline.json', import.meta.url), 'utf8'))
const argumentsCli = process.argv.slice(2)
const mode = argumentsCli.shift()
let racine = dossierParDefaut
let cheminSnapshot

function empreinte(contenu) {
  return createHash('sha256').update(contenu).digest('hex')
}

try {
  while (argumentsCli.length) {
    const option = argumentsCli.shift()
    const valeur = argumentsCli.shift()
    if (!valeur || !['--root', '--snapshot'].includes(option)) throw new Error('Option inconnue ou valeur absente.')
    if (option === '--root') racine = resolve(valeur)
    else cheminSnapshot = resolve(valeur)
  }
  if (!['capture', 'check'].includes(mode)) throw new Error('Utilisation : capture --snapshot <fichier> ou check [--snapshot <fichier>] ; --root <dossier> pour une copie de contrôle.')
  if (mode === 'capture' && !cheminSnapshot) throw new Error('Le mode capture exige --snapshot.')

  const anomalies = []
  async function verifier(reference, origine) {
    for (const entree of reference.fichiers) {
      if (isAbsolute(entree.chemin) || !/^docs\/audit\/solutions-to-audit\/[^/]+\.md$/.test(entree.chemin)) throw new Error('Chemin de fiche invalide dans la référence.')
      let contenu
      try { contenu = await readFile(resolve(racine, entree.chemin)) }
      catch (erreur) {
        if (erreur.code !== 'ENOENT') throw erreur
        anomalies.push({ fichier: entree.chemin, reference: origine, erreur: 'Fiche absente.' })
        continue
      }
      if (contenu.length < entree.octets || empreinte(contenu.subarray(0, entree.octets)) !== entree.sha256) {
        anomalies.push({ fichier: entree.chemin, reference: origine, erreur: 'Contenu existant modifié ou tronqué.' })
        continue
      }
      if (contenu.length > entree.octets && !/^## IMPLEMENTATION\r?$/m.test(contenu.toString('utf8'))) {
        anomalies.push({ fichier: entree.chemin, reference: origine, erreur: 'Ajout sans section IMPLEMENTATION.' })
      }
    }
  }

  await verifier(manifeste, 'historique original')
  if (mode === 'check' && cheminSnapshot) {
    const snapshot = JSON.parse(await readFile(cheminSnapshot, 'utf8'))
    if (!Array.isArray(snapshot.fichiers) || snapshot.fichiers.length === 0) throw new Error('Snapshot vide ou invalide.')
    const references = new Set(snapshot.fichiers.map(entree => entree.chemin))
    for (const entree of manifeste.fichiers) {
      if (!references.has(entree.chemin)) throw new Error('Snapshot incomplet : une fiche historique manque.')
    }
    await verifier(snapshot, 'début de tâche')
  }
  if (anomalies.length) {
    console.error(JSON.stringify({ resultat: 'echec', anomalies }, null, 2))
    process.exitCode = 1
  } else if (mode === 'capture') {
    const dossier = resolve(racine, 'docs/audit/solutions-to-audit')
    const fichiers = []
    for (const nom of (await readdir(dossier)).filter(nom => nom.endsWith('.md')).sort()) {
      const contenu = await readFile(resolve(dossier, nom))
      fichiers.push({ chemin: `docs/audit/solutions-to-audit/${nom}`, octets: contenu.length, sha256: empreinte(contenu) })
    }
    await writeFile(cheminSnapshot, JSON.stringify({ date: new Date().toISOString(), fichiers }, null, 2) + '\n', { flag: 'wx' })
    console.log(JSON.stringify({ resultat: 'capture', fiches: fichiers.length, snapshot: cheminSnapshot }))
  } else {
    console.log(JSON.stringify({ resultat: 'succes', fichesHistoriques: manifeste.fichiers.length, snapshot: Boolean(cheminSnapshot) }))
  }
} catch (erreur) {
  console.error(JSON.stringify({ resultat: 'erreur', message: erreur.message }))
  process.exitCode = 2
}
