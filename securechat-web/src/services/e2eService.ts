import { uint8ArrayToBase64, base64ToUint8Array } from '@/lib/utils'

export const e2eService = {
  async generateKeyPair(): Promise<{ publicKey: string; privateKey: string } | null> {
    try {
      const keyPair = await crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' } as EcKeyGenParams,
        true,
        ['deriveKey', 'deriveBits']
      )
      const publicKey = await crypto.subtle.exportKey('spki', keyPair.publicKey)
      const privateKey = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey)
      return {
        publicKey: uint8ArrayToBase64(new Uint8Array(publicKey)),
        privateKey: uint8ArrayToBase64(new Uint8Array(privateKey)),
      }
    } catch {
      return null
    }
  },

  async deriveSharedSecret(privateKeyStr: string, peerPublicKeyStr: string): Promise<string | null> {
    try {
      const privateKeyBytes = base64ToUint8Array(privateKeyStr)
      const publicKeyBytes = base64ToUint8Array(peerPublicKeyStr)

      const privateKey = await crypto.subtle.importKey(
        'pkcs8', privateKeyBytes,
        { name: 'ECDH', namedCurve: 'P-256' } as EcKeyImportParams,
        false, ['deriveBits']
      )
      const publicKey = await crypto.subtle.importKey(
        'spki', publicKeyBytes,
        { name: 'ECDH', namedCurve: 'P-256' } as EcKeyImportParams,
        true, []
      )

      const sharedBits = await crypto.subtle.deriveBits(
        { name: 'ECDH', publicKey } as unknown as EcdhKeyDeriveParams,
        privateKey, 256
      )

      return uint8ArrayToBase64(new Uint8Array(sharedBits))
    } catch {
      return null
    }
  },

  isSupported(): boolean {
    return typeof crypto !== 'undefined' && 'subtle' in crypto
  },
}