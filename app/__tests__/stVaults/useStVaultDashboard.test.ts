/**
 * stVault Hooks 单元测试
 *
 * 测试 hooks/useStVaultDashboard.ts 中的所有 SWR hooks：
 * - useStVaultDashboard: 获取 vault 列表
 * - useStVaultCreate: 创建 vault
 * - useStVaultSupply / useStVaultWithdraw: 供给/提取
 * - useStVaultMintSteth / useStVaultRepaySteth: 铸造/偿还 stETH
 * - useStVaultRefresh / useMintRefresh / useBalanceRefresh: 刷新
 * - useStVaultPool: 获取统计数据
 */

// Mock 依赖
jest.mock('swr', () => {
  return {
    __esModule: true,
    default: jest.fn((key, fetcher, options) => {
      return {
        data: key ? mockSwrData : undefined,
        error: mockSwrError,
        isLoading: false,
        mutate: jest.fn(),
      }
    }),
  }
})

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en-us' },
  }),
}))

jest.mock('../../helpers/request', () => ({
  fetcher: jest.fn(),
  getHost: jest.fn(() => 'https://api.test.ebunker.io'),
}))

let mockSwrData: any = undefined
let mockSwrError: any = undefined

import useSWR from 'swr'
import { fetcher, getHost } from '../../helpers/request'

// 由于 hooks 内部使用了 useMemo, 需要 mock React
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useMemo: (fn: () => any, deps: any[]) => fn(),
}))

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

const mockAddress = '0x1234567890abcdef1234567890abcdef12345678'

describe('useStVaultDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSwrData = undefined
    mockSwrError = undefined
  })

  it('vaultOwner 为 undefined 时应返回空数据且不请求', () => {
    const result = useStVaultDashboard(undefined)
    const call = (useSWR as jest.Mock).mock.calls[0]
    expect(call[0]).toBeNull() // key 为 null
    expect(result.isLoading).toBe(false)
  })

  it('vaultOwner 有值时应构造正确的 URL key', () => {
    mockSwrData = [{ vault: '0xabc' }]
    const result = useStVaultDashboard(mockAddress)
    const call = (useSWR as jest.Mock).mock.calls[0]
    expect(call[0]).toBe(`https://api.test.ebunker.io/apis/v2/stvault/dashboard/list?vault_owner=${mockAddress}`)
    expect(result.data).toEqual([{ vault: '0xabc' }])
  })

  it('应返回 mutate 函数用于手动刷新', () => {
    mockSwrData = []
    const result = useStVaultDashboard(mockAddress)
    expect(result.mutate).toBeDefined()
    expect(typeof result.mutate).toBe('function')
  })

  it('有数据时 isLoading 应为 false', () => {
    mockSwrData = []
    const result = useStVaultDashboard(mockAddress)
    expect(result.isLoading).toBe(false)
  })

  it('有错误时 isLoading 应为 false', () => {
    mockSwrError = new Error('test error')
    const result = useStVaultDashboard(mockAddress)
    expect(result.isLoading).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('SWR 选项应禁用自动刷新', () => {
    useStVaultDashboard(mockAddress)
    const call = (useSWR as jest.Mock).mock.calls[0]
    const options = call[2]
    expect(options.revalidateIfStale).toBe(false)
    expect(options.revalidateOnFocus).toBe(false)
    expect(options.revalidateOnReconnect).toBe(false)
  })

  it('shouldRetryOnError 应在 401 httpCode 时返回 false', () => {
    useStVaultDashboard(mockAddress)
    const call = (useSWR as jest.Mock).mock.calls[0]
    const options = call[2]
    const shouldRetry = options.shouldRetryOnError

    expect(shouldRetry({ httpCode: 401 })).toBe(false)
    expect(shouldRetry({ httpCode: 500 })).toBe(true)
    expect(shouldRetry({ status: 401 })).toBe(false)
    expect(shouldRetry({ status: 500 })).toBe(true)
    expect(shouldRetry(new Error('random'))).toBe(true)
  })
})

describe('useStVaultCreate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSwrData = undefined
    mockSwrError = undefined
  })

  it('vaultOwner 为 undefined 时 key 应为 null', () => {
    useStVaultCreate(undefined)
    const call = (useSWR as jest.Mock).mock.calls[0]
    expect(call[0]).toBeNull()
  })

  it('vaultOwner 有值时应构造包含 create 的 URL', () => {
    useStVaultCreate(mockAddress)
    const call = (useSWR as jest.Mock).mock.calls[0]
    expect(call[0]).toContain('/apis/v2/stvault/create')
    expect(call[0]).toContain('time=')
  })

  it('应返回交易数据', () => {
    mockSwrData = { to: '0xcontract', value: '1000000000000000000', data: '0x' }
    const result = useStVaultCreate(mockAddress)
    expect(result.data).toEqual({ to: '0xcontract', value: '1000000000000000000', data: '0x' })
  })
})

