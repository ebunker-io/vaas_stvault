/**
 * MintForm (Mint/Repay stETH) 组件测试
 *
 * 覆盖：
 * - Tab 切换（Mint / Repay）
 * - 金额输入与 MAX
 * - Minted / Mintable 摘要显示
 * - 按钮状态
 * - 交易错误弹窗
 */

const mockBack = jest.fn()
jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), back: mockBack, query: {} }),
}))
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en-us' } }),
}))
jest.mock('../../config', () => ({
  ENV: { host: 'https://api.test.ebunker.io', chains: [{ id: 1 }] },
  BUILD_ENV: 'test',
}))
jest.mock('../../assets/images/stvault/icon-eth.png', () => ({ src: '/eth.png' }), { virtual: true })
jest.mock('lucide-react', () => ({ Loader2: (p: any) => <span data-testid="loader" /> }))

const mockSendTransaction = jest.fn()
let mockTxError: any = undefined

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: '0xuser1234567890abcdef1234567890abcdef12' as `0x${string}` }),
  useBalance: () => ({ data: { value: BigInt('10000000000000000000') } }),
  useSendTransaction: () => ({
    sendTransaction: mockSendTransaction,
    isPending: false,
    data: undefined,
    error: mockTxError,
  }),
  useWaitForTransactionReceipt: jest.fn(() => ({
    isLoading: false,
    isSuccess: false,
    isError: false,
  })),
}))

jest.mock('../../hooks/useStVaultDashboard', () => ({
  useStVaultMintSteth: () => ({ data: undefined, isLoading: false, error: undefined }),
  useStVaultRepaySteth: () => ({ data: undefined, isLoading: false, error: undefined }),
  useStVaultRefresh: () => ({ refresh: jest.fn() }),
  useMintRefresh: () => ({
    refresh: jest.fn(),
    data: {
      remaining_minting_capacity_steth: '5000000000000000000',
      liability_steth: '2000000000000000000',
    },
  }),
}))

jest.mock('../../helpers/request', () => ({
  fetcher: jest.fn(),
  getHost: () => 'https://api.test.ebunker.io',
}))

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import MintForm from '../../components/stVaults/mintForm'
import { DashboardCardData } from '../../types'

const mockVaultData: DashboardCardData = {
  vault: '0xvault1234567890abcdef1234567890abcdef12',
  status: 'active',
  dashboard: '0xdash1234567890abcdef1234567890abcdef12',
  vault_owner: '0xowner',
  node_operator: '0xop',
  node_operator_manager: [],
  total_value: '32000000000000000000',
  vault_balance: '32000000000000000000',
  staking_apr: 3.45,
  health_factor: '200',
  liability_steth: '2000000000000000000',
  remaining_minting_steth: '5000000000000000000',
  total_minting_steth: '7000000000000000000',
  withdrawable_value: '20000000000000000000',
  locked: '0',
  operator_fee_rate: 0.1,
  undisbursed_operator_fee: '0',
  infra_fee: 0,
  liquidity_fee: 0,
  unsettled_lido_fee: '0',
  confirm_expiry: 7200,
  tier_id: 1,
  created_time: '2024-01-01',
}

beforeEach(() => {
  jest.clearAllMocks()
  mockTxError = undefined
})

