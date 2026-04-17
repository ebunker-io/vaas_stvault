import {useCallback, useEffect, useState} from 'react'
import {fetcher, getHost} from '../helpers/request'
import {useTranslation} from 'react-i18next'

export const useVerifyEmail = () => {
    const {i18n,t} = useTranslation()

    const verify = useCallback(
        async (captcha: string | undefined) => {
            if (!captcha) return
            return fetcher(t,`${getHost()}/apis/customers/verify_email_bind?code=${captcha}`, {
                method: 'GET',
                headers: new Headers({
                    'Content-Type': 'application/json',
                    'Accept-Language': i18n.language,
                }),
            })
        },
        []
    )

    return {verify}
}
