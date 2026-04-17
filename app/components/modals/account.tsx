import {
    Box,
    Button,
    Dialog,
    TextField,
    DialogProps,
    DialogTitle,
    Stack,
    Typography,
    Grid,
    TableHead,
    Table,
    TableBody,
    TableRow,
    TableCell,
    InputBase, CircularProgress,
} from '@mui/material'
import React, {useState} from 'react'
import Image from 'next/image'
import {getImage} from '../../helpers/image'
import {ellipseAddress} from '../../helpers/display'
import {useVerifyEmail} from '../../hooks/useVerifyEmail'
import {useFetchEmailCaptcha} from '../../hooks/useFetchEmailCaptcha'
import {toast} from 'react-toastify'
import {useTranslation} from 'react-i18next'
import { LoadingButton } from '@mui/lab'

interface UpdateEmailModalProps extends DialogProps {
    onInfoUpdate: any
}

const ModalTitle = ({title, icon}: { title: string; icon: string }) => {
    return (
        <Stack direction={'row'} alignItems={'center'} mb={4} justifyContent={'center'} spacing={2}>
            <Image src={getImage(icon)} width={30} height={30} alt={'title'}/>
            <Typography fontSize={24}>{title}</Typography>
        </Stack>
    )
}

const UpdateEmailModal = ({onInfoUpdate, ...props}: UpdateEmailModalProps): JSX.Element => {
    const {t} = useTranslation()
    const [isShowCode, setIsShowCode] = useState(false)
    const [isShowSend, setShowSend] = useState(true)
    const [email, setEmail] = useState('')
    const [emailError, setEmailError] = useState(false)
    const [emailHelpText, setEmailHelpText] = useState('')
    const [code, setCode] = useState('')
    const [codeError, setCodeError] = useState(false)
    const [time, setTime] = useState(60)
    const [codeHelpText, setCodeHelpText] = useState('')
    const fetchEmailCaptcha = useFetchEmailCaptcha()
    const {verify} = useVerifyEmail()
    const [isSending,setIsSending] =useState(false)

    const handleClickSend = () => {
        const email_error = t("email_empty")
        if (email == '') {
            setEmailError(true)
            setEmailHelpText(email_error)
            return
        }
        setEmailError(false)
        setEmailHelpText('')
        setShowSend(false)
        fetchEmailCaptcha(email).then((res) => {
            emailTime()
            setIsShowCode(true)
            toast.success(t('send_success'))
        }).catch(reason => {
            setEmailHelpText(reason.message)
            setShowSend(true)
            toast.error(t('reason.message'))
        })
    }

    const handleClickOk = () => {
        setIsSending(true)
        const empty_code = t("empty_code")
        const wrong_code = t("wrong_code")
        if (email == '' || code == '') {
            setCodeError(true)
            setCodeHelpText(empty_code)
            setIsSending(false)
            return
        }
        verify(code)
            .then((res) => {
                setCodeError(false)
                setCodeHelpText('')
                toast.success(t('success'))
                onInfoUpdate()
                setIsSending(false)
                // @ts-ignore
                props?.onClose()
            })
            .catch((e) => {
                setIsSending(false)
                setCodeError(true)
                setCodeHelpText(e.message)
                toast.error(e.message)
                console.log(e)
            })
    }

    const emailTime = async () => {
        if (!isShowSend) {
            // 倒计时未结束,不能重复点击
            return
        }
        setShowSend(false)
        // 倒计时
        const active = setInterval(() => {
            setTime((preSecond) => {
                if (preSecond <= 1) {
                    setShowSend(true)
                    clearInterval(active)
                    // 重置秒数
                    return 60
                }
                return preSecond - 1
            })
        }, 1000)
    }

    const handleEmailChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(event.target.value)
    }
    const handleCodeChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
        setCode(event.target.value)
    }

    return (
        <Dialog keepMounted {...props} transitionDuration={300}>
            <Box sx={{p: 6}}>
                <Box fontSize={20} fontWeight={600} textAlign={'center'} mb={6}>
                    {t('email_verification')}
                </Box>
                <Stack spacing={2} direction={'column'}>
                    <Stack direction={'row'} alignItems={'center'}>
                        <Typography fontSize={15} fontWeight={600}>
                            {t('email')}
                        </Typography>
                        <Box color={'red'} fontSize={12} ml={2}>
                            {emailHelpText}
                        </Box>
                    </Stack>
                    <Stack sx={{border: '1px solid #000', borderRadius: '6px', height: 52, px: 4, alignItems: 'center'}}
                           direction={'row'}>
                        <InputBase onChange={handleEmailChanged} error={emailError} sx={{width: '100%'}}/>
                    </Stack>

                    <Stack direction={'row'} alignItems={'center'}>
                        <Typography fontSize={15} fontWeight={600}>
                            {t('verification_code')}
                        </Typography>
                        <Box color={'red'} fontSize={12} ml={2}>
                            {codeHelpText}
                        </Box>
                    </Stack>
                    <Stack sx={{border: '1px solid #000', borderRadius: '6px', height: 52, px: 4, alignItems: 'center'}}
                           direction={'row'} mb={8}>
                        <InputBase onChange={handleCodeChanged} error={codeError} sx={{width: '100%'}}/>
                    </Stack>

                    <Box my={8}/>
                    <Stack direction={'row'} alignItems={'center'} justifyContent={'center'} spacing={4}
                           sx={{marginTop: '20px'}}>
                        {isShowSend && (
                            <Button className={'btn-prev'} onClick={handleClickSend}>
                                {t('send_email_code')}
                            </Button>
                        )}
                        {!isShowSend && (
                            <Button className={'btn-prev'} disabled>
                                {time}s
                            </Button>
                        )}
                        {/* <Button className={'btn-next'} disabled={!isShowCode} onClick={handleClickOk}>
                            {t('confirm_email')}
                        </Button> */}
                        <LoadingButton
                        className={'btn-next'}
                        variant={'contained'}
                        endIcon={<Box/>}
                        loadingIndicator={(<CircularProgress size={16} color={'info'} disableShrink={true}/>)}
                        loading={isSending}
                        disabled={!isShowCode}
                        loadingPosition="end"
                        onClick={handleClickOk}>
                          <span>{t('confirm_email')}</span>
                      </LoadingButton>
                    </Stack>
                </Stack>
            </Box>
        </Dialog>
    )
}

export {UpdateEmailModal}
