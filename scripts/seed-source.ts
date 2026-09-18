import ts from 'typescript'

export function updateSeedProperties(source: string, companyId: string, properties: Record<string, string | undefined>) {
  const file = ts.createSourceFile('companies.seed.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  let target: ts.ObjectLiteralExpression | undefined
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'seed') {
      const argument = node.arguments[0]
      if (argument && ts.isObjectLiteralExpression(argument)) {
        const id = argument.properties.find((property) => ts.isPropertyAssignment(property) && property.name.getText(file) === 'id')
        if (id && ts.isPropertyAssignment(id) && ts.isStringLiteral(id.initializer) && id.initializer.text === companyId) target = argument
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  if (!target) throw new Error(`Missing seed company: ${companyId}`)
  const edits: Array<{ start: number; end: number; text: string }> = []
  const additions: string[] = []
  for (const [name, value] of Object.entries(properties)) {
    const property = target.properties.find((item) => ts.isPropertyAssignment(item) && item.name.getText(file) === name)
    if (property && ts.isPropertyAssignment(property)) {
      if (value === undefined) {
        const index = target.properties.indexOf(property)
        const previous = target.properties[index - 1]
        const next = target.properties[index + 1]
        edits.push(previous
          ? { start: previous.end, end: property.end, text: '' }
          : { start: property.getStart(file), end: next ? next.getStart(file) : property.end, text: '' })
      } else edits.push({ start: property.initializer.getStart(file), end: property.initializer.end, text: value })
    } else if (value !== undefined) additions.push(`${name}: ${value}`)
  }
  if (additions.length) {
    const last = target.properties.at(-1)
    const position = last?.end ?? target.getStart(file) + 1
    edits.push({ start: position, end: position, text: `${last ? ', ' : ''}${additions.join(', ')}` })
  }
  return edits.sort((left, right) => right.start - left.start).reduce((text, edit) => text.slice(0, edit.start) + edit.text + text.slice(edit.end), source)
}