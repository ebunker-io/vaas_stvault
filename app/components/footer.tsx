import {Box, Container, Stack, Typography} from '@mui/material'
import Image from 'next/image'
import GithubImage from '../assets/images/github.png'
import TelegramImage from '../assets/images/telegram.png'
import IGithubImage from '../assets/images/index-github.svg'
import ITelegramImage from '../assets/images/index-telegram.png'
import {useWindowSize} from '../hooks'
import {getImage} from '../helpers/image'
import { t } from 'i18next'
import { useRouter } from 'next/router'

export const IndexFooter = ({isApp}: {isApp?: boolean}) => {
  const {width} = useWindowSize()
  const router = useRouter()
  const isMobile = width < 768
  return (
    <>
      {!isMobile ? (
        <Box
          sx={{
            py: 10,
            background: isApp ? '#fff' : 'none',
            '& p': {
              color: '#000',
              fontWeight: 300,
            },
          }}
        >
          <Container>
          <Stack direction={'row'}>
              <Stack direction={'column'} alignItems={'flex-start'} justifyContent={'space-between'} height={"117px"} spacing={2}>
                <Image src={getImage('logo')} width={173} height={20} alt={'logo'} />
                <Stack direction={'row'} spacing={1} alignItems={'center'}>
                  <Image src={getImage('email')} width={16} height={10} alt={'email'} />
                  <Box fontSize={14} fontWeight={500}>
                    support@ebunker.io
                  </Box>
                </Stack>
              </Stack>
              <Stack direction={'row'} spacing={7} ml={'auto'} alignItems={'center'}>
                <Stack className='cursor-pointer' direction={'column'} alignItems={'flex-start'} height={'100%'}>
                  <Box fontSize={16} fontWeight={700} color='#000000'>
                    {t('support_resources')}
                  </Box>
                  <Stack direction={'column'} spacing={2} mt={2}>
                    <a href='https://drive.google.com/drive/folders/14vKMIl1GFj-YhQ6GO46KCO5AnJoqK91e?usp=sharing' target='_blank' rel='noreferrer' className='flex items-center'>
                    <Box fontSize={14} fontWeight={500} sx={{cursor: 'pointer', alignItems:'center', '&:hover': { color: '#00000080'} ,color: '#00000060'}}>
                      {t('press_kit')}
                    </Box>
                    </a>
                    <a href='https://docs.ebunker.io' target='_blank' rel='noreferrer' className='flex items-center'>
                      <Box fontSize={14} fontWeight={500} sx={{cursor: 'pointer', alignItems:'center', '&:hover': { color: '#00000080'} ,color: '#00000060'}}>
                        {t('guide')}
                      </Box>
                    </a>
                    <Box onClick={() => router.push('/faq')} fontSize={14} fontWeight={500} sx={{cursor: 'pointer', alignItems:'center', '&:hover': { color: '#00000080'} ,color: '#00000060'}}>
                      {t('faq')}
                    </Box>
                  </Stack>
                  
                </Stack>
                <Stack className='cursor-pointer' direction={'column'} alignItems={'flex-start'} height={'100%'}>
                  <Box fontSize={16} fontWeight={700}>
                    {t('community')}
                  </Box>
                  <Stack direction={'column'} spacing={2} mt={2}>
                    <a href='https://discord.gg/nuvw6hmvnK' target='_blank' rel='noreferrer' className='flex items-center'>
                      <Box fontSize={14} fontWeight={500} sx={{cursor: 'pointer', alignItems:'center', '&:hover': { color: '#00000080'} ,color: '#00000060'}}>
                        {t('discord')}
                      </Box>
                    </a>
                    <a href='https://twitter.com/ebunker_eth' target='_blank' rel='noreferrer'>
                      <Box  fontSize={14} fontWeight={500} sx={{cursor: 'pointer', alignItems:'center', '&:hover': { color: '#00000080'} ,color: '#00000060'}}>
                        {t('x_com')}
                      </Box>
                    </a>
                    <a href='https://t.me/ebunkerio' target='_blank' rel='noreferrer'>
                      <Box fontSize={14} fontWeight={500} sx={{cursor: 'pointer', alignItems:'center', '&:hover': { color: '#00000080'} ,color: '#00000060'}}>
                        {t('telegram')}
                      </Box>
                    </a>
                  </Stack>
                </Stack>

                <Stack className='cursor-pointer' direction={'column'} alignItems={'flex-start'} height={'100%'}>
                  <Box fontSize={16} fontWeight={700} color='#000000'>
                    {t('legacy')}
                  </Box>
                  <Stack direction={'column'} spacing={2} mt={2} alignItems={'flex-start'} justifyContent={'flex-start'}>
                    <Box onClick={() => router.push('/service')} fontSize={14} fontWeight={500} sx={{cursor: 'pointer', alignItems:'center', '&:hover': { color: '#00000080'} ,color: '#00000060'}}>
                      {t('terms_of_service')}
                    </Box> 
                    <Box onClick={() => router.push('/privacy')} fontSize={14} fontWeight={500} sx={{cursor: 'pointer', alignItems:'center', '&:hover': { color: '#00000080'} ,color: '#00000060'}}>
                      {t('privacy_policy')}
                    </Box>
                  </Stack>
                </Stack>
              </Stack>
            </Stack>
            <Stack direction={'row'} sx={{borderTop: '1px solid #00000020', pt: 4, mt: 6}}>
              <Stack direction={'row'}>
                <Typography fontSize={14} fontWeight={500}>
                  © 2022 Ebunker
                </Typography>
                {/* <Typography fontSize={12} fontWeight={400}>
                  &nbsp;&nbsp; | &nbsp;&nbsp;
                </Typography>
                <Box onClick={() => router.push('/privacy')} fontSize={12} fontWeight={400} sx={{cursor: 'pointer', alignItems:'center', '&:hover': { color: '#18A0FB'}}}>
                  {t('privacy_policy')}
                </Box>
                <Typography fontSize={12} fontWeight={400}>
                  &nbsp;&nbsp; | &nbsp;&nbsp;
                </Typography>
                <Box onClick={() => router.push('/service')} fontSize={12} fontWeight={400} sx={{cursor: 'pointer', alignItems:'center', '&:hover': { color: '#18A0FB'}}}>
                  {t('terms_of_service')}
                </Box> */}
              </Stack>
              {/* <Stack direction={'row'} spacing={7} ml={'auto'} alignItems={'center'}>
                <a href='https://discord.gg/nuvw6hmvnK' target='_blank' rel='noreferrer'>
                  <Image src={getImage('discord')} width={30} height={26} alt={'discord'} />
                </a>
                <a href='https://twitter.com/ebunker_eth' target='_blank' rel='noreferrer'>
                  <Image src={getImage('twitter')} width={26} height={26} alt={'discord'} />
                </a>
                <a href='https://t.me/ebunkerio' target='_blank' rel='noreferrer'>
                  <Image src={getImage('telegram')} width={26} height={26} alt={'discord'} />
                </a>
                <a href='mailto:support@ebunker.io' target='_blank' rel='noreferrer'>
                  <Image src={getImage('email')} width={28} height={18} alt={'email'} />
                </a>
              </Stack> */}
            </Stack>
          </Container>
        </Box>
      ) : (
        <></>
      )}
    </>
  )
}

