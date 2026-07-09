import { uint8ArrayToBase64, base64ToUint8Array } from '@/lib/utils'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export async function generateKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

export async function encryptMessage(key: CryptoKey, plaintext: string): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = encoder.encode(plaintext)
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  return {
    ciphertext: uint8ArrayToBase64(new Uint8Array(encrypted)),
    iv: uint8ArrayToBase64(iv),
  }
}

export async function decryptMessage(key: CryptoKey, ciphertext: string, iv: string): Promise<string> {
  const encryptedBytes = base64ToUint8Array(ciphertext)
  const ivBytes = base64ToUint8Array(iv)
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, key, encryptedBytes)
  return decoder.decode(decrypted)
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key)
  return uint8ArrayToBase64(new Uint8Array(raw))
}

export async function importKey(keyStr: string): Promise<CryptoKey> {
  const raw = base64ToUint8Array(keyStr)
  return await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}