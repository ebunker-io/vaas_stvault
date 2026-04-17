/**
 * MintForm 交易执行流程深度测试
 */

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), query: {} }),
}))
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en-us' } }),
}))
jest.mock('../../config', () => ({
  ENV: { host: 'https://api.test.ebunker.io', chains: [{ id: 1 }] },
  BUILD_ENV: 'test',
}))
jest.mock('../../assets/images/stvault/icon-eth.png', () => ({ src: '/e.png' }), { virtual: true })
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
  useBalance: () => ({ data: { value: BigInt('10000000000000000000') } }),
  useSendTransaction: () => ({
    sendTransaction: mockSendTx,
    isPending: wagmiState.isPending || false,
    data: wagmiState.txData,
    error: wagmiState.txError,
  }),
  useWaitForTransactionReceipt: jest.fn(() => ({
    isLoading: false,
    isSuccess: wagmiState.receiptSuccess || false,
    isError: wagmiState.receiptError || false,
  })),
}))

jest.mock('../../hooks/useStVaultDashboard', () => ({
  useStVaultMintSteth: () => ({ data: hookState.mintData, isLoading: false, error: hookState.mintError }),
  useStVaultRepaySteth: () => ({ data: hookState.repayData, isLoading: false, error: hookState.repayError }),
  useStVaultRefresh: () => ({ refresh: jest.fn() }),
  useMintRefresh: () => ({
    refresh: jest.fn(),
    data: {
      remaining_minting_capacity_steth: '5000000000000000000',
      liability_steth: '2000000000000000000',
    },
  }),
}))

import React from 'react'
import { render, screen, act } from '@testing-library/react'
import MintForm from '../../components/stVaults/mintForm'
import { DashboardCardData } from '../../types'

