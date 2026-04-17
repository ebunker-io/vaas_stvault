import { Box, MenuItem, Stack, Typography } from '@mui/material'
import { useRouter } from 'next/router'
import LogoImage from '../assets/images/logo.png'
import LogoWhiteImage from '../assets/images/logo-white.png'
import Image from 'next/image'
import { LoginConnector } from './connector'
import { AppLanguageStyledMenu, LanguageStyledMenu } from './style'
import { useState, Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { getImage } from '../helpers/image'
import { useWindowSize } from '../hooks'
import Head from 'next/head'

const Sidebar = () => {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const pathname = router.pathname

  const links = [
    {
      name: 'Stake',
      url: '/stVaults',
    },
    {
      name: 'Guide',
      url: i18n.language === 'en' ? 'https://docs.ebunker.io/docs/introduction' : 'https://docs.ebunker.io/zh/docs/introduction/',
      external: true,
    },
    {
      name: 'Validator Queue',
      url: 'https://www.validatorqueue.com',
      external: true,
    },
  ]

  return (
    <Box
      sx={{
        height: '100vh',
        width: 164,
        background: '#ccff00',
        position: 'fixed',
        top: 0,
        left: 0,
        transform: open ? 'translateX(0)' : 'translateX(-164px)',
        p: 6,
      }}
    >
      <Stack
        direction={'column'}
        spacing={4}
        sx={{
          height: '100%',
          '& .nav-item': { borderBottom: '1px solid transparent' },
          '& .nav-item:hover': { borderBottom: '1px solid #000' },
          '& .active': { borderBottom: '1px solid #000' },
          '& a, & div': { fontSize: 13, fontWeight: 400 },
        }}
      >
        {links.map((link) => (
          <Box key={link.url}>
            {link.external ? (
              <Box sx={{ cursor: 'pointer' }} color={'#000'} className={'nav-item'}>
                <a href={link.url} target='_blank' rel='noreferrer'>
                  {t(link.name)}
                </a>
              </Box>
            ) : (
              <Box
                onClick={() => router.push(link.url)}
                sx={{ cursor: 'pointer' }}
                color={'#000'}
                className={pathname?.includes(link.url) ? 'active nav-item' : 'nav-item'}
              >
                {t(link.name)}
              </Box>
            )}
          </Box>
        ))}

        <Stack direction={'row'} spacing={3} mt={'auto'} sx={{ marginTop: 'auto !important' }} alignItems={'center'}>
          <a href='https://t.me/ebunkerio' target='_blank' rel='noreferrer'>
            <Image src={getImage('telegram')} width={15} height={15} alt={'telegram'} />
          </a>
          <a href='mailto:support@ebunker.io' target='_blank' rel='noreferrer'>
            <Image src={getImage('email')} width={18} height={15} alt={'email'} />
          </a>
        </Stack>
        <Typography fontSize={12} fontWeight={400}>
          © 2022 Ebunker
        </Typography>
      </Stack>
      <Stack
        sx={{
          width: 39,
          height: 39,
          alignItems: 'center',
          justifyContent: 'center',
          position: 'absolute',
          bottom: '170px',
          right: '-39px',
          background: '#ccff00',
          display: { md: 'none', xs: 'flex' },
        }}
      >
        {open && <img src={getImage('close')} alt='' width={18} height={14} onClick={() => setOpen(false)} />}
        {!open && <img src={getImage('menu')} alt='' width={18} height={14} onClick={() => setOpen(true)} />}
      </Stack>
    </Box>
  )
}

export const Header = ({ variant = 'default' }: { variant?: 'default' | 'app' }) => {
  const router = useRouter()
  const pathname = router.pathname
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)
  const handleClick = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget)
  const handleClose = () => setAnchorEl(null)
  const { t, i18n } = useTranslation()
  const { width } = useWindowSize()
  const isMobile = width < 768

  const currentLanguage = () => (i18n.language === 'en' ? 'EN' : '中文')

  const links = [
    {
      name: 'Stake',
      url: '/stVaults',
      menu: '/stVaults',
    },
    {
      name: 'Guide',
      url: i18n.language === 'en' ? 'https://docs.ebunker.io/docs/introduction/' : 'https://docs.ebunker.io/zh/docs/introduction/',
      external: true,
      menu: '/guide',
    },
    {
      name: 'Validator Queue',
      url: 'https://www.validatorqueue.com',
      external: true,
      menu: '/validator-queue',
    },
  ]

  const isApp = variant === 'app'
  const navColor = isApp ? '#000' : '#CCFF00'
  const hoverBorderColor = isApp ? '#000' : '#ccff00'
  const activeBorderColor = isApp ? '#000' : '#CCFF00'
  const headerBackground = isApp ? 'rgba(255, 255, 255)' : 'rgba(0, 0, 0, .9)'
  const headerBorderBottom = isApp ? '1px solid #CCCCCC' : 'none'
  const headerBackdropFilter = isApp ? 'none' : 'blur(10px)'
  const logoImage = isApp ? LogoWhiteImage : LogoImage
  const logoClickHandler = () => router.push('/stVaults')
  const languageColor = isApp ? undefined : '#ccff00'
  const LanguageMenu = isApp ? AppLanguageStyledMenu : LanguageStyledMenu
  const showSocialIcons = !isApp
  const showCanonicalLinks = !isApp
  const pxValue = isApp ? { md: 0, xs: 3 } : { md: 3, xs: 3 }

  return (
    <>
      {showCanonicalLinks && (
        <Head>
          <link rel='canonical' href='https://docs.ebunker.io/docs/introduction/' />
        </Head>
      )}
      <Stack
        direction={'row'}
        alignItems={'center'}
        sx={{
          position: 'fixed',
          width: '100%',
          zIndex: 1000,
          top: 0,
          background: headerBackground,
          backdropFilter: headerBackdropFilter,
          borderBottom: headerBorderBottom,
          height: '65px',
        }}
      >
        <Sidebar />
        <Box
          sx={{
            width: '1300px',
            maxWidth: '100%',
            margin: '0 auto',
            px: pxValue,
          }}
        >
          <Stack direction={'row'} alignItems={'center'}>
            <Box onClick={logoClickHandler} sx={{ cursor: 'pointer' }} height={isMobile ? 40 : 48}>
              <Image src={logoImage.src} width={isMobile ? 130 : 159} height={isMobile ? 40 : 48} alt={'logo'} />
            </Box>
            <Stack
              direction={'row'}
              alignItems={'center'}
              ml={11}
              spacing={6}
              sx={{
                '& .nav-item': { borderBottom: '1px solid transparent' },
                '& .nav-item:hover': { borderBottom: `1px solid ${hoverBorderColor}` },
                '& .active': { borderBottom: `1px solid ${activeBorderColor}` },
                '& a, & div': { fontSize: 15 },
              }}
            >
              {!isMobile && (
                <>
                  {links.map((link) => (
                    <Fragment key={link.url || link.name}>
                      {link.external ? (
                        <Box sx={{ cursor: 'pointer' }} color={navColor} className={'nav-item'}>
                          <a href={link.url} target='_blank' rel='noreferrer'>
                            {t(link.name)}
                          </a>
                        </Box>
                      ) : (
                        <Box
                          onClick={() => router.push(link.url)}
                          sx={{ cursor: 'pointer' }}
                          color={navColor}
                          className={pathname?.includes(link.menu) ? 'active nav-item' : 'nav-item'}
                        >
                          {t(link.name)}
                        </Box>
                      )}
                    </Fragment>
                  ))}
                </>
              )}
            </Stack>
            <Stack ml={'auto'} direction={'row'} spacing={4} alignItems={'center'}>
              {showSocialIcons && (
                <Stack
                  direction={'row'}
                  spacing={4}
                  ml={'auto'}
                  alignItems={'center'}
                  sx={{
                    height: '20px',
                    a: { height: '20px', display: 'inline-block' },
                    display: { md: 'block', xs: 'none' },
                  }}
                >
                  <a href='https://t.me/ebunkerio' target='_blank' rel='noreferrer'>
                    <Image src={getImage('telegram-white')} width={21} height={20} alt={'telegram'} />
                  </a>
                </Stack>
              )}
              <Box onClick={handleClick} sx={{ cursor: 'pointer', color: languageColor, fontSize: { sm: '10px', md: '16px' } }}>
                <span className='md:text-[16px] text-[12px]'>{currentLanguage()}</span>
              </Box>
              <LanguageMenu anchorEl={anchorEl} open={open} onClose={handleClose}>
                <MenuItem
                  onClick={() => {
                    i18n.changeLanguage('en')
                    handleClose()
                  }}
                  disableRipple
                >
                  EN
                  {i18n.language === 'en' && (
                    <Box ml={'auto'}>
                      <img src={getImage('selected')} alt='selected' width={18} height={18} />
                    </Box>
                  )}
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    i18n.changeLanguage('zh')
                    handleClose()
                  }}
                  disableRipple
                >
                  中文
                  {i18n.language === 'zh' && (
                    <Box ml={'auto'}>
                      <img src={getImage('selected')} alt='selected' width={18} height={18} />
                    </Box>
                  )}
                </MenuItem>
              </LanguageMenu>
              <LoginConnector isApp={isApp} />
            </Stack>
          </Stack>
        </Box>
      </Stack>
    </>
  )
}

export const AppHeader = () => <Header variant='app' />
