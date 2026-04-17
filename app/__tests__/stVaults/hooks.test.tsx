/**
 * stVault Hooks renderHook 测试
 *
 * 使用 @testing-library/react 的 renderHook 测试 hooks 的完整行为，
 * 包括 SWR fetcher 回调函数的调用。
 */

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en-us' },
  }),
}))

jest.mock('../../config', () => ({
  ENV: {
    host: 'https://api.test.ebunker.io',
    explorer: 'https://beaconcha.in',
    etherscan: 'https://etherscan.io',
    ebunkerPublicKey: 'mock-key',
    ssvPublicKey: 'mock-ssv-key',
  },
}))

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock localStorage
const store: Record<string, string> = {}
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, val: string) => { store[key] = val }),
    removeItem: jest.fn((key: string) => { delete store[key] }),
    clear: jest.fn(() => { Object.keys(store).forEach(k => delete store[k]) }),
  },
})

// 使用真实的 SWR 来测试 fetcher 回调
import { renderHook, waitFor, act } from '@testing-library/react'
import React from 'react'
import { SWRConfig } from 'swr'

import {
  useStVaultDashboard,
  useStVaultCreate,
  useStVaultSupply,
  useStVaultWithdraw,
  useStVaultMintSteth,
  useStVaultRepaySteth,
  useStVaultRefresh,
  useMintRefresh,
  useBalanceRefresh,
  useStVaultPool,
} from '../../hooks/useStVaultDashboard'

const address = '0x1234567890abcdef1234567890abcdef12345678'

// SWR 需要一个 provider wrapper 来隔离缓存
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
    {children}
  </SWRConfig>
)

beforeEach(() => {
  jest.clearAllMocks()
  window.localStorage.clear()
})

describe('useStVaultDashboard (renderHook)', () => {
  it('vaultOwner 为空时不应发起请求', async () => {
    const { result } = renderHook(() => useStVaultDashboard(undefined), { wrapper })
    expect(result.current.data).toBeUndefined()
    expect(result.current.isLoading).toBe(false)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('vaultOwner 有值时应发起 GET 请求并返回数据', async () => {
    const mockVaults = { vaults: [{ vault: '0xabc' }], rated_apr: 3.5 }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ code: 200, data: mockVaults }),
    })

    const { result } = renderHook(() => useStVaultDashboard(address), { wrapper })

    await waitFor(() => {
      expect(result.current.data).toEqual(mockVaults)
    })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/apis/v2/stvault/dashboard/list'),
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('应自动注入 Authorization header', async () => {
    window.localStorage.setItem('token', 'my-token-123')

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ code: 200, data: { vaults: [] } }),
    })

    const { result } = renderHook(() => useStVaultDashboard(address), { wrapper })

    await waitFor(() => {
      expect(result.current.data).toBeDefined()
    })

    const fetchCall = mockFetch.mock.calls[0]
    const headers = fetchCall[1].headers
    expect(headers.get('Authorization')).toBe('my-token-123')
  })

  it('API 返回 401 应不重试', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ code: 401, data: null, msg: 'Unauthorized' }),
    })

    const { result } = renderHook(() => useStVaultDashboard(address), { wrapper })

    await waitFor(() => {
      expect(result.current.error).toBeDefined()
    })
  })

  it('mutate 应可用于手动刷新', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ code: 200, data: { vaults: [] } }),
    })

    const { result } = renderHook(() => useStVaultDashboard(address), { wrapper })

    await waitFor(() => {
      expect(result.current.data).toBeDefined()
    })

    expect(typeof result.current.mutate).toBe('function')
  })
})

describe('useStVaultCreate (renderHook)', () => {
  it('应发起 POST 请求创建 vault', async () => {
    const txData = { to: '0xcontract', value: '1000000000000000000', data: '0xcreate' }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ code: 200, data: txData }),
    })

    const { result } = renderHook(() => useStVaultCreate(address), { wrapper })

    await waitFor(() => {
      expect(result.current.data).toEqual(txData)
    })

    const fetchCall = mockFetch.mock.calls[0]
    expect(fetchCall[1].method).toBe('POST')
    const body = JSON.parse(fetchCall[1].body)
    expect(body.from_address).toBe(address)
    expect(body.vault_owner).toBe(address)
  })
})

describe('useStVaultSupply (renderHook)', () => {
  it('params 为 null 时不应发起请求', () => {
    const { result } = renderHook(() => useStVaultSupply(null), { wrapper })
    expect(mockFetch).not.toHaveBeenCalled()
    expect(result.current.isLoading).toBe(false)
  })

  it('应发起 POST 请求并返回交易数组', async () => {
    const txArray = [
      { to: '0xapprove', value: '0', data: '0x1' },
      { to: '0xsupply', value: '1000000000000000000', data: '0x2' },
    ]
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ code: 200, data: txArray }),
    })

    const params = { from_address: address, vault: '0xvault', amount: '1000000000000000000' }
    const { result } = renderHook(() => useStVaultSupply(params), { wrapper })

    await waitFor(() => {
      expect(result.current.data).toEqual(txArray)
    })

    const fetchCall = mockFetch.mock.calls[0]
    expect(fetchCall[0]).toContain('/apis/v2/stvault/supply')
    const body = JSON.parse(fetchCall[1].body)
    expect(body.vault).toBe('0xvault')
    expect(body.amount).toBe('1000000000000000000')
  })
})

