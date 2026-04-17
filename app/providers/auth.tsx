import { createContext, ReactNode, useCallback, useEffect, useState } from 'react'
import { useGetCurrentValidatorOrder } from '../hooks/useGetValidatorOrder'
import { useGetInfo } from '../hooks/useInfo'
import useInterval from '../hooks'
import { useAccount, useAccountEffect, useDisconnect, useSignMessage } from 'wagmi'
import { useFetchCaptcha } from '../hooks/useFetchCaptcha'
import { getHost } from '../helpers/request'
import { useLockFn } from 'ahooks'

export interface AuthContextInterface {
  isLoggedIn: boolean | undefined
  isLoggingIn: boolean
  loginWithAddress: any
  logout: any
  userInfo: any
  refreshUserInfo: any
  order: any
  mutateOrder: any
}

export const AuthContext = createContext<AuthContextInterface>({
  isLoggedIn: undefined,
  isLoggingIn: false,
  loginWithAddress: () => {},
  logout: () => {},
  userInfo: {},
  refreshUserInfo: () => {},
  order: {},
  mutateOrder: () => {},
})

export const AuthProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const [refreshKey, setRefreshKey] = useState(0)
  const { userInfo, isLoading: isUserInfoLoading } = useGetInfo(refreshKey)
  const fetchCaptcha = useFetchCaptcha()
  const [isLoggedIn, setLoggedIn] = useState<boolean | undefined>(undefined)
  const [isLoggingIn, setLoggingIn] = useState(false)
  const { signMessageAsync } = useSignMessage()
  const { disconnect } = useDisconnect()
//   useAccountEffect({
//     onDisconnect() {
//       // setLoggedIn(false)
//       // localStorage.removeItem('token')
//       localStorage.removeItem('address')
//     },
//   })

  const [orderRefreshKey, setOrderRefreshKey] = useState(0)
  const { data: order, error, isLoading } = useGetCurrentValidatorOrder(orderRefreshKey)
  useInterval(
    () => {
      const token = localStorage.getItem('token')
      // if (token && address && isConnected) {
      if (token) {
        setLoggedIn(true)
      } else {
        setLoggedIn(false)
      }
    },
    500,
    true
  )

  const loginWithAddress = useLockFn(
    async (addr: string, invitationCode: string) => {
      setLoggingIn(true)
      try {
        const ret = await fetchCaptcha(addr)
        const message = ret.code
        const signature = await signMessageAsync({ message: ret.code })
        await requestSession(addr, message, signature, invitationCode)
        setRefreshKey(new Date().getTime())
        setTimeout(() => {
          setLoggingIn(false)
        }, 1500)
      } catch (e) {
        console.log(e)
        disconnect()
        logout()
      }
    }
  )

  const logout = async () => {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        await fetch(`${getHost()}/apis/sessions`, {
          method: 'DELETE',
          headers: new Headers({
            'Content-Type': 'application/json',
            'Authorization': token,
          }),
        })
      } catch (e) {
        console.log('Failed to delete session:', e)
      }
    }
    setLoggedIn(false)
    setLoggingIn(false)
    localStorage.removeItem('token')
    localStorage.removeItem('address')
    sessionStorage.removeItem('stVaultData')
  }

  const requestSession = (address: string, message: string, signature: string, invitationCode: string) => {
    return fetch(`${getHost()}/apis/sessions`, {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({
        address,
        captcha: message,
        sign: signature,
        inviteCode: invitationCode,
      }),
    })
      .then((res) => res.json())
      .then((value) => {
        localStorage.setItem('token', value.data.token)
        localStorage.setItem('address', address as string)
        setLoggedIn(true)
      })
  }

  const mutateOrder = useCallback(() => {
    setOrderRefreshKey(new Date().getTime())
  }, [])

  const refreshUserInfo = useCallback(() => {
    setRefreshKey(new Date().getTime())
  }, [])

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        isLoggingIn,
        loginWithAddress,
        logout,
        userInfo,
        refreshUserInfo,
        order,
        mutateOrder,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
