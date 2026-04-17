import { Box, Button, IconButton, MenuItem, Stack, Tooltip } from '@mui/material'
import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { ClickTooltipWithIcon, StyledMenu } from './style'
import { useAccount, useAccountEffect, useConnect, useDisconnect, useSwitchChain } from 'wagmi'
import { getImage } from '../helpers/image'
import { ellipseAddress } from '../helpers/display'
import { UpdateEmailModal } from './modals/account'
import { UpdateExecutionWithdrawAddressModal } from './modals/update-execution-withdraw-address'
import { useModal } from 'mui-modal-provider'
import { useTranslation } from 'react-i18next'
import { useWindowSize } from '../hooks'
import { useRouter } from 'next/router'
import { toast } from 'react-toastify'
import CopyToClipboard from './CopyToClipboard'
import { ReferralModal } from './modals/referral'
import LaunchIcon from '@mui/icons-material/Launch'
import { delay } from '../helpers'
import { useNetworkListener } from '../hooks/useNetworkListener'
import { AuthContext } from '../providers/auth'
import { getEtherscan } from '../helpers/request'
import * as Popover from '@radix-ui/react-popover'
import { Copy, Edit2, Unlink } from 'lucide-react'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useDebounceFn } from 'ahooks'

export const LoginConnector = ({ isApp }: { isApp?: boolean }) => {
  useNetworkListener()

  const router = useRouter()
  const invitationCode = (router.query as any).invitation_code as string

  const { t } = useTranslation()
  const { disconnect } = useDisconnect()
  const { showModal } = useModal()

  const { openConnectModal } = useConnectModal()
  const { width } = useWindowSize()
  const isMobile = width < 768
  const isHome = router.pathname === '/'
  const { address } = useAccount()

  // useAccountEffect({
  //   onDisconnect() {
  //     // console.log(`onDisconnect-----`)
  //     // localStorage.removeItem('token')
  //     // localStorage.removeItem('address')
  //   },
  // })
  const { loginWithAddress, userInfo, refreshUserInfo, isLoggedIn, isLoggingIn, logout } = useContext(AuthContext)
  // const { connectAsync, connectors } = useConnect()

  const [ogUrl, setOgUrl] = useState('')

  useEffect(() => {
    const host = window.location.origin
    setOgUrl(`${host}/dashboard`)
  }, [])

  function onLogOut() {
    logout()
    localStorage.removeItem('token')
    localStorage.removeItem('address')
    disconnect()
    refreshUserInfo()
  }

  const changeRewardsAddress = () => {
    const { hide } = showModal(UpdateExecutionWithdrawAddressModal, {
      onInfoUpdate: () => {
        delay(2000).then((ret) => {
          refreshUserInfo()
        })
      },
      // closeModal:()=>{hide()}
    })
  }

  const {run:login} = useDebounceFn(() => {
    if (address && loginWithAddress && !userInfo && isLoggedIn === false) {
      loginWithAddress(address, invitationCode)
    }
  }, { wait: 1000,trailing:true })

  useEffect(() => {
    console.log('address', address)
    if (address) {
      login()
    }
  }, [address])
  return (
    <>
      {userInfo ? (
        <Popover.Root>
          <Popover.Trigger>
            <button className='btn-primary md:text-[16px] text-[12px] md:h-10 h-8'>{ellipseAddress(userInfo?.reward_address, isMobile ? 2 : 4)}</button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              sideOffset={4}
              className='bg-white flex flex-col z-[100] p-6 rounded-lg border border-[#CCCCCC] max-w-[320px] mt-1 absolute top-0 right-[-55px]'
              style={{ maxHeight: '80vh', overflowY: 'auto' }}
            >
              <div className='text-sm font-semibold'>{t('logged_in_with')}</div>

              <div className='flex items-center h-10 gap-2 px-3 pr-1 mt-3 border rounded-md border-slate-300'>
                <div className='md:text-sm text-[12px]'>{ellipseAddress(userInfo?.reward_address)}</div>
                <CopyToClipboard
                  text={userInfo?.reward_address}
                  onCopy={() => {
                    toast.info(t('copied'))
                  }}
                >
                  <button className='p-2 ml-auto rounded-md hover:bg-slate-100'>
                    <Copy className='w-3 h-3' />
                  </button>
                </CopyToClipboard>
              </div>

              <div className='text-sm font-semibold mt-7'>{t('connected_wallet')}</div>

              <div className='flex items-center md:h-10 h-8 gap-2 px-3 pr-1 mt-3 border rounded-md border-slate-300'>
                <div className='md:text-sm text-[10px]'>{ellipseAddress(address?.toLocaleLowerCase())}</div>

                {address ? (
                  <Tooltip title={t('disconnect')}>
                    <button className='p-2 ml-auto rounded-md hover:bg-slate-100' onClick={() => disconnect()}>
                      <Unlink className='w-3 h-3' />
                    </button>
                  </Tooltip>
                ) : (
                  <button
                    onClick={() => {
                      openConnectModal?.()
                    }}
                    className='text-sm text-right text-blue-500'
                  >
                    {t('connect_wallet')}
                  </button>
                )}
              </div>

              <div className='text-sm font-semibold mt-7'>{t('execution_withdraw_address')}</div>

              <div className='field'>
                <div className='md:text-sm text-[12px]'>{ellipseAddress(userInfo?.execution_withdraw_address)}</div>
                <button
                  onClick={() => {
                    changeRewardsAddress()
                  }}
                  className='p-2 ml-auto rounded-md hover:bg-slate-100'
                >
                  <Edit2 className='w-3 h-3' />
                </button>
              </div>

              <a
                href={getEtherscan() + '/address/' + userInfo?.execution_withdraw_address}
                target='_blank'
                rel='noreferrer'
                style={{ alignItems: 'center', textDecorationLine: 'underline' }}
                className='text-sm text-red-500'
              >
                {t('update_el_address_tip')}
                <LaunchIcon
                  sx={{ ml: 1 }}
                  style={{
                    fontSize: 18,
                    color: '#F24E1E',
                    display: 'inline-block',
                    verticalAlign: 'middle',
                  }}
                />
              </a>

              <div className='text-sm font-semibold mt-7'>{t('email')}</div>
              <div className='field'>
                <Box
                  sx={{
                    overflowX: 'scroll',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {userInfo?.email}
                </Box>

                <button
                  className='p-2 ml-auto rounded-md hover:bg-slate-100'
                  onClick={() => {
                    showModal(UpdateEmailModal, {
                      onInfoUpdate: () => {
                        delay(2000).then((ret) => {
                          // setRefreshKey(refreshKey + 1)
                        })
                      },
                    })
                  }}
                >
                  <Edit2 className='w-3 h-3' />
                </button>
              </div>

              <div className='flex items-center text-sm font-semibold mt-7'>
                {t('referral_or_link')}
                <ClickTooltipWithIcon
                  direction={'top'}
                  content={
                    <Box sx={{ width: '280px' }}>
                      <Box mb={3}>
                        <b>{t('step_1')}: </b>
                        {t('referral_step_1_desc')}
                      </Box>
                      <Box mb={3}>
                        <b>{t('step_2')}: </b> {t('referral_step_2_desc')}
                      </Box>
                      <Box>
                        <b>{t('step_3')}: </b>
                        {t('referral_step_3_desc')}
                      </Box>
                    </Box>
                  }
                />
                <Box
                  onClick={() => {
                    showModal(ReferralModal)
                  }}
                  sx={{
                    ml: 'auto',
                    color: '#18A0FB',
                    cursor: 'pointer',
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  {t('my_referrals')}
                </Box>
              </div>
              <div className='relative field'>
                <Box
                  sx={{
                    overflowX: 'scroll',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {ogUrl + '?invitation_code=' + userInfo?.invite_code}
                </Box>
                <CopyToClipboard
                  text={ogUrl + '?invitation_code=' + userInfo?.invite_code}
                  onCopy={() => {
                    toast.info(t('copied'))
                  }}
                >
                  <button className='absolute p-2 ml-auto bg-white rounded-md hover:bg-slate-100 right-1'>
                    <Copy className='w-3 h-3' />
                  </button>
                </CopyToClipboard>
              </div>
              <button
                className='text-red-500 border-red-300 btn-secondary mt-7'
                onClick={() => {
                  onLogOut()
                }}
              >
                {t('logout')}
              </button>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      ) : (
        <button
          onClick={() => {
            openConnectModal?.()
          }}
          className='bg-white btn-primary text-slate-900 hover:bg-slate-100'
        >
          {isLoggingIn && (
            <>
              <img src={getImage('loading')} alt='loading' width={20} height={20} className={'rotate'} />
            </>
          )}
          {!isLoggingIn && (
            <>
              {isMobile && !isHome && <img src={getImage('wallet-dark')} alt='wallet' width={18} height={18} />}
              {isMobile && isHome && <img src={getImage('wallet-dark')} alt='wallet' width={18} height={18} />}
              {!isMobile && t('login')}
            </>
          )}
        </button>
      )}
    </>
  )
}