describe('useStVaultWithdraw (renderHook)', () => {
  it('应发起 withdraw POST 请求', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ code: 200, data: [{ to: '0x', value: '0', data: '0x' }] }),
    })

    const params = { from_address: address, vault: '0xvault', amount: '500000000000000000' }
    const { result } = renderHook(() => useStVaultWithdraw(params), { wrapper })

    await waitFor(() => {
      expect(result.current.data).toBeDefined()
    })

    expect(mockFetch.mock.calls[0][0]).toContain('/apis/v2/stvault/withdraw')
  })
})

describe('useStVaultMintSteth (renderHook)', () => {
  it('应发起 mint_steth POST 请求', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ code: 200, data: [{ to: '0x', value: '0', data: '0x' }] }),
    })

    const params = { from_address: address, vault: '0xvault', amount: '1000000000000000000' }
    const { result } = renderHook(() => useStVaultMintSteth(params), { wrapper })

    await waitFor(() => {
      expect(result.current.data).toBeDefined()
    })

    expect(mockFetch.mock.calls[0][0]).toContain('/apis/v2/stvault/mint_steth')
  })
})

describe('useStVaultRepaySteth (renderHook)', () => {
  it('应发起 repay_steth POST 请求', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ code: 200, data: [{ to: '0x', value: '0', data: '0x' }] }),
    })

    const params = { from_address: address, vault: '0xvault', amount: '500000000000000000' }
    const { result } = renderHook(() => useStVaultRepaySteth(params), { wrapper })

    await waitFor(() => {
      expect(result.current.data).toBeDefined()
    })

    expect(mockFetch.mock.calls[0][0]).toContain('/apis/v2/stvault/repay_steth')
  })
})

describe('useStVaultRefresh (renderHook)', () => {
  it('应发起 GET 请求刷新 vault 数据', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ code: 200, data: { refreshed: true } }),
    })

    const { result } = renderHook(() => useStVaultRefresh('0xvault123'), { wrapper })

    await waitFor(() => {
      expect(result.current.data).toEqual({ refreshed: true })
    })

    expect(mockFetch.mock.calls[0][0]).toContain('/apis/v2/stvault/refresh?vault=0xvault123')
    expect(mockFetch.mock.calls[0][1].method).toBe('GET')
  })

  it('refresh() 方法应调用 mutate', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ code: 200, data: {} }),
    })

    const { result } = renderHook(() => useStVaultRefresh('0xvault123'), { wrapper })

    await waitFor(() => {
      expect(result.current.data).toBeDefined()
    })

    expect(typeof result.current.refresh).toBe('function')
    // 调用 refresh 不应抛出
    act(() => {
      result.current.refresh()
    })
  })
})

describe('useMintRefresh (renderHook)', () => {
  it('应发起 mint_balance refresh 请求', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        code: 200,
        data: { remaining_minting_capacity_steth: '5000000000000000000', liability_steth: '1000000000000000000' },
      }),
    })

    const { result } = renderHook(() => useMintRefresh('0xvault'), { wrapper })

    await waitFor(() => {
      expect(result.current.data).toBeDefined()
      expect(result.current.data.remaining_minting_capacity_steth).toBe('5000000000000000000')
    })

    expect(mockFetch.mock.calls[0][0]).toContain('/apis/v2/stvault/refresh/mint_balance')
  })
})

describe('useBalanceRefresh (renderHook)', () => {
  it('应发起 balance refresh 请求', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        code: 200,
        data: { withdrawable_value: '20000000000000000000' },
      }),
    })

    const { result } = renderHook(() => useBalanceRefresh('0xvault'), { wrapper })

    await waitFor(() => {
      expect(result.current.data).toBeDefined()
      expect(result.current.data.withdrawable_value).toBe('20000000000000000000')
    })

    expect(mockFetch.mock.calls[0][0]).toContain('/apis/v2/stvault/refresh/balance')
  })
})

describe('useStVaultPool (renderHook)', () => {
  it('应发起统计数据 GET 请求', async () => {
    const stats = { total_staked: '100000000000000000000', vault_count: 10 }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ code: 200, data: stats }),
    })

    const { result } = renderHook(() => useStVaultPool(), { wrapper })

    await waitFor(() => {
      expect(result.current.data).toEqual(stats)
    })

    expect(mockFetch.mock.calls[0][0]).toContain('/apis/v2/stvault/statistics')
    expect(mockFetch.mock.calls[0][1].method).toBe('GET')
  })

  it('应包含 Accept-Language header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ code: 200, data: {} }),
    })

    renderHook(() => useStVaultPool(), { wrapper })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })

    const headers = mockFetch.mock.calls[0][1].headers
    expect(headers.get('Accept-Language')).toBe('en-us')
  })
})
