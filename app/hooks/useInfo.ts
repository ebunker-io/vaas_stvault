import {fetcher, getHost} from '../helpers/request'
import {useTranslation} from 'react-i18next'
import {useAccount} from 'wagmi'
import {useEffect, useState} from 'react'
import useInterval from './index'
import useSWR from 'swr'

export const useInfo = (refreshKey: number = 0) => {
    const {i18n, t} = useTranslation()
    const {address} = useAccount()
    const key = `${getHost()}/apis/customers/my_info?refreshKey=${refreshKey}`
    const [token, setToken] = useState('')

    const [userInfo, setUserInfo] = useState<any>()

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
                    setUserInfo(value)
                    // if (value.reward_address.toLowerCase() !== address.toLowerCase()) {
                    //     localStorage.removeItem('token')
                    //     localStorage.removeItem('address')
                    // }
                }).catch(reason => {
                console.warn("userInfo", reason)
            })
        }
    }, [address, token, key])

    return {userInfo}
}

export const useGetInfo = (refreshKey: number = 0) => {
    const {i18n,t} = useTranslation()

    const key = `${getHost()}/apis/customers/my_info?refreshKey=${refreshKey}`
    const {data, error} = useSWR(key, () => {
        const args: any = {
            method: 'GET',
            headers: new Headers({
                'Content-Type': 'application/json',
                'Accept-Language': i18n.language,
            }),
        }

        return fetcher(t,key, args)
    },{
        revalidateIfStale: false,
        revalidateOnFocus: false,
        revalidateOnReconnect: false
      })

    if (data) {
        return {
            userInfo: data,
            isLoading: !error && !data,
            isError: error,
        }
    } else {
        return {
            userInfo: undefined,
            isLoading: !error && !data,
            isError: error,
        }
    }
}