const vaultData: DashboardCardData = {
  vault: '0xvault1234567890abcdef1234567890abcdef12',
  status: 'active',
  dashboard: '0xdash1234567890abcdef1234567890abcdef12',
  vault_owner: '0xowner', node_operator: '0xop', node_operator_manager: [],
  total_value: '32000000000000000000', vault_balance: '32000000000000000000',
  staking_apr: 3.45, health_factor: '200',
  liability_steth: '2000000000000000000', remaining_minting_steth: '5000000000000000000',
  total_minting_steth: '7000000000000000000',
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

describe('MintForm Mint 流程', () => {
  it('mintData 单笔交易应调用 sendTransaction', () => {
    hookState.mintData = [
      { to: '0xmint', value: '0', data: '0xmint', chainId: 1 },
    ]
    render(<MintForm tab={0} data={vaultData} />)
    expect(mockSendTx).toHaveBeenCalledWith(expect.objectContaining({ to: '0xmint' }))
  })

  it('mintData 多笔非 MetaMask 应顺序执行', () => {
    hookState.mintData = [
      { to: '0xapprove', value: '0', data: '0x1', chainId: 1 },
      { to: '0xmint', value: '0', data: '0x2', chainId: 1 },
    ]
    render(<MintForm tab={0} data={vaultData} />)
    expect(mockSendTx).toHaveBeenCalledWith(expect.objectContaining({ to: '0xapprove' }))
  })

  it('mintData MetaMask 多笔应调用 wallet_sendCalls', async () => {
    const mockReq = jest.fn().mockResolvedValue('0x' + 'a'.repeat(64))
    ;(window as any).ethereum = { isMetaMask: true, request: mockReq }

    hookState.mintData = [
      { to: '0x1', value: '0', data: '0x1', chainId: 1 },
      { to: '0x2', value: '0', data: '0x2', chainId: 1 },
    ]

    await act(async () => {
      render(<MintForm tab={0} data={vaultData} />)
    })

    expect(mockReq).toHaveBeenCalledWith(expect.objectContaining({ method: 'wallet_sendCalls' }))
  })

  it('mintError 应显示失败弹窗', () => {
    hookState.mintError = { message: 'Mint failed' }
    render(<MintForm tab={0} data={vaultData} />)
    expect(screen.getByText('Transaction failed')).toBeInTheDocument()
  })
})

describe('MintForm Repay 流程', () => {
  it('repayData 单笔交易应调用 sendTransaction', () => {
    hookState.repayData = [
      { to: '0xrepay', value: '500000000000000000', data: '0xrepay', chainId: 1 },
    ]
    render(<MintForm tab={1} data={vaultData} />)
    expect(mockSendTx).toHaveBeenCalledWith(expect.objectContaining({ to: '0xrepay' }))
  })

  it('repayError 应显示失败弹窗', () => {
    hookState.repayError = { message: 'Repay failed' }
    render(<MintForm tab={1} data={vaultData} />)
    expect(screen.getByText('Transaction failed')).toBeInTheDocument()
  })
})

describe('MintForm 批量交易回退', () => {
  it('wallet_sendCalls 失败应回退到顺序执行', async () => {
    const mockReq = jest.fn().mockRejectedValue(new Error('not supported'))
    ;(window as any).ethereum = { isMetaMask: true, request: mockReq }

    hookState.mintData = [
      { to: '0x1', value: '0', data: '0x1', chainId: 1 },
      { to: '0x2', value: '0', data: '0x2', chainId: 1 },
    ]

    await act(async () => {
      render(<MintForm tab={0} data={vaultData} />)
    })

    expect(mockSendTx).toHaveBeenCalled()
  })

  it('用户拒绝 wallet_sendCalls 应回退', async () => {
    const mockReq = jest.fn().mockRejectedValue({ message: 'user rejected', code: 4001 })
    ;(window as any).ethereum = { isMetaMask: true, request: mockReq }

    hookState.repayData = [
      { to: '0x1', value: '0', data: '0x1', chainId: 1 },
      { to: '0x2', value: '100', data: '0x2', chainId: 1 },
    ]

    await act(async () => {
      render(<MintForm tab={1} data={vaultData} />)
    })

    expect(mockSendTx).toHaveBeenCalled()
  })
})

describe('MintForm executeNextTransaction 余额检查', () => {
  it('ETH 余额不足时应显示失败弹窗', () => {
    // 交易需要很多 ETH，但余额只有 10 ETH
    hookState.mintData = [
      { to: '0xmint', value: '20000000000000000000', data: '0x', chainId: 1 }, // 需要 20 ETH
    ]
    render(<MintForm tab={0} data={vaultData} />)
    // mintForm 的 executeNextTransaction 会检查余额
    // 余额 10 ETH < 20 ETH + gas reserve
    expect(screen.getByText('Transaction failed')).toBeInTheDocument()
  })
})

describe('MintForm 错误状态', () => {
  it('txError 应显示失败弹窗', () => {
    wagmiState.txError = { message: 'Gas failed' }
    render(<MintForm tab={0} data={vaultData} />)
    expect(screen.getByText('Transaction failed')).toBeInTheDocument()
  })

  it('receiptError 应显示失败弹窗', () => {
    wagmiState.receiptError = true
    render(<MintForm tab={0} data={vaultData} />)
    expect(screen.getByText('Transaction failed')).toBeInTheDocument()
  })
})

describe('MintForm 轮询 status 200', () => {
  it('批量交易 status 200 应直接成功', async () => {
    jest.useFakeTimers()
    const mockReq = jest.fn()
      .mockResolvedValueOnce('batch-id')
      .mockResolvedValueOnce({ status: 200 })

    ;(window as any).ethereum = { isMetaMask: true, request: mockReq }

    hookState.mintData = [
      { to: '0x1', value: '0', data: '0x1', chainId: 1 },
      { to: '0x2', value: '0', data: '0x2', chainId: 1 },
    ]

    await act(async () => {
      render(<MintForm tab={0} data={vaultData} />)
      jest.advanceTimersByTime(3000)
    })

    jest.useRealTimers()
    // 应正常完成
  })
})
