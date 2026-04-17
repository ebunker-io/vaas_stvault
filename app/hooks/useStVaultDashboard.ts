import useSWR from 'swr'
import { fetcher, getHost } from '../helpers/request'
import { useTranslation } from 'react-i18next'
import { useMemo } from 'react'

export const useStVaultDashboard = (vaultOwner: string | undefined) => {
  const { i18n, t } = useTranslation()

  const key = vaultOwner ? `${getHost()}/apis/v2/stvault/dashboard/list?vault_owner=${vaultOwner}` : null
  const { data, error, mutate } = useSWR(key, () => {
    if (!key) return null
    const args: any = {
      method: 'GET',
      headers: new Headers({
        'Content-Type': 'application/json',
        'Accept-Language': i18n.language,
      }),
    }

    return fetcher(t, key, args).catch((err) => {
      // Handle errors gracefully, especially 401 errors
      console.error('StVault Dashboard API error:', err)
      throw err
    })
  }, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    // Don't retry on 401 errors
    shouldRetryOnError: (error) => {
      if (error && typeof error === 'object' && 'httpCode' in error) {
        return (error as any).httpCode !== 401
      }
      if (error && typeof error === 'object' && 'status' in error) {
        return (error as any).status !== 401
      }
      return true
    },
  })

  return {
    data: data,
    isLoading: key ? !data && !error : false,
    error: error,
    mutate: mutate,
  }
}

export const useStVaultCreate = (vaultOwner: string | undefined) => {
  const { i18n, t } = useTranslation()

  const key = useMemo(() => vaultOwner ? `${getHost()}/apis/v2/stvault/create?time=${Date.now()}` : null, [vaultOwner])
  const { data, error } = useSWR(key, () => {
    if (!key) return null
    const args: any = {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
        'Accept-Language': i18n.language,
      }),
      body: JSON.stringify({
        from_address: vaultOwner,
        vault_owner: vaultOwner,
      }),
    }

    return fetcher(t, key, args)
  }, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: (error) => {
      if (error && typeof error === 'object' && 'httpCode' in error) {
        return (error as any).httpCode !== 401
      }
      if (error && typeof error === 'object' && 'status' in error) {
        return (error as any).status !== 401
      }
      return true
    },
  })

  return {
    data: data,
    isLoading: key ? !data && !error : false,
    error: error,
  }
}


export const useStVaultWithdraw = (params: { from_address: string; vault: string; amount: string } | null) => {
  const { i18n, t } = useTranslation()

  const key = useMemo(() => params ? `${getHost()}/apis/v2/stvault/withdraw?time=${Date.now()}` : null, [params])
  const { data, error } = useSWR(key, () => {
    if (!key) return null
    const args: any = {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
        'Accept-Language': i18n.language,
      }),
      body: JSON.stringify({
        from_address: params?.from_address,
        vault: params?.vault,
        amount: params?.amount,
      }),
    }

    return fetcher(t, key, args)
  }, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: (error) => {
      if (error && typeof error === 'object' && 'httpCode' in error) {
        return (error as any).httpCode !== 401
      }
      if (error && typeof error === 'object' && 'status' in error) {
        return (error as any).status !== 401
      }
      return true
    },
  })

  return {
    data: data,
    isLoading: key ? !data && !error : false,
    error: error,
  }
}

export const useStVaultSupply = (params: { from_address: string; vault: string; amount: string } | null) => {
  const { i18n, t } = useTranslation()

  const key = useMemo(() => params ? `${getHost()}/apis/v2/stvault/supply?time=${Date.now()}` : null, [params])
  const { data, error } = useSWR(key, () => {
    if (!key) return null
    const args: any = {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
        'Accept-Language': i18n.language,
      }),
      body: JSON.stringify({
        from_address: params?.from_address,
        vault: params?.vault,
        amount: params?.amount,
      }),
    }

    return fetcher(t, key, args)
  }, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: (error) => {
      if (error && typeof error === 'object' && 'httpCode' in error) {
        return (error as any).httpCode !== 401
      }
      if (error && typeof error === 'object' && 'status' in error) {
        return (error as any).status !== 401
      }
      return true
    },
  })

  return {
    data: data,
    isLoading: key ? !data && !error : false,
    error: error,
  }
}

export const useStVaultMintSteth = (params: { from_address: string; vault: string; amount: string } | null) => {
  const { i18n, t } = useTranslation()

  const key = useMemo(() => params ? `${getHost()}/apis/v2/stvault/mint_steth?time=${Date.now()}` : null, [params])
  const { data, error } = useSWR(key, () => {
    if (!key) return null
    const args: any = {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
        'Accept-Language': i18n.language,
      }),
      body: JSON.stringify({
        from_address: params?.from_address,
        vault: params?.vault,
        amount: params?.amount,
      }),
    }

    return fetcher(t, key, args)
  }, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: (error) => {
      if (error && typeof error === 'object' && 'httpCode' in error) {
        return (error as any).httpCode !== 401
      }
      if (error && typeof error === 'object' && 'status' in error) {
        return (error as any).status !== 401
      }
      return true
    },
  })

  return {
    data: data,
    isLoading: key ? !data && !error : false,
    error: error,
  }
}

