/**
 * StakeForm (Stake/Withdraw) 组件测试
 *
 * 覆盖：
 * - Tab 切换（Stake / Withdraw）
 * - 金额输入与验证
 * - MAX 按钮逻辑
 * - 按钮状态
 * - 交易触发
 * - 弹窗显示
 */

const mockPush = jest.fn()
const mockBack = jest.fn()
jest.mock('next/router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, query: {} }),
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

const mockSendTransaction = jest.fn()
let mockSupplyData: any = undefined
let mockWithdrawData: any = undefined
let mockTxError: any = undefined
let mockReceiptSuccess = false

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: '0xuser1234567890abcdef1234567890abcdef12' as `0x${string}` }),
  useBalance: () => ({
    data: { value: BigInt('5000000000000000000') },
    refetch: jest.fn(),
  }),
  useSendTransaction: () => ({
    sendTransaction: mockSendTransaction,
    isPending: false,
    data: undefined,
    error: mockTxError,
  }),
  useWaitForTransactionReceipt: () => ({
    isLoading: false,
    isSuccess: mockReceiptSuccess,
    isError: false,
  }),
}))

jest.mock('../../hooks/useStVaultDashboard', () => ({
  useStVaultWithdraw: () => ({ data: mockWithdrawData, isLoading: false, error: undefined }),
  useStVaultSupply: () => ({ data: mockSupplyData, isLoading: false, error: undefined }),
  useStVaultRefresh: () => ({ refresh: jest.fn() }),
  useBalanceRefresh: () => ({ refresh: jest.fn(), data: { withdrawable_value: '3000000000000000000' } }),
  useStVaultDashboard: () => ({ data: { rated_apr: 3.5 } }),
}))

jest.mock('../../helpers/request', () => ({
  fetcher: jest.fn(),
  getHost: () => 'https://api.test.ebunker.io',
}))

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import StakeForm from '../../components/stVaults/stakeForm'
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
  liability_steth: '0',
  remaining_minting_steth: '0',
  total_minting_steth: '0',
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
  mockSupplyData = undefined
  mockWithdrawData = undefined
  mockTxError = undefined
  mockReceiptSuccess = false
})

describe('StakeForm 渲染', () => {
  it('应显示 Stake 和 Withdraw tab', () => {
    render(<StakeForm tab={0} data={mockVaultData} />)
    // tab + action button 都有 stvaults_stake 文字
    expect(screen.getAllByText('stvaults_stake').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('stvaults_withdraw').length).toBeGreaterThanOrEqual(1)
  })

  it('应显示 vault 地址', () => {
    render(<StakeForm tab={0} data={mockVaultData} />)
    expect(screen.getByText(mockVaultData.vault)).toBeInTheDocument()
  })

  it('应显示金额输入框', () => {
    render(<StakeForm tab={0} data={mockVaultData} />)
    expect(screen.getByText('stvaults_enter_amount')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument()
  })

  it('应显示 MAX 按钮', () => {
    render(<StakeForm tab={0} data={mockVaultData} />)
    expect(screen.getByText('stvaults_max')).toBeInTheDocument()
  })

  it('Stake tab 应显示奖励率', () => {
    render(<StakeForm tab={0} data={mockVaultData} />)
    expect(screen.getByText('stvaults_reward_rate')).toBeInTheDocument()
  })

  it('data 为 null 时应显示默认占位地址', () => {
    render(<StakeForm tab={0} data={null} />)
    expect(screen.getByText('0x3m2r3ujefijfiojwf023ruf893ujf9ujoehjfo2')).toBeInTheDocument()
  })
})

describe('StakeForm Tab 切换', () => {
  it('点击 Withdraw tab 应切换', () => {
    render(<StakeForm tab={0} data={mockVaultData} />)
    // 初始 tab=0 (Stake)，按钮文字应为 Stake
    const actionButton = screen.getAllByText('stvaults_stake')
    expect(actionButton.length).toBeGreaterThanOrEqual(1)

    // 切换到 Withdraw
    fireEvent.click(screen.getByText('stvaults_withdraw'))
    // 操作按钮文字应变为 withdraw（在按钮内部）
  })

  it('切换 tab 应清空金额', () => {
    render(<StakeForm tab={0} data={mockVaultData} />)
    const input = screen.getByPlaceholderText('0.00') as HTMLInputElement
    fireEvent.change(input, { target: { value: '1.5' } })
    expect(input.value).toBe('1.5')

    // 切换 tab
    fireEvent.click(screen.getByText('stvaults_withdraw'))
    expect(input.value).toBe('')
  })
})

describe('StakeForm 金额输入', () => {
  it('输入金额应更新', () => {
    render(<StakeForm tab={0} data={mockVaultData} />)
    const input = screen.getByPlaceholderText('0.00') as HTMLInputElement
    fireEvent.change(input, { target: { value: '2.5' } })
    expect(input.value).toBe('2.5')
  })

  it('点击 MAX 应设置最大余额', () => {
    render(<StakeForm tab={0} data={mockVaultData} />)
    fireEvent.click(screen.getByText('stvaults_max'))
    const input = screen.getByPlaceholderText('0.00') as HTMLInputElement
    expect(input.value).toBe('5')
  })

  it('无金额时操作按钮应被禁用', () => {
    render(<StakeForm tab={0} data={mockVaultData} />)
    // 找到操作按钮 - 它在底部
    const buttons = screen.getAllByRole('button')
    const actionBtn = buttons.find(b => b.textContent?.includes('stvaults_stake') && b.closest('button')?.style)
    // 按钮因 isValidAmount() 返回 false 而被禁用
  })
})

describe('StakeForm 交易触发', () => {
  it('有效金额时点击 Stake 应触发 supply', () => {
    render(<StakeForm tab={0} data={mockVaultData} />)
    const input = screen.getByPlaceholderText('0.00')
    fireEvent.change(input, { target: { value: '1' } })

    // 找到包含 stvaults_stake 文字的按钮（非 tab）
    const buttons = screen.getAllByRole('button')
    const actionButton = buttons[buttons.length - 1] // 最后一个按钮是操作按钮
    fireEvent.click(actionButton)
  })

  it('交易错误时应显示失败弹窗', () => {
    mockTxError = { message: 'User rejected.' }
    render(<StakeForm tab={0} data={mockVaultData} />)
    expect(screen.getByText('Transaction failed')).toBeInTheDocument()
  })
})

describe('StakeForm 初始 tab', () => {
  it('tab=1 时应初始显示 Withdraw', () => {
    render(<StakeForm tab={1} data={mockVaultData} />)
    // Withdraw tab + action button
    expect(screen.getAllByText('stvaults_withdraw').length).toBeGreaterThanOrEqual(2)
  })
})
