export type AppView = 'calculator' | 'tariffs'

const TARIFFS_HASH = '#/tariffs'

function hashPath(hash: string): string {
  const trimmed = hash.trim()
  const queryIndex = trimmed.indexOf('?')
  return (queryIndex < 0 ? trimmed : trimmed.slice(0, queryIndex)).toLowerCase()
}

export function parseAppView(hash: string): AppView {
  const normalized = hashPath(hash)
  if (
    normalized === TARIFFS_HASH ||
    normalized === '#tariffs' ||
    normalized === '#/tarifas' ||
    normalized === '#tarifas'
  ) {
    return 'tariffs'
  }
  return 'calculator'
}

export function hashForView(view: AppView): string {
  return view === 'tariffs' ? TARIFFS_HASH : '#/'
}

export function readAppViewFromLocation(
  location: Pick<Location, 'hash'> = window.location,
): AppView {
  return parseAppView(location.hash)
}

export function setAppViewHash(view: AppView): void {
  const nextHash = hashForView(view)
  if (window.location.hash === nextHash) return
  // Use assign so browser history/back-forward works for the hash views.
  window.location.hash = nextHash
}
