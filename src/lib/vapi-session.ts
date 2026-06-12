import { createVapiClient, type VapiClient } from './vapi-client'

let sharedClient: VapiClient | null = null
let sharedPublicKey: string | null = null

export async function getVapiClient(publicKey: string): Promise<VapiClient> {
  if (sharedClient && sharedPublicKey === publicKey) {
    return sharedClient
  }

  if (sharedClient) {
    await sharedClient.stop().catch(() => {})
  }

  sharedClient = await createVapiClient(publicKey)
  sharedPublicKey = publicKey
  return sharedClient
}

export function getActiveVapiClient(): VapiClient | null {
  return sharedClient
}

export async function stopVapiClient(): Promise<void> {
  if (!sharedClient) return
  await sharedClient.stop().catch(() => {})
}

export function isValidCallId(id: string | null | undefined): id is string {
  return Boolean(id && id !== 'unknown')
}
