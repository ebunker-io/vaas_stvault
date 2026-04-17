import {fetcher, getHost} from '../helpers/request'
import {useTranslation} from 'react-i18next'
import {useAccount} from 'wagmi'
import {useEffect, useState} from 'react'
import useInterval from './index'

export const useInvitation = () => {
    const {i18n, t} = useTranslation()
    const {address} = useAccount()
    const key = `${getHost()}/apis/invite/customer/info`
    const [token, setToken] = useState('')

    const [invitationInfo, setInvitationInfo] = useState<any>()

    useInterval(
        () => {
            const t = localStorage.getItem('token') as string
            setToken(t)
        },
        2000,
        true
    )

    useEffect(() => {
        if (address && token && token.length > 0) {
            fetcher(t, key, {
                method: 'GET',
                headers: new Headers({
                    'Content-Type': 'application/json',
                    'Accept-Language': i18n.language,
                }),
            })
                .then((value) => {
                    setInvitationInfo(value)
                })
        }
    }, [address, token])

    return {invitationInfo}
}

export const useInvitations = () => {
    const {i18n, t} = useTranslation()
    const {address} = useAccount()
    const key = `${getHost()}/apis/invite/customer/summary`
    const [token, setToken] = useState('')

    const [invitations, setInvitations] = useState<any>()

    useInterval(
        () => {
            const t = localStorage.getItem('token') as string
            setToken(t)
        },
        2000,
        true
    )

    useEffect(() => {
        if (address && token && token.length > 0) {
            fetcher(t, key, {
                method: 'GET',
                headers: new Headers({
                    'Content-Type': 'application/json',
                    'Accept-Language': i18n.language,
                }),
            }).then((value) => {
                setInvitations(value)
            })
        }
    }, [address, token])

    return {invitations}
}
