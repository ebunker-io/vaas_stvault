import { ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { Header } from './header'

import { Box, Button, Container, Stack } from '@mui/material'
import { IndexFooter } from './footer'
import Image from 'next/image'
import { getImage } from '../helpers/image'
import { useAccount, useConnect } from 'wagmi'
import { useWindowSize } from '../hooks'
import { useRouter } from 'next/router'
import { useTranslation } from 'react-i18next'
import { useModal } from 'mui-modal-provider' 
import ITelegramImage from '../assets/images/index-telegram.png'
import IGithubImage from '../assets/images/index-github.svg'
import { AuthContext } from "../providers/auth";
import { Loader2 } from 'lucide-react' 
import { t } from 'i18next'
import { useConnectModal } from '@rainbow-me/rainbowkit'

export const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        overflowX: "hidden"
      }}
      className="relative"
    >
      <Header />
      <Box className=" w-full flex items-center justify-center bg-[#ccff00] text-black fixed top-[65px] h-[32px] text-[14px] z-10" >
        {t("New users enjoy 100% commission free for the first month.")}
      </Box>
      {children}
    </Box>
  )
}

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const router = useRouter()
  const pathname = router.pathname as any
  const { address, isConnected, isConnecting } = useAccount()
  const {  isLoggedIn, isLoggingIn } = useContext(AuthContext)
  const { width } = useWindowSize()
  const isMobile = width < 768
  const [logging, setLogging] = useState(false)
  const loading = logging || isLoggingIn
  const { openConnectModal } = useConnectModal()

  const shouldCheckPage = useMemo(() => true, [pathname])
  const { t } = useTranslation()

 

  useEffect(() => {
    if (isLoggedIn) {
      setLogging(false)
    }
    if (!isLoggingIn) {
      setLogging(false)
    }
  }, [isLoggedIn, isLoggingIn])

  const { showModal } = useModal()

  const showXsFooter = router.pathname.includes('stake')

  // useEffect(()=>{
  //   console.log('isLoggedIn',isLoggedIn, isConnected,shouldCheckPage)
  // },[isLoggedIn, isConnected,shouldCheckPage])

  return (
    <Box
      sx={{
        background: '#f5f5f5',
        minHeight: '100vh',
        width: "100%",
        overflowX: 'hidden',
        pt: '65px',
      }}
    >
      <Header variant="app" />
      <Stack sx={{ minHeight: 'calc(100vh - 65px)',width: "100%" }}>
        {!isLoggedIn && shouldCheckPage && (
          <Stack alignItems={'center'} sx={{ height: 'calc(100vh - 65px)' }} justifyContent={'center'}>
            <Stack alignItems={'center'} justifyContent={'center'} sx={{ cursor: 'pointer' }} py={16}>
              <Stack
                alignItems={'center'}
                justifyContent={'center'}
                sx={{
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, .2)',
                  height: '300px',
                  maxWidth: '100%',
                }}
              >
                <Image src={getImage('wallet')} alt={'login'} width={isMobile ? 42 : 62} height={isMobile ? 42 : 63} />
                <Box mt={8} fontSize={{ md: 25, xs: 15 }} fontWeight={600} mb={10}>
                  {t('web3_login')}
                </Box>
                <button className={'bg-neutral-900 text-white rounded-md px-4 h-10 flex-shrink-0 flex items-center gap-1'}
                  onClick={() => {
                    setLogging(true)
                    openConnectModal?.()
                  }}>
                  <>
                    {t('login')}
                    {loading && <Loader2 className='w-4 h-4 animate-spin'/>}
                  </>
                </button>
                <Box
                  sx={{
                    mt: 20,
                    width: { md: '730px', xs: '320px' },
                    maxWidth: '100%',
                    background: '#fff',
                    borderRadius: '5px',
                    fontSize: { md: 15, xs: 12 },
                    fontWeight: 400,
                    px: { md: 12, xs: 6 },
                    py: 6,
                  }}
                >
                  <Box fontWeight={700} mb={1}>
                    {t('note')}:
                  </Box>
                  {t('login_desc')}
                </Box>
              </Stack>
            </Stack>
          </Stack>
        )}
        {!isConnected && isLoggedIn && shouldCheckPage && (
          <Stack alignItems={'center'} sx={{ height: 'calc(100vh - 65px)' }} justifyContent={'center'}>
            <Stack alignItems={'center'} justifyContent={'center'} sx={{ cursor: 'pointer' }} py={16}>
              <Stack
                alignItems={'center'}
                justifyContent={'center'}
                sx={{
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, .2)',
                  height: '300px',
                  maxWidth: '100%',
                }}
              >
                <Image src={getImage('wallet')} alt={'login'} width={isMobile ? 42 : 62} height={isMobile ? 42 : 63} />
                <Box mt={8} fontSize={{ md: 25, xs: 15 }} fontWeight={600} mb={10}>
                  {t('web3_login')}
                </Box>
                <button className={'bg-neutral-900 text-white rounded-md px-4 h-10 flex-shrink-0 flex items-center gap-1'}
                  onClick={() => {
                    openConnectModal?.()
                  }}
                  disabled={isConnecting}>
                  <>
                    {t('connect_wallet')}
                    {isConnecting && (
                      <Loader2 className='w-4 h-4 animate-spin'/>
                      )}
                  </>
                </button>
                <Box
                  sx={{
                    mt: 20,
                    width: { md: '730px', xs: '320px' },
                    maxWidth: '100%',
                    background: '#fff',
                    borderRadius: '5px',
                    fontSize: { md: 15, xs: 12 },
                    fontWeight: 400,
                    px: { md: 12, xs: 6 },
                    py: 6,
                  }}
                >
                  <Box fontWeight={700} mb={1}>
                    {t('note')}:
                  </Box>
                  {t('login_desc')}
                </Box>
              </Stack>
            </Stack>
          </Stack>
        )}
        {((isLoggedIn && isConnected)|| !shouldCheckPage) && children}
        {showXsFooter && (
          <Box sx={{ background: '#fff', display: 'flex', alignItems: 'center', mt: 'auto' }}>
            <Container>
              <Stack
                direction={'row'}
                alignItems={'center'}
                justifyContent={'space-between'}
                sx={{
                  height: '38px',
                }}
              >
                <Box sx={{ fontSize: 12, color: '#555' }}>© 2022 Ebunker</Box>
                <Stack direction={'row'} alignItems={'center'}>
                  <Box
                    className={'f-pop'}
                    sx={{
                      mr: 2,
                      fontSize: '12px',
                      fontWeight: 400,
                      color: '#555555',
                    }}
                  >
                    Audited by
                  </Box>
                  <a
                    href='https://github.com/ebunker-io/ebunker-contracts-public/blob/d63fbff0416660ae9fb63e4e12aeb66e5834fcb3/assets/SlowMist_Audit_Report-Ebunker_ETH2_Deposit.pdf'
                    target={'_blank'}
                    rel='noreferrer'
                    style={{ height: 20 }}
                  >
                    <img src={getImage('slowmist-dark')} alt='slowmist' height={12} width={'auto'} />
                  </a>
                </Stack>
                <Box>
                  <Stack direction={'row'} spacing={4} ml={'auto'} alignItems={'center'}>
                    <a href='mailto:support@ebunker.io' target='_blank' rel='noreferrer'>
                      <Image src={getImage('email')} width={18} height={12} alt={'email'} />
                    </a>
                    {/*<a href='https://t.me/+3QMuSWSA8KdlODll' target='_blank' rel='noreferrer' style={{display: 'inline-block', height: '23px'}}>*/}
                    {/*  <Image src={IDiscordImage.src} width={31} height={23} alt={'discord'} />*/}
                    {/*</a>*/}
                    {/*<Image src={ITwitterImage.src} width={31} height={25} alt={'twitter'} />*/}
                    <a href='https://t.me/ebunkerio' target='_blank' rel='noreferrer'>
                      <Image src={ITelegramImage.src} width={14} height={14} alt={'telegram'} />
                    </a>
                    <a href='https://github.com/ebunker-io/ebunker-contracts-public' target='_blank' rel='noreferrer'>
                      <Image src={IGithubImage.src} width={14} height={14} alt={'github'} />
                    </a>
                  </Stack>
                </Box>
              </Stack>
            </Container>
          </Box>
        )}
      </Stack>
      {/*<Footer />*/}
    </Box>
  )
}

