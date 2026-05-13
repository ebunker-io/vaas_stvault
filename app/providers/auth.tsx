import { createContext, ReactNode, useCallback, useEffect, useState } from 'react'
import { useGetCurrentValidatorOrder } from '../hooks/useGetValidatorOrder'
import { useGetInfo } from '../hooks/useInfo'
import useInterval from '../hooks'
import { useAccount, useAccountEffect, useDisconnect, useSignMessage } from 'wagmi'
import { useFetchCaptcha } from '../hooks/useFetchCaptcha'
import { getHost } from '../helpers/request'
import { useLockFn } from 'ahooks'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'

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
  const { t } = useTranslation()
  const [refreshKey, setRefreshKey] = useState(0)
  const { userInfo, isLoading: isUserInfoLoading } = useGetInfo(refreshKey)
  const fetchCaptcha = useFetchCaptcha()
  const [isLoggedIn, setLoggedIn] = useState<boolean | undefined>(undefined)
  const [isLoggingIn, setLoggingIn] = useState(false)
  const { signMessageAsync } = useSignMessage()
  const { disconnect } = useDisconnect()

  useAccountEffect({
    // 用户主动登出会先清 token 再调 disconnect()；如果走到这里 token 还在，说明是钱包侧非预期掉线
    // （WalletConnect session 心跳超时、injected provider 后台休眠等），需要清登录态并提示用户，
    // 避免 UI 继续按"已登录"渲染、把可点击的事务按钮露出来误导用户。
    onDisconnect() {
      const wasActiveSession = localStorage.getItem('token') !== null
      localStorage.removeItem('token')
      localStorage.removeItem('address')
      sessionStorage.removeItem('stVaultData')
      setLoggedIn(false)
      if (wasActiveSession) {
        toast.warn(t('wallet_disconnected_tip'))
      }
    },
  })

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