describe('useStVaultSupply', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSwrData = undefined
    mockSwrError = undefined
  })

  it('params 为 null 时 key 应为 null', () => {
    useStVaultSupply(null)
    const call = (useSWR as jest.Mock).mock.calls[0]
    expect(call[0]).toBeNull()
  })

  it('params 有值时应构造 supply URL', () => {
    useStVaultSupply({ from_address: mockAddress, vault: '0xvault', amount: '1000000000000000000' })
    const call = (useSWR as jest.Mock).mock.calls[0]
    expect(call[0]).toContain('/apis/v2/stvault/supply')
  })

  it('应返回交易数组', () => {
    mockSwrData = [
      { to: '0xcontract1', value: '0', data: '0xapprove' },
      { to: '0xcontract2', value: '1000000000000000000', data: '0xsupply' },
    ]
    const result = useStVaultSupply({ from_address: mockAddress, vault: '0xvault', amount: '1000000000000000000' })
    expect(result.data).toHaveLength(2)
  })
})

describe('useStVaultWithdraw', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSwrData = undefined
    mockSwrError = undefined
  })

  it('params 为 null 时 key 应为 null', () => {
    useStVaultWithdraw(null)
    const call = (useSWR as jest.Mock).mock.calls[0]
    expect(call[0]).toBeNull()
  })

  it('params 有值时应构造 withdraw URL', () => {
    useStVaultWithdraw({ from_address: mockAddress, vault: '0xvault', amount: '500000000000000000' })
    const call = (useSWR as jest.Mock).mock.calls[0]
    expect(call[0]).toContain('/apis/v2/stvault/withdraw')
  })
})

describe('useStVaultMintSteth', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSwrData = undefined
    mockSwrError = undefined
  })

  it('params 为 null 时 key 应为 null', () => {
    useStVaultMintSteth(null)
    const call = (useSWR as jest.Mock).mock.calls[0]
    expect(call[0]).toBeNull()
  })

  it('params 有值时应构造 mint_steth URL', () => {
    useStVaultMintSteth({ from_address: mockAddress, vault: '0xvault', amount: '1000000000000000000' })
    const call = (useSWR as jest.Mock).mock.calls[0]
    expect(call[0]).toContain('/apis/v2/stvault/mint_steth')
  })
})

describe('useStVaultRepaySteth', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSwrData = undefined
    mockSwrError = undefined
  })

  it('params 为 null 时 key 应为 null', () => {
    useStVaultRepaySteth(null)
    const call = (useSWR as jest.Mock).mock.calls[0]
    expect(call[0]).toBeNull()
  })

  it('params 有值时应构造 repay_steth URL', () => {
    useStVaultRepaySteth({ from_address: mockAddress, vault: '0xvault', amount: '500000000000000000' })
    const call = (useSWR as jest.Mock).mock.calls[0]
    expect(call[0]).toContain('/apis/v2/stvault/repay_steth')
  })
})

describe('useStVaultRefresh', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSwrData = undefined
    mockSwrError = undefined
  })

  it('vault 为 undefined 时 key 应为 null', () => {
    useStVaultRefresh(undefined)
    const call = (useSWR as jest.Mock).mock.calls[0]
    expect(call[0]).toBeNull()
  })

  it('vault 有值时应构造 refresh URL', () => {
    useStVaultRefresh('0xvault123')
    const call = (useSWR as jest.Mock).mock.calls[0]
    expect(call[0]).toBe('https://api.test.ebunker.io/apis/v2/stvault/refresh?vault=0xvault123')
  })

  it('应提供 refresh 函数', () => {
    const result = useStVaultRefresh('0xvault123')
    expect(typeof result.refresh).toBe('function')
  })

  it('vault 为 undefined 时 refresh 不应调用 mutate', () => {
    const result = useStVaultRefresh(undefined)
    result.refresh()
    // mutate 不应被调用，因为 vault 为 undefined
  })
})

describe('useMintRefresh', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSwrData = undefined
    mockSwrError = undefined
  })

  it('vault 有值时应构造 mint_balance refresh URL', () => {
    useMintRefresh('0xvault123')
    const call = (useSWR as jest.Mock).mock.calls[0]
    expect(call[0]).toBe('https://api.test.ebunker.io/apis/v2/stvault/refresh/mint_balance?vault=0xvault123')
  })

  it('应提供 refresh 函数', () => {
    const result = useMintRefresh('0xvault123')
    expect(typeof result.refresh).toBe('function')
  })
})

describe('useBalanceRefresh', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSwrData = undefined
    mockSwrError = undefined
  })

  it('vault 有值时应构造 balance refresh URL', () => {
    useBalanceRefresh('0xvault123')
    const call = (useSWR as jest.Mock).mock.calls[0]
    expect(call[0]).toBe('https://api.test.ebunker.io/apis/v2/stvault/refresh/balance?vault=0xvault123')
  })
})

describe('useStVaultPool', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSwrData = undefined
    mockSwrError = undefined
  })

  it('应构造 statistics URL（无条件参数）', () => {
    useStVaultPool()
    const call = (useSWR as jest.Mock).mock.calls[0]
    expect(call[0]).toBe('https://api.test.ebunker.io/apis/v2/stvault/statistics')
  })

  it('应返回 data 和 error', () => {
    mockSwrData = { total_staked: '100000000000000000000', vault_count: 5 }
    const result = useStVaultPool()
    expect(result.data).toEqual({ total_staked: '100000000000000000000', vault_count: 5 })
  })
})
