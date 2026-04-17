import {useCallback} from 'react'
import {fetcher, getHost} from '../helpers/request'
import {useTranslation} from 'react-i18next'

export const useFetchCaptcha = () => {
    const {i18n,t} = useTranslation()
    return useCallback(async (address: string | undefined) => {
        if (!address) return

        return fetcher(t,`${getHost()}/apis/captchas`, {
            method: 'POST',
            headers: new Headers({
                'Content-Type': 'application/json',
                'Accept-Language': i18n.language,
            }),
            body: JSON.stringify({
                address: address,
            }),
        })
    }, [])
}