export const useStVaultRepaySteth = (params: { from_address: string; vault: string; amount: string } | null) => {
  const { i18n, t } = useTranslation()

  const key = useMemo(() => params ? `${getHost()}/apis/v2/stvault/repay_steth?time=${Date.now()}` : null, [params])
  const { data, error } = useSWR(key, () => {
    if (!key) return null
    const args: any = {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
        'Accept-Language': i18n.language,
      }),
      body: JSON.stringify({
        from_address: params?.from_address,
        vault: params?.vault,
        amount: params?.amount,
      }),
    }

    return fetcher(t, key, args)
  }, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: (error) => {
      if (error && typeof error === 'object' && 'httpCode' in error) {
        return (error as any).httpCode !== 401
      }
      if (error && typeof error === 'object' && 'status' in error) {
        return (error as any).status !== 401
      }
      return true
    },
  })

  return {
    data: data,
    isLoading: key ? !data && !error : false,
    error: error,
  }
}


export const useStVaultRefresh = (vault: string | undefined) => {
  const { i18n, t } = useTranslation()

  const key = vault ? `${getHost()}/apis/v2/stvault/refresh?vault=${vault}` : null
  const { data, error, mutate } = useSWR(key, () => {
    if (!key) return null
    const args: any = {
      method: 'GET',
      headers: new Headers({
        'Content-Type': 'application/json',
        'Accept-Language': i18n.language,
      }),
    }

    return fetcher(t, key, args)
  }, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: (error) => {
      if (error && typeof error === 'object' && 'httpCode' in error) {
        return (error as any).httpCode !== 401
      }
      if (error && typeof error === 'object' && 'status' in error) {
        return (error as any).status !== 401
      }
      return true
    },
  })

  return {
    data: data,
    isLoading: key ? !data && !error : false,
    error: error,
    mutate: mutate,
    refresh: () => {
      if (vault) {
        mutate()
      }
    }
  }
}

export const useMintRefresh = (vault: string | undefined) => {
  const { i18n, t } = useTranslation()

  const key = vault ? `${getHost()}/apis/v2/stvault/refresh/mint_balance?vault=${vault}` : null
  const { data, error, mutate } = useSWR(key, () => {
    if (!key) return null
    const args: any = {
      method: 'GET',
      headers: new Headers({
        'Content-Type': 'application/json',
        'Accept-Language': i18n.language,
      }),
    }

    return fetcher(t, key, args)
  }, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: (error) => {
      if (error && typeof error === 'object' && 'httpCode' in error) {
        return (error as any).httpCode !== 401
      }
      if (error && typeof error === 'object' && 'status' in error) {
        return (error as any).status !== 401
      }
      return true
    },
  })

  return {
    data: data,
    isLoading: key ? !data && !error : false,
    error: error,
    mutate: mutate,
    refresh: () => {
      if (vault) {
        mutate()
      }
    }
  }
}

export const useBalanceRefresh = (vault: string | undefined) => {
  const { i18n, t } = useTranslation()

  const key = vault ? `${getHost()}/apis/v2/stvault/refresh/balance?vault=${vault}` : null
  const { data, error, mutate } = useSWR(key, () => {
    if (!key) return null
    const args: any = {
      method: 'GET',
      headers: new Headers({
        'Content-Type': 'application/json',
        'Accept-Language': i18n.language,
      }),
    }

    return fetcher(t, key, args)
  }, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: (error) => {
      if (error && typeof error === 'object' && 'httpCode' in error) {
        return (error as any).httpCode !== 401
      }
      if (error && typeof error === 'object' && 'status' in error) {
        return (error as any).status !== 401
      }
      return true
    },
  })

  return {
    data: data,
    isLoading: key ? !data && !error : false,
    error: error,
    mutate: mutate,
    refresh: () => {
      if (vault) {
        mutate()
      }
    }
  }
}

export const useStVaultPool = () => {
  const { i18n, t } = useTranslation()

  const key = `${getHost()}/apis/v2/stvault/statistics`
  const { data, error } = useSWR(key, () => {
    const args: any = {
      method: 'GET',
      headers: new Headers({
        'Accept-Language': i18n.language,
      }),
    }

    return fetcher(t, key, args)
  })
  return {
    data: data,
    error: error,
  }
}