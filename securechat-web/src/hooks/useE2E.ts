import { useCallback, useState } from 'react'
import { e2eService } from '@/services/e2eService'

export function useE2E() {
  const [enabled, setEnabled] = useState(false)
  const [supported] = useState(e2eService.isSupported())

  const generateKeys = useCallback(async () => {
    return await e2eService.generateKeyPair()
  }, [])

  const deriveSecret = useCallback(async (privateKey: string, peerPublicKey: string) => {
    return await e2eService.deriveSharedSecret(privateKey, peerPublicKey)
  }, [])

  return { enabled, setEnabled, supported, generateKeys, deriveSecret }
}
