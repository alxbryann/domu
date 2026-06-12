import type Vapi from '@vapi-ai/web'

type VapiConstructor = typeof Vapi
export type VapiClient = InstanceType<VapiConstructor>

function resolveVapiConstructor(mod: unknown): VapiConstructor {
  if (typeof mod === 'function') return mod as VapiConstructor

  const withDefault = mod as { default?: unknown }
  if (typeof withDefault.default === 'function') {
    return withDefault.default as VapiConstructor
  }

  const nested = withDefault.default as { default?: unknown } | undefined
  if (typeof nested?.default === 'function') {
    return nested.default as VapiConstructor
  }

  throw new Error('Failed to load Vapi SDK')
}

export async function createVapiClient(publicKey: string): Promise<VapiClient> {
  const mod = await import('@vapi-ai/web')
  const VapiClass = resolveVapiConstructor(mod)
  return new VapiClass(publicKey)
}
