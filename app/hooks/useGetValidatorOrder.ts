import {fetcher, getHost} from '../helpers/request'
import useSWR from 'swr'
import {useCallback, useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import useInterval from './index'

export const useCurrentOrderExist = () => {
    const key = `${getHost()}/apis/validator_orders/current_exist`
    const [existing, setExisting] = useState(false)
    const [isImport, setIsImport] = useState(false)
    const [orderId, setOrderId] = useState(undefined)
    const {i18n, t} = useTranslation()
    const query = useCallback(() => {
        const args: any = {
            method: 'GET',
            headers: new Headers({'Accept-Language': i18n.language}),
        }

        fetcher(t, key, args)
            .then((value) => {
                setExisting(value?.exist)
                setOrderId(value?.id)
                if (value?.source === 'IMPORT') {
                    setIsImport(true)
                } else {
                    setIsImport(false)
                }
            })
            .catch((e) => console.warn('useCurrentOrderExist', e))
    }, [key])

    useInterval(
        () => {
            query()
        },
        60000,
        true
    )

    return {existing, isImport, orderId}
}

export const useGetValidatorOrderDetail = () => {
    const {i18n, t} = useTranslation()
    return useCallback(async (orderId: number) => {
        if (!orderId) return

        const key = `${getHost()}/apis/validator_orders/${orderId}`
        return fetcher(t, key, {
            method: 'GET',
            headers: new Headers({
                'Content-Type': 'application/json',
                'Accept-Language': i18n.language,
            }),
        })
    }, [])
}

export const useGetCurrentValidatorOrder = (refreshKey: number) => {
    const {i18n, t} = useTranslation()
    const key = `${getHost()}/apis/validator_orders/current?key=${refreshKey}`
    const {error, data} = useSWR(key, () => {
        return fetcher(t, key, {
            method: 'GET',
            headers: new Headers({'Accept-Language': i18n.language}),
        })
    })
    return {
        data: data,
        isLoading: !data && !error,
        error: error,
    }
}