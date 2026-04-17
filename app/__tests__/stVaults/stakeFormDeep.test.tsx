/**
 * StakeForm 交易执行流程深度测试
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
jest.mock('../../assets/images/stvault/icon-eth.png', () => ({ src: '/e.png' }), { virtual: true })
jest.mock('../../assets/images/stvault/image-lido-eth.svg', () => ({ src: '/l.svg' }), { virtual: true })
jest.mock('lucide-react', () => ({ Loader2: () => <span data-testid="loader" /> }))
jest.mock('../../helpers/request', () => ({
  fetcher: jest.fn(),
  getHost: () => 'https://api.test.ebunker.io',
}))

const mockSendTx = jest.fn()
let wagmiState: any = {}
let hookState: any = {}

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: '0xuser1234567890abcdef1234567890abcdef12' }),
  useBalance: () => ({ data: { value: BigInt('5000000000000000000') }, refetch: jest.fn() }),
  useSendTransaction: () => ({
    sendTransaction: mockSendTx,
    isPending: wagmiState.isPending || false,
    data: wagmiState.txData,
    error: wagmiState.txError,
  }),
  useWaitForTransactionReceipt: () => ({
    isLoading: false,
    isSuccess: wagmiState.receiptSuccess || false,
    isError: wagmiState.receiptError || false,
  }),
}))

jest.mock('../../hooks/useStVaultDashboard', () => ({
  useStVaultWithdraw: () => ({ data: hookState.withdrawData, isLoading: false, error: hookState.withdrawError }),
  useStVaultSupply: () => ({ data: hookState.supplyData, isLoading: false, error: hookState.supplyError }),
  useStVaultRefresh: () => ({ refresh: jest.fn() }),
  useBalanceRefresh: () => ({ refresh: jest.fn(), data: { withdrawable_value: '3000000000000000000' } }),
  useStVaultDashboard: () => ({ data: { rated_apr: 3.5 } }),
}))

import React from 'react'
import { render, screen, act } from '@testing-library/react'
import StakeForm from '../../components/stVaults/stakeForm'
import { DashboardCardData } from '../../types'

const vaultData: DashboardCardData = {
  vault: '0xvault1234567890abcdef1234567890abcdef12',
  status: 'active',
  dashboard: '0xdash1234567890abcdef1234567890abcdef12',
  vault_owner: '0xowner', node_operator: '0xop', node_operator_manager: [],
  total_value: '32000000000000000000', vault_balance: '32000000000000000000',
  staking_apr: 3.45, health_factor: '200',
  liability_steth: '0', remaining_minting_steth: '0', total_minting_steth: '0',
  withdrawable_value: '20000000000000000000', locked: '0', operator_fee_rate: 0.1,
  undisbursed_operator_fee: '0', infra_fee: 0, liquidity_fee: 0,
  unsettled_lido_fee: '0', confirm_expiry: 7200, tier_id: 1, created_time: '2024-01-01',
}

beforeEach(() => {
  jest.clearAllMocks()
  wagmiState = {}
  hookState = {}
  delete (window as any).ethereum
})

describe('StakeForm Supply 流程', () => {
  it('supplyData 单笔交易应调用 sendTransaction', () => {
    hookState.supplyData = [
      { to: '0xcontract', value: '1000000000000000000', data: '0xsupply', chainId: 1 },
    ]
    render(<StakeForm tab={0} data={vaultData} />)
    expect(mockSendTx).toHaveBeenCalledWith(expect.objectContaining({ to: '0xcontract' }))
  })

  it('supplyData 多笔非 MetaMask 应顺序执行', () => {
    hookState.supplyData = [
      { to: '0xapprove', value: '0', data: '0x1', chainId: 1 },
      { to: '0xsupply', value: '100', data: '0x2', chainId: 1 },
    ]
    render(<StakeForm tab={0} data={vaultData} />)
    expect(mockSendTx).toHaveBeenCalledWith(expect.objectContaining({ to: '0xapprove' }))
  })

  it('supplyData MetaMask 多笔应调用 wallet_sendCalls', async () => {
    const mockReq = jest.fn().mockResolvedValue('0x' + 'a'.repeat(64))
    ;(window as any).ethereum = { isMetaMask: true, request: mockReq }

    hookState.supplyData = [
      { to: '0x1', value: '0', data: '0x1', chainId: 1 },
      { to: '0x2', value: '100', data: '0x2', chainId: 1 },
    ]

    await act(async () => {
      render(<StakeForm tab={0} data={vaultData} />)
    })

    expect(mockReq).toHaveBeenCalledWith(expect.objectContaining({ method: 'wallet_sendCalls' }))
  })

  it('supplyError 应显示失败弹窗', () => {
    hookState.supplyError = { message: 'API error' }
    render(<StakeForm tab={0} data={vaultData} />)
    expect(screen.getByText('Transaction failed')).toBeInTheDocument()
  })
})

describe('StakeForm Withdraw 流程', () => {
  it('withdrawData 单笔交易应调用 sendTransaction', () => {
    hookState.withdrawData = [
      { to: '0xwithdraw', value: '0', data: '0xwithdraw', chainId: 1 },
    ]
    render(<StakeForm tab={1} data={vaultData} />)
    expect(mockSendTx).toHaveBeenCalledWith(expect.objectContaining({ to: '0xwithdraw' }))
  })

  it('withdrawError 应显示失败弹窗', () => {
    hookState.withdrawError = { message: 'Withdraw failed' }
    render(<StakeForm tab={1} data={vaultData} />)
    expect(screen.getByText('Transaction failed')).toBeInTheDocument()
  })
})

describe('StakeForm 批量交易回退', () => {
  it('wallet_sendCalls 失败应回退到顺序执行', async () => {
    const mockReq = jest.fn().mockRejectedValue(new Error('not supported'))
    ;(window as any).ethereum = { isMetaMask: true, request: mockReq }

    hookState.supplyData = [
      { to: '0x1', value: '0', data: '0x1', chainId: 1 },
      { to: '0x2', value: '100', data: '0x2', chainId: 1 },
    ]

    await act(async () => {
      render(<StakeForm tab={0} data={vaultData} />)
    })

    expect(mockSendTx).toHaveBeenCalled()
  })
})

describe('StakeForm 错误状态', () => {
  it('txError 应显示失败弹窗', () => {
    wagmiState.txError = { message: 'Gas failed' }
    render(<StakeForm tab={0} data={vaultData} />)
    expect(screen.getByText('Transaction failed')).toBeInTheDocument()
  })

  it('receiptError 应显示失败弹窗', () => {
    wagmiState.receiptError = true
    render(<StakeForm tab={0} data={vaultData} />)
    expect(screen.getByText('Transaction failed')).toBeInTheDocument()
  })
})