export const Footer = () => {
  return (
    <Box
      sx={{
        background: '#000516',
        mt: 35,
        pt: 6,
        '& p': {
          color: '#7f7a87',
          fontSize: 12,
        },
      }}
    >
      <Container>
        <Stack direction={'row'}>
          <Box>
            <Typography>Privacy policy | Terms of Use</Typography>
            <Typography>Cookie policy | License Agreement</Typography>
          </Box>
          <Stack direction={'row'} spacing={4} ml={'auto'}>
            <a href='https://discord.gg/nuvw6hmvnK' target='_blank' rel='noreferrer'>
              <Image src={getImage('discord')} width={32} height={29} alt={'discord'} />
            </a>
            <a href='https://twitter.com/ebunker_eth' target='_blank' rel='noreferrer'>
              <Image src={getImage('twitter')} width={29} height={29} alt={'discord'} />
            </a>
            <a href='https://t.me/ebunkerio' target='_blank' rel='noreferrer'>
              <Image src={getImage('telegram')} width={29} height={29} alt={'discord'} />
            </a>
            {/*<a href='https://github.com/ebunker-io/ebunker-contracts-public' target='_blank' rel='noreferrer'>*/}
            {/*  <Image src={GithubImage.src} width={29} height={29} alt={'github'} />*/}
            {/*</a>*/}
            <a href='mailto:support@ebunker.io' target='_blank' rel='noreferrer'>
              <Image src={getImage('email')} width={28} height={18} alt={'email'} />
            </a>
          </Stack>
        </Stack>
      </Container>
      <Box
        sx={{
          height: '1px',
          background: '#6465681a',
          width: '100%',
          padding: '0 60px',
          marginTop: '60px',
        }}
      />
      <Box py={4}>
        <Typography textAlign={'center'}>© All rights reserved</Typography>
        <Typography textAlign={'center'}>This site is protected by reCAPTCHA and the Google Privacy Policy and Terms of Service apply.</Typography>
      </Box>
    </Box>
  )
}
