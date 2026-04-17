import {useEffect} from 'react'
import { useDisconnect } from 'wagmi'

export const useNetworkListener = () => {
  const { disconnect } = useDisconnect()
  useEffect(() => {
    const {ethereum} = window

    if (ethereum && ethereum.on) {
      const handleChainChanged = () => {
      }

      const handleAccountsChanged = async (accounts: string[]) => {
        if (accounts.length > 0) {
          // localStorage.removeItem('token')
          disconnect()
          localStorage.removeItem('address')
        }
      }

      ethereum.on('chainChanged', handleChainChanged)
      ethereum.on('accountsChanged', handleAccountsChanged)

      return () => {
        if (ethereum.removeListener) {
          ethereum.removeListener('chainChanged', handleChainChanged)
          ethereum.removeListener('accountsChanged', handleAccountsChanged)
        }
      }
    }
    return undefined
  }, [])
}
