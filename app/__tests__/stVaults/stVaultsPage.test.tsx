/**
 * pages/stVaults/index.tsx 页面测试
 *
 * 覆盖：
 * - 无数据 + 无连接时 → Loading 骨架屏
 * - 有数据且有 vaults → StVaultsForm
 * - 有数据且无 vaults → CreateVaultForm
 * - isCreate query param → CreateVaultForm
 * - 错误处理
 */

let mockQuery: any = {}
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    query: mockQuery,
    pathname: '/stVaults',
    asPath: '/stVaults',
    events: { on: jest.fn(), off: jest.fn() },
  }),
  __esModule: true,
  default: { push: jest.fn() },
}))
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en-us' } }),
}))
jest.mock('../../config', () => ({
  ENV: { host: 'https://api.test.ebunker.io', chains: [{ id: 1 }] },
  BUILD_ENV: 'test',
}))
jest.mock('../../assets/images/stvault/icon-eth.png', () => ({ src: '/eth.png' }), { virtual: true })
jest.mock('../../assets/images/stvault/image-lido-eth.svg', () => ({ src: '/lido.svg' }), { virtual: true })
jest.mock('lucide-react', () => ({ Loader2: (p: any) => <span data-testid="loader" /> }))

let mockAddress: string | undefined = '0x1234567890abcdef1234567890abcdef12345678'
let mockDashboardData: any = undefined
let mockDashboardError: any = undefined

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: mockAddress }),
  useBalance: () => ({ data: { value: BigInt('10000000000000000000') }, refetch: jest.fn() }),
  useSendTransaction: () => ({
    sendTransaction: jest.fn(),
    isPending: false,
    data: undefined,
    error: undefined,
  }),
  useWaitForTransactionReceipt: () => ({
    isLoading: false,
    isSuccess: false,
    isError: false,
  }),
}))

jest.mock('@rainbow-me/rainbowkit', () => ({
  useConnectModal: () => ({ openConnectModal: jest.fn() }),
}))

jest.mock('../../hooks/useStVaultDashboard', () => ({
  useStVaultDashboard: () => ({
    data: mockDashboardData,
    error: mockDashboardError,
    mutate: jest.fn(),
  }),
  useStVaultCreate: () => ({ data: undefined, isLoading: false, error: undefined }),
  useStVaultSupply: () => ({ data: undefined, isLoading: false, error: undefined }),
  useStVaultRefresh: () => ({ refresh: jest.fn() }),
  useBalanceRefresh: () => ({ refresh: jest.fn(), data: undefined }),
}))

jest.mock('../../helpers/request', () => ({
  fetcher: jest.fn(),
  getHost: () => 'https://api.test.ebunker.io',
}))

// Mock AppLayout to just render children
jest.mock('../../components/layout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="app-layout">{children}</div>,
}))

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import StVaults from '../../pages/stVaults/index'

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers()
  mockQuery = {}
  mockAddress = '0x1234567890abcdef1234567890abcdef12345678'
  mockDashboardData = undefined
  mockDashboardError = undefined
})

afterEach(() => {
  jest.useRealTimers()
})

describe('StVaults 页面 Loading 状态', () => {
  it('有 address 但无 data 时应显示 Loading 骨架屏', () => {
    const { container } = render(<StVaults />)
    const skeletons = container.querySelectorAll('.MuiSkeleton-root')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('应使用 AppLayout 包裹', () => {
    render(<StVaults />)
    expect(screen.getByTestId('app-layout')).toBeInTheDocument()
  })
})

describe('StVaults 页面有数据', () => {
  it('有 vaults 时应渲染 StVaultsForm', () => {
    mockDashboardData = {
      vaults: [{ vault: '0xvault1111111111111111111111111111111111', dashboard: '0xdash1' }],
      rated_apr: 3.5,
    }
    render(<StVaults />)
    expect(screen.getByText('stvaults_start_staking')).toBeInTheDocument()
  })

  it('vaults 为空时应渲染 CreateVaultForm', () => {
    mockDashboardData = { vaults: [], rated_apr: 3.5 }
    render(<StVaults />)
    expect(screen.getByText('stvaults_create_lido_vault')).toBeInTheDocument()
  })
})

describe('StVaults 页面 isCreate', () => {
  it('isCreate=true 时应渲染 CreateVaultForm', () => {
    mockQuery = { isCreate: 'true' }
    mockDashboardData = {
      vaults: [{ vault: '0xvault1', dashboard: '0xdash1' }],
      rated_apr: 3.5,
    }
    render(<StVaults />)
    expect(screen.getByText('stvaults_create_lido_vault')).toBeInTheDocument()
  })
})

describe('StVaults 页面未连接', () => {
  it('address 为空时应最终显示 StVaultsForm', async () => {
    mockAddress = undefined
    jest.useRealTimers() // use real timers for this test
    render(<StVaults />)

    // 等待 setTimeout(500ms) 执行后 isFirst=true
    await waitFor(() => {
      expect(screen.getByText('stvaults_start_staking')).toBeInTheDocument()
    }, { timeout: 2000 })
  })
})

describe('StVaults 页面错误处理', () => {
  it('有错误时不应崩溃，应显示表单', () => {
    mockDashboardError = new Error('API failed')
    render(<StVaults />)

    // error 触发 setIsFirst(true)
    expect(screen.getByText('stvaults_start_staking')).toBeInTheDocument()
  })
})
