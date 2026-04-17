import {useCallback} from 'react'
import {fetcher, getHost} from '../helpers/request'
import {useTranslation} from 'react-i18next'

export const useFetchEmailCaptcha = () => {
    const {i18n, t} = useTranslation()
    return useCallback(async (email: string | undefined) => {
        if (!email) return

        return fetcher(t, `${getHost()}/apis/captchas/bind_email`, {
            method: 'POST',
            headers: new Headers({
                'Content-Type': 'application/json',
                'Accept-Language': i18n.language,
            }),
            body: JSON.stringify({
                email: email,
            }),
        })
    }, [])
}
