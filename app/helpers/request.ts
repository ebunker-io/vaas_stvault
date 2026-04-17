import {ENV} from '../config'
import {API_ERROR_CODES, BizError, PageError} from "./apiErrorCodes";
import {HttpError} from "./apiErrorCodes";

export const getHost = () => {
    return ENV.host
}
export const getExplorer = () => {
    return ENV.explorer
}

export const getEtherscan = () => {
    return ENV.etherscan
}
export const getEbunkerPublicKey = () => {
    return ENV.ebunkerPublicKey
}
export const getSsvPublicKey = () => {
    return ENV.ssvPublicKey
}
export const fetcher = (t: any, api: string, args: any) => {
    const token = localStorage.getItem('token')
    if (args.headers) {
        if (token) {
            args.headers.append('Authorization', token as string)
        }
    }
    return fetch(api, args)
        .then((res) => {
            if (res.ok) {
                return res.json()
            } else {
                throw new HttpError(res.status, t('network_error'))
            }
        })
        .then((value) => {
            if (value.code === 200) {
                return value.data
            } else {
                if (value.code === API_ERROR_CODES.INVALID_TOKEN) {
                    if(token === localStorage.getItem('token')){
                        localStorage.removeItem('token')
                    }
                }
                throw new BizError(value.code, value.data, value.msg)
            }
        })
        .catch((e) => {
            console.error(api, e, args)
            if (e instanceof TypeError) {
                console.log('type error')
                throw new HttpError(502, t('network_error'))
            }
            if (e instanceof HttpError) {
                if (e.httpCode == 401) {
                    if(token === localStorage.getItem('token')){
                        localStorage.removeItem('token')
                    }
                }
                console.log('http error')
                throw e
            }
            if (e instanceof BizError) {
                console.log('biz error')
                throw e
            }
            throw new PageError(t('page_error'))
        })
}
