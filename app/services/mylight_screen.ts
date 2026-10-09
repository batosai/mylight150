export type MylightState = 'connected' | 'disconnected' | 'unknown' | 'device-unavailable'
export type UiNode = Record<string, string>

function decode(value: string) {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt);/gi, (_, entity: string) => {
    if (entity.startsWith('#x')) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16))
    if (entity.startsWith('#')) return String.fromCodePoint(Number(entity.slice(1)))
    return ({ amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' } as Record<string, string>)[entity]
  })
}

// UIAutomator emits flat attributes on every node; parent structure is not needed.
export function parseUi(xml: string): UiNode[] {
  if (!xml.includes('<hierarchy') || !xml.includes('</hierarchy>')) {
    throw new Error('Invalid Android UI dump')
  }
  return [...xml.matchAll(/<node\b([^>]*?)\/?\s*>/g)].map((match) =>
    Object.fromEntries(
      [...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map((attribute) => [
        attribute[1],
        decode(attribute[2]),
      ])
    )
  )
}

export function screenState(nodes: UiNode[], packageName: string): MylightState {
  const appNodes = nodes.filter((node) => node.package === packageName)
  if (appNodes.some((node) => node['content-desc'] === 'Accéder à mon compte')) {
    return 'disconnected'
  }
  if (
    nodes.some((node) => node['resource-id'] === 'signInName') &&
    nodes.some((node) => node['resource-id'] === 'password') &&
    nodes.some((node) => node['resource-id'] === 'next')
  )
    return 'disconnected'
  if (appNodes.some((node) => node['content-desc']?.includes('Batterie virtuelle'))) {
    return 'connected'
  }
  return 'unknown'
}

export function nodeCenter(node: UiNode) {
  const match = node.bounds?.match(/^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$/)
  if (!match) throw new Error('Invalid Android control bounds')
  const [left, top, right, bottom] = match.slice(1).map(Number)
  if (right <= left || bottom <= top) throw new Error('Android control is not visible')
  return { x: Math.floor((left + right) / 2), y: Math.floor((top + bottom) / 2) }
}
