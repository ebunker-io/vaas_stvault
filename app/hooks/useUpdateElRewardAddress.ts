import {useCallback} from 'react'
import {useSignMessage} from 'wagmi'
import {fetcher, getHost} from '../helpers/request'
import {toast} from 'react-toastify'
import {useTranslation} from "react-i18next";

export const useSignAddress = () => {
    const {t, i18n} = useTranslation()
    const requestUpdateRewardAddress = useCallback((address: string, signedData: any, captcha: any) => {
        return fetcher(t, `${getHost()}/apis/customers/reward_address`, {
            method: 'POST',
            headers: new Headers({
                'Content-Type': 'application/json',
            }),
            body: JSON.stringify({
                captcha,
                sign: signedData,
                kind: "execution",
                address: address,
            }),
        }).then((value) => {
            toast.success(value)
        }).catch(reason => {
            toast.error(reason.message)
        })
    }, [])

    const fetchSignCode = useCallback(async (address: string) => {
        return fetcher(t, `${getHost()}/apis/captchas/bind_withdraw_address`, {
            method: 'POST',
            headers: new Headers({
                'Content-Type': 'application/json',
                'Accept-Language': i18n.language,
            }),
            body: JSON.stringify({address, kind: 'execution'}),
        })
    }, [])
    const {signMessageAsync} = useSignMessage()

    //todo handle error
    const updateElRewardAddress = useCallback(
        async (address: string) => {
            try {
                const ret = await fetchSignCode(address)
                const signedData = await signMessageAsync({message: ret.code})
                await requestUpdateRewardAddress(address, signedData, ret.code)
            } catch (e) {
                if (e instanceof Error) {
                    toast.error(e.message)
                }else{
                    toast.error(t('page_error'))
                }
            }

        }, []
    )
    return {updateElRewardAddress}
}
