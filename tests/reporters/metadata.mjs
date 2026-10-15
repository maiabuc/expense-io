export function metadata(title) {
  const match = title.match(/^\[((?:AUD-\d{3}|G10|G14)(?:,(?:AUD-\d{3}|G10|G14))*)\]\[([A-Z][A-Z0-9-]+)\]\[(reference|correction|outillage)\] (.+)$/)
  if (!match) throw new Error(`Titre sans traçabilité issue/cas/type : ${title}`)
  return { issues: match[1].split(','), caseId: match[2], kind: match[3], title }
}
export function sanitize(message) {
  return String(message ?? '')
    .replace(/https?:\/\/[^\s"'<>]*[?&]X-Amz-[^\s"'<>]*/gi, '[URL signée masquée]')
    .replace(/((?:set-cookie|cookie|authorization)\s*:\s*)[^\r\n]+/gi, '$1[masqué]')
}
