import {
  Box,
  Button,
  Dialog,
  TextField,
  DialogProps,
  DialogTitle,
  Stack,
  Typography,
  InputBase,
} from '@mui/material'
import React, {useState} from 'react'
import Image from 'next/image'
import {getImage} from '../../helpers/image'
import {ellipseAddress} from '../../helpers/display'
import {toast} from 'react-toastify'
import {useTranslation} from 'react-i18next'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import LaunchIcon from '@mui/icons-material/Launch';
import {useModal} from 'mui-modal-provider'
import {useSignAddress} from '../../hooks/useUpdateElRewardAddress'
import {getEtherscan} from "../../helpers/request";
import { useAccount } from 'wagmi'
import { useGetInfo } from '../../hooks/useInfo'

interface UpdateExecutionWithdrawAddressModalProps extends DialogProps {
  onInfoUpdate:any

}
interface UpdateAddressModalModalProps extends DialogProps {
  title: string
  message: string
  onConfirm: any
  loading:boolean
}

const UpdateExecutionWithdrawAddressModal = ({onInfoUpdate, ...props}: UpdateExecutionWithdrawAddressModalProps): JSX.Element => {
  const {t} = useTranslation()
  const [elAddress, setElAddress] = useState('')
  const [confirm, setConfirm] = useState(true)
  const {updateElRewardAddress} = useSignAddress()
  const {showModal} = useModal()
  const {address} = useAccount()
  const [isLoading,setIsLoading] =useState(false)
  const { userInfo } = useGetInfo()


  const handleClickOk = () => {
    if(elAddress.length != 42 ||  elAddress.substring(0,2) !== '0x'){
      // console.log(elAddress.length,elAddress.substring(0,2),elAddress)
      toast.error(t('el_address_error'))
      return
    }
    if(address?.toLowerCase() !== (userInfo?.reward_address)?.toLowerCase()){
      toast.error(t('error_address_tip_1') + ellipseAddress(address, 6) + ', ' + t('error_address_tip_2') + ellipseAddress(userInfo?.reward_address, 6) + t('error_address_tip_3'))
      return
    }
    showModal(UpdateAddressModal, {
    title: t('notice'),
    message: t('sign_message_tip'),
    onConfirm: async () => {
      showModal(UpdateAddressModal, {
        title: t('notice'),
        message: t('sign_message_tip'),
        onConfirm:null,
        loading:true
      })
      await updateElRewardAddress(elAddress)
      onInfoUpdate()
      // @ts-ignore
      props.onClose()
    },
    loading:false
  })
  }


  const handleAddressChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    setElAddress(event.target.value)
    if(event.target.value === ''){
      setConfirm(true)
    }
    else{
      setConfirm(false)
    }
  }

  return (
    <Dialog keepMounted {...props} transitionDuration={300}
    sx={{
      '.MuiPaper-root': {
        minWidth: {md: '746px', xs: '360px'}
      },
    }}>
      <Box sx={{p: 6}}>
        <Box textAlign={'center'}>
          <ErrorOutlineIcon width={24} height={24}/>
        </Box>
        <Box fontSize={20} fontWeight={600} textAlign={'center'} mb={6}>
          {t('el_claim_address')}
        </Box>
        <Stack spacing={2} direction={'column'}>
          <Stack sx={{border: '1px solid #000', borderRadius: '6px', height: 52, px: 4, alignItems: 'center'}} direction={'row'}>
            <InputBase onChange={handleAddressChanged} sx={{width: '100%'}} />
          </Stack>

          <Stack direction={'row'} justifyContent={'center'} alignItems={'center'} color={'#F24E1E'}>
          <a href={getEtherscan() + '/address/' + elAddress} target='_blank' rel='noreferrer' style={{alignItems: 'center',fontSize:'13px',fontWeight:'500' }}>
            {t('update_el_address_tip')}
            <LaunchIcon sx={{ml:1}} style={{fontSize: 18, color:'#F24E1E', display: 'inline-block',verticalAlign:'middle'}} />
            </a>
          </Stack>

          <Box my={8} mt={'35px'}/>
          <Stack direction={'row'} alignItems={'center'} justifyContent={'center'} spacing={4}>
            <Button
            className={'btn-prev'}
            onClick={() => {
              // @ts-ignore
              props.onClose()
          }}>
              {t('discard')}
            </Button>
            <Button className={'btn-next'}
            disabled={confirm}
            onClick={()=>{
              handleClickOk()
              }}>
              {t('confirm')}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Dialog>
  )
}

const UpdateAddressModal = ({ title, message,onConfirm, loading, ...props }: UpdateAddressModalModalProps): JSX.Element => {
  return (
    <Dialog keepMounted {...props} transitionDuration={300}
    sx={{
      '.MuiPaper-root': {
        minWidth: {md: '746px', xs: '360px'}
      },
      }}>
      <Box sx={{ p: 6 }}>
        <Box textAlign={'center'}>
          <ErrorOutlineIcon width={24} height={24}/>
        </Box>
        <Box fontSize={20} fontWeight={600} textAlign={'center'} mb={6}>
            {title}
        </Box>
        <Typography fontSize={14} fontWeight={'medium'} textAlign={'center'} my={4}>
          {message}
        </Typography>
        {!loading && <Stack direction={'row'} justifyContent={'center'} spacing={4} my={4} mt={'38px'}>
        <Button
            className={'btn-next'}
            onClick={() => {
              onConfirm()
              // @ts-ignore
              props.onClose()
            }}
          >
            OK
          </Button>
        </Stack>}
        {loading &&<Stack direction={'row'} justifyContent={'center'} spacing={4} my={4} mt={'60px'}>
          <img className={'loading'} src={getImage('loading')} alt='' width={18} height={18} />
        </Stack>}
      </Box>
    </Dialog>
  )
}

export {UpdateExecutionWithdrawAddressModal,UpdateAddressModal}