describe('MintForm 渲染', () => {
  it('应显示 Mint 和 Repay tab', () => {
    render(<MintForm tab={0} data={mockVaultData} />)
    // tab + action button 都有 stvaults_mint 文字
    expect(screen.getAllByText('stvaults_mint').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('stvaults_repay').length).toBeGreaterThanOrEqual(1)
  })

  it('应显示 vault 地址', () => {
    render(<MintForm tab={0} data={mockVaultData} />)
    expect(screen.getByText(mockVaultData.vault)).toBeInTheDocument()
  })

  it('应显示金额输入框', () => {
    render(<MintForm tab={0} data={mockVaultData} />)
    expect(screen.getByText('stvaults_enter_amount')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument()
  })

  it('应显示 stETH 标签', () => {
    render(<MintForm tab={0} data={mockVaultData} />)
    expect(screen.getByText('stETH')).toBeInTheDocument()
  })

  it('应显示 Minted 和 Mintable 摘要', () => {
    render(<MintForm tab={0} data={mockVaultData} />)
    expect(screen.getByText('stvaults_minted')).toBeInTheDocument()
    expect(screen.getByText('stvaults_mintable')).toBeInTheDocument()
  })

  it('应显示 minted 数值 (2 stETH)', () => {
    render(<MintForm tab={0} data={mockVaultData} />)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('应显示 mintable 数值', () => {
    render(<MintForm tab={0} data={mockVaultData} />)
    // mintable 数值显示为 bold text
    const mintableElements = screen.getAllByText('5')
    expect(mintableElements.length).toBeGreaterThanOrEqual(1)
  })

  it('data 为 null 时应显示默认占位地址', () => {
    render(<MintForm tab={0} data={null} />)
    expect(screen.getByText('0x3m2r3ujefijfiojwf023ruf893ujf9ujoehjfo2')).toBeInTheDocument()
  })
})

describe('MintForm Tab 切换', () => {
  it('点击 Repay tab 应切换', () => {
    render(<MintForm tab={0} data={mockVaultData} />)
    fireEvent.click(screen.getByText('stvaults_repay'))
    // Tab 应切换成功
  })

  it('切换 tab 应清空金额', () => {
    render(<MintForm tab={0} data={mockVaultData} />)
    const input = screen.getByPlaceholderText('0.00') as HTMLInputElement
    fireEvent.change(input, { target: { value: '1.5' } })
    expect(input.value).toBe('1.5')

    fireEvent.click(screen.getByText('stvaults_repay'))
    expect(input.value).toBe('')
  })

  it('tab=1 时应初始显示 Repay', () => {
    render(<MintForm tab={1} data={mockVaultData} />)
    // Repay tab + action button
    expect(screen.getAllByText('stvaults_repay').length).toBeGreaterThanOrEqual(2)
  })
})

describe('MintForm 金额输入', () => {
  it('输入金额应更新', () => {
    render(<MintForm tab={0} data={mockVaultData} />)
    const input = screen.getByPlaceholderText('0.00') as HTMLInputElement
    fireEvent.change(input, { target: { value: '3' } })
    expect(input.value).toBe('3')
  })

  it('点击 MAX 应设置最大可铸造量', () => {
    render(<MintForm tab={0} data={mockVaultData} />)
    fireEvent.click(screen.getByText('stvaults_max'))
    const input = screen.getByPlaceholderText('0.00') as HTMLInputElement
    expect(input.value).toBe('5')
  })

  it('Repay tab 下 MAX 应设置 liability_steth', () => {
    render(<MintForm tab={1} data={mockVaultData} />)
    fireEvent.click(screen.getByText('stvaults_max'))
    const input = screen.getByPlaceholderText('0.00') as HTMLInputElement
    expect(input.value).toBe('2')
  })
})

describe('MintForm 按钮状态', () => {
  it('无金额时按钮应被禁用', () => {
    render(<MintForm tab={0} data={mockVaultData} />)
    const buttons = screen.getAllByRole('button')
    const actionBtn = buttons[buttons.length - 1]
    expect(actionBtn).toBeDisabled()
  })

  it('有效金额时按钮应可点击', () => {
    render(<MintForm tab={0} data={mockVaultData} />)
    const input = screen.getByPlaceholderText('0.00')
    fireEvent.change(input, { target: { value: '1' } })
    const buttons = screen.getAllByRole('button')
    const actionBtn = buttons[buttons.length - 1]
    expect(actionBtn).not.toBeDisabled()
  })
})

describe('MintForm 错误处理', () => {
  it('交易错误时应显示失败弹窗', () => {
    mockTxError = { message: 'Insufficient gas.' }
    render(<MintForm tab={0} data={mockVaultData} />)
    expect(screen.getByText('Transaction failed')).toBeInTheDocument()
  })
})
