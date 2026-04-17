import {Box, Dialog, DialogProps, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow} from '@mui/material'
import React from 'react'
import {getImage} from '../../helpers/image'
import {useTranslation} from 'react-i18next'
import {useInvitation, useInvitations} from '../../hooks/useInvitation'
import BigNumber from 'bignumber.js'
import dayjs from 'dayjs'

interface ReferralModalProps extends DialogProps {}

export const ReferralModal = ({...props}: ReferralModalProps) => {
  const {t} = useTranslation()
  const {invitationInfo} = useInvitation()
  const {invitations} = useInvitations()

  const totalReward = new BigNumber(invitationInfo?.total_reward ?? 0).toFixed(4)
  const unclaimed = new BigNumber(invitationInfo?.unclaimed ?? 0).toFixed(4)

  const noData = !invitations || invitations?.length === 0

  // @ts-ignore
  return (
    <Dialog
      keepMounted
      {...props}
      transitionDuration={300}
      sx={{
        '.MuiPaper-root': {
          width: '780px',
          margin: '20px !important',
        },
        '& th': {
          minWidth: '88px',
        },
        '& .MuiTableHead-root th': {
          borderBottom: 'none !important',
        },
        '& .MuiTableHead-root th:first-child': {
          pl: 0,
        },
        '& .MuiTableBody-root td': {
          p: '20px !important',
        },
        '& .MuiTableBody-root th:first-child': {
          pl: 0,
        },
      }}
    >
      <Box sx={{p: {md: '46px 45px', xs: '46px 10px'}, position: 'relative'}}>
        <Box
          sx={{
            transform: 'rotate(45deg)',
            position: 'absolute',
            top: {md: '51px', xs: '30px'},
            right: {md: '52px', xs: '30px'},
            cursor: 'pointer',
          }}
          onClick={() => {
            // @ts-ignore
            props.onClose()
          }}
        >
          <img src={getImage('add')} alt='add' width={22} height={22} />
        </Box>
        <Stack
          direction={{md: 'row', xs: 'column'}}
          gap={{md: 0, xs: 4}}
          justifyContent={'space-between'}
          sx={{
            mb: {md: 6, xs: 2},
            px: '20px',
            mt: {md: 10, xs: 2},
          }}
        >
          <Box>
            <Box>{t('invitation_count')}</Box>
            <Box sx={{fontSize: {md: 40, xs: 26}, fontWeight: 500}}>{noData ? '-' : <>{invitationInfo?.total_invited ?? 0}</>}</Box>
          </Box>
          <Box>
            <Box>{t('rebate_incentive')}</Box>
            <Box sx={{fontSize: {md: 40, xs: 26}, fontWeight: 500}}>{noData ? '-' : <>{totalReward} ETH</>}</Box>
          </Box>
          <Box>
            <Box>{t('claimable_award')}</Box>
            <Box sx={{fontSize: {md: 40, xs: 26}, fontWeight: 500}}>{noData ? '-' : <>{unclaimed} ETH</>}</Box>
          </Box>
        </Stack>
        <Box sx={{px: 4}}>
          <TableContainer>
            <Table aria-label='simple table'>
              <TableHead>
                <TableRow>
                  <TableCell
                    align='left'
                    width={'36%'}
                    className={'no-border'}
                    sx={{
                      '& th': {
                        border: 'none',
                      },
                    }}
                  >
                    {t('invite_account')}
                  </TableCell>
                  <TableCell align='left' width={'40%'} className={'no-border'}>
                    {t('invite_time')}
                  </TableCell>
                  <TableCell align='left' width={'24%'} className={'no-border'}>
                    {t('commission')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <Box sx={{py: 2}} />
              {invitations && invitations.length > 0 && (
                <TableBody
                  sx={{
                    py: 1,
                    maxHeight: 270,
                    overflow: 'hidden',
                  }}
                >
                  {invitations &&
                    invitations?.map((invitation: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell width={'36%'} component='th' scope='row' align='left' sx={{fontSize: '13px', color: '#000', fontWeight: 300}}>
                          <Stack direction={'row'} alignItems={'center'} gap={2}>
                            <img src={getImage('invitation_account')} alt='invitation' width={22} height={22} />
                            <Box>{invitation?.address}</Box>
                          </Stack>
                        </TableCell>
                        <TableCell width={'40%'} component='th' scope='row' align='left' sx={{fontSize: '13px', color: '#000', fontWeight: 300}}>
                          <Box>{dayjs(invitation?.invite_time).format('DD/MM/YYYY HH:mm')}</Box>
                        </TableCell>
                        <TableCell width={'20%'} component='th' scope='row' align='left' sx={{fontSize: '13px', color: '#000', fontWeight: 300}}>
                          <Box>{new BigNumber(invitation?.amount ?? 0).toFixed(4)} ETH</Box>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              )}
            </Table>
          </TableContainer>
          {noData && (
            <Box sx={{textAlign: 'center', my: 10}}>
              <img src={getImage('no_record')} style={{margin: '10px auto'}} width={20} height={20} alt='' />
              <Box sx={{fontSize: 13, fontWeight: 600, textAlign: 'center'}}>{t('no_records')}</Box>
            </Box>
          )}
        </Box>
      </Box>
    </Dialog>
  )
}
