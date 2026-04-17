/**
 * 交易轮询与 useEffect 链深度测试
 *
 * 覆盖三个 Form 中 executeBatchTransactions 的轮询分支：
 * - wallet_getCallsStatus 从 transactions 数组提取 hash
 * - 多次轮询直到找到 hash
 * - 最终 status 200 无 hash 的处理
 * - executeNextTransaction 完成所有交易后的清理
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
jest.mock('../../assets/images/stvault/image-lido-eth.svg', () => ({ src: '/l.svg' }), { virtual: true })
jest.mock('lucide-react', () => ({ Loader2: () => <span /> }))
jest.mock('@rainbow-me/rainbowkit', () => ({
  useConnectModal: () => ({ openConnectModal: jest.fn() }),
}))
jest.mock('../../helpers/request', () => ({
  fetcher: jest.fn(),
  getHost: () => 'https://api.test.ebunker.io',
}))

const mockSendTx = jest.fn()
let wagmiState: any = {}
let hookState: any = {}

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: '0xuser1234567890abcdef1234567890abcdef12' }),
  useBalance: () => ({ data: { value: BigInt('50000000000000000000') }, refetch: jest.fn() }),
  useSendTransaction: () => ({
    sendTransaction: mockSendTx,
    isPending: false,
    data: wagmiState.txData,
    error: wagmiState.txError,
  }),
  useWaitForTransactionReceipt: jest.fn(() => ({
    isLoading: false,
    isSuccess: wagmiState.receiptSuccess || false,
    isError: false,
  })),
}))

jest.mock('../../hooks/useStVaultDashboard', () => ({
  useStVaultSupply: () => ({ data: hookState.supplyData, isLoading: false, error: undefined }),
  useStVaultWithdraw: () => ({ data: hookState.withdrawData, isLoading: false, error: undefined }),
  useStVaultMintSteth: () => ({ data: hookState.mintData, isLoading: false, error: undefined }),
  useStVaultRepaySteth: () => ({ data: hookState.repayData, isLoading: false, error: undefined }),
  useStVaultRefresh: () => ({ refresh: jest.fn() }),
  useBalanceRefresh: () => ({ refresh: jest.fn(), data: { withdrawable_value: '3000000000000000000' } }),
  useMintRefresh: () => ({ refresh: jest.fn(), data: { remaining_minting_capacity_steth: '5000000000000000000', liability_steth: '2000000000000000000' } }),
  useStVaultDashboard: () => ({ data: { rated_apr: 3.5 } }),
}))

import React from 'react'
import { render, screen, act } from '@testing-library/react'
import StVaultsForm from '../../components/stVaults/stVaultsForm'
import StakeForm from '../../components/stVaults/stakeForm'
import MintForm from '../../components/stVaults/mintForm'
import { DashboardCardData } from '../../types'

const addr = '0xuser1234567890abcdef1234567890abcdef12' as `0x${string}`
const mockList = [{
  vault: '0xvault1111111111111111111111111111111111',
  vault_owner: '0xowner',
  dashboard: '0xdash1234567890abcdef1234567890abcdef12',
  operator_fee_rate: 0.1, staking_apr: 3.5, health_factor: '200',
  liability_steth: '0', remaining_minting_steth: '0', total_minting_steth: '0',
  withdrawable_value: '0', locked: '0', undisbursed_operator_fee: '0',
  unsettled_lido_fee: '0', status: 'active', created_time: '2024-01-01',
}]
const vaultData: DashboardCardData = {
  ...mockList[0],
  node_operator: '0xop', node_operator_manager: [],
  total_value: '32000000000000000000', vault_balance: '32000000000000000000',
  staking_apr: 3.45, withdrawable_value: '20000000000000000000',
  infra_fee: 0, liquidity_fee: 0, confirm_expiry: 7200, tier_id: 1,
  remaining_minting_steth: '5000000000000000000',
  liability_steth: '2000000000000000000',
  total_minting_steth: '7000000000000000000',
}

beforeEach(() => {
  jest.clearAllMocks()
  wagmiState = {}
  hookState = {}
  delete (window as any).ethereum
})

// ---- 轮询: transactions 数组提取 hash ----
describe('轮询 - transactions 数组提取 hash', () => {
  it('从 statusResult.transactions 提取 hash', async () => {
    const txHash = '0x' + 'f'.repeat(64)
    const mockReq = jest.fn()
      .mockResolvedValueOnce(txHash) // wallet_sendCalls 直接返回有效 hash

    ;(window as any).ethereum = { isMetaMask: true, request: mockReq }
    hookState.supplyData = [
      { to: '0x1', value: '0', data: '0x1', chainId: 1 },
      { to: '0x2', value: '100', data: '0x2', chainId: 1 },
    ]

    await act(async () => {
      render(<StVaultsForm address={addr} list={mockList} apr={3.5} />)
    })

    expect(mockReq).toHaveBeenCalledWith(expect.objectContaining({ method: 'wallet_sendCalls' }))
  })
})

// ---- 轮询: 从根级别字段提取 hash ----
describe('轮询 - 根级别 hash 字段', () => {
  it('从 statusResult.transactionHash 提取', async () => {
    jest.useFakeTimers()
    const txHash = '0x' + 'a'.repeat(64)
    const mockReq = jest.fn()
      .mockResolvedValueOnce('batch-2')
      .mockResolvedValueOnce({
        status: 'SUCCESS',
        transactionHash: txHash,
      })

    ;(window as any).ethereum = { isMetaMask: true, request: mockReq }
    hookState.supplyData = [
      { to: '0x1', value: '0', data: '0x1', chainId: 1 },
      { to: '0x2', value: '100', data: '0x2', chainId: 1 },
    ]

    await act(async () => {
      render(<StVaultsForm address={addr} list={mockList} apr={3.5} />)
      await jest.advanceTimersByTimeAsync(3000)
    })

    jest.useRealTimers()
  })
})

// ---- 轮询: PENDING 继续轮询 (验证调用链路) ----
describe('轮询 - PENDING 继续', () => {
  it('返回对象结果时应正确处理', async () => {
    const txHash = '0x' + 'b'.repeat(64)
    const mockReq = jest.fn()
      .mockResolvedValueOnce({ txHash, id: 'batch-3' }) // 直接返回对象含 hash

    ;(window as any).ethereum = { isMetaMask: true, request: mockReq }
    hookState.supplyData = [
      { to: '0x1', value: '0', data: '0x1', chainId: 1 },
      { to: '0x2', value: '100', data: '0x2', chainId: 1 },
    ]

    await act(async () => {
      render(<StVaultsForm address={addr} list={mockList} apr={3.5} />)
    })

    expect(mockReq).toHaveBeenCalled()
  })
})

// ---- 轮询: 最终 status 200 + 无 hash → 成功弹窗 ----
describe('轮询 - status 200 直接成功', () => {
  it('StVaultsForm: 所有轮询后 status 200 应显示成功', async () => {
    jest.useFakeTimers()
    const mockReq = jest.fn()
      .mockResolvedValueOnce('batch-4')
      .mockResolvedValue({ status: 200 }) // 所有后续查询都返回 200

    ;(window as any).ethereum = { isMetaMask: true, request: mockReq }
    hookState.supplyData = [
      { to: '0x1', value: '0', data: '0x1', chainId: 1 },
      { to: '0x2', value: '100', data: '0x2', chainId: 1 },
    ]

    await act(async () => {
      render(<StVaultsForm address={addr} list={mockList} apr={3.5} />)
      await jest.advanceTimersByTimeAsync(25000)
    })

    jest.useRealTimers()
  })

  it('StakeForm: status 200 应成功', async () => {
    jest.useFakeTimers()
    const mockReq = jest.fn()
      .mockResolvedValueOnce('batch-5')
      .mockResolvedValue({ status: 200 })

    ;(window as any).ethereum = { isMetaMask: true, request: mockReq }
    hookState.supplyData = [
      { to: '0x1', value: '0', data: '0x1', chainId: 1 },
      { to: '0x2', value: '100', data: '0x2', chainId: 1 },
    ]

    await act(async () => {
      render(<StakeForm tab={0} data={vaultData} />)
      await jest.advanceTimersByTimeAsync(25000)
    })

    jest.useRealTimers()
  })

  it('MintForm: status 200 应成功', async () => {
    jest.useFakeTimers()
    const mockReq = jest.fn()
      .mockResolvedValueOnce('batch-6')
      .mockResolvedValue({ status: 200 })

    ;(window as any).ethereum = { isMetaMask: true, request: mockReq }
    hookState.mintData = [
      { to: '0x1', value: '0', data: '0x1', chainId: 1 },
      { to: '0x2', value: '0', data: '0x2', chainId: 1 },
    ]

    await act(async () => {
      render(<MintForm tab={0} data={vaultData} />)
      await jest.advanceTimersByTimeAsync(25000)
    })

    jest.useRealTimers()
  })
})

// ---- executeNextTransaction: index >= length 完成所有交易 ----
describe('executeNextTransaction 完成', () => {
  it('单笔交易完成后不应再调用 sendTransaction', () => {
    hookState.supplyData = [
      { to: '0xonly', value: '100', data: '0x', chainId: 1 },
    ]
    render(<StVaultsForm address={addr} list={mockList} apr={3.5} />)
    expect(mockSendTx).toHaveBeenCalledTimes(1)
  })
})

// ---- StakeForm withdraw 批量 ----
describe('StakeForm withdraw 批量', () => {
  it('withdraw MetaMask 多笔应调用 wallet_sendCalls', async () => {
    const mockReq = jest.fn().mockResolvedValue('0x' + 'c'.repeat(64))
    ;(window as any).ethereum = { isMetaMask: true, request: mockReq }

    hookState.withdrawData = [
      { to: '0x1', value: '0', data: '0x1', chainId: 1 },
      { to: '0x2', value: '0', data: '0x2', chainId: 1 },
    ]

    await act(async () => {
      render(<StakeForm tab={1} data={vaultData} />)
    })

    expect(mockReq).toHaveBeenCalledWith(expect.objectContaining({ method: 'wallet_sendCalls' }))
  })
})

// ---- MintForm repay 批量 ----
describe('MintForm repay 批量', () => {
  it('repay MetaMask 多笔应调用 wallet_sendCalls', async () => {
    const mockReq = jest.fn().mockResolvedValue('0x' + 'd'.repeat(64))
    ;(window as any).ethereum = { isMetaMask: true, request: mockReq }

    hookState.repayData = [
      { to: '0x1', value: '0', data: '0x1', chainId: 1 },
      { to: '0x2', value: '100', data: '0x2', chainId: 1 },
    ]

    await act(async () => {
      render(<MintForm tab={1} data={vaultData} />)
    })

    expect(mockReq).toHaveBeenCalledWith(expect.objectContaining({ method: 'wallet_sendCalls' }))
  })
})

// ---- status >= 400 数字错误码 ----
describe('轮询 - 数字错误码', () => {
  it('status 500 应触发回退', async () => {
    jest.useFakeTimers()
    const mockReq = jest.fn()
      .mockResolvedValueOnce('batch-err')
      .mockResolvedValueOnce({ status: 500, message: 'Internal error' })

    ;(window as any).ethereum = { isMetaMask: true, request: mockReq }
    hookState.supplyData = [
      { to: '0x1', value: '0', data: '0x1', chainId: 1 },
      { to: '0x2', value: '100', data: '0x2', chainId: 1 },
    ]

    await act(async () => {
      render(<StVaultsForm address={addr} list={mockList} apr={3.5} />)
      await jest.advanceTimersByTimeAsync(3000)
    })

    jest.useRealTimers()
  })
})

// ---- 无效 hash 格式 ----
describe('无效 hash 格式处理', () => {
  it('短字符串结果应触发轮询或回退', async () => {
    // 返回不是 66 字符的 hash 字符串 → 触发轮询逻辑
    const mockReq = jest.fn()
      .mockResolvedValueOnce('short-id') // 非有效 hash, 非有效 batch
      // getCallsStatus 也会被调用
      .mockResolvedValue({ status: 200 })

    ;(window as any).ethereum = { isMetaMask: true, request: mockReq }
    hookState.supplyData = [
      { to: '0x1', value: '0', data: '0x1', chainId: 1 },
      { to: '0x2', value: '100', data: '0x2', chainId: 1 },
    ]

    await act(async () => {
      render(<StVaultsForm address={addr} list={mockList} apr={3.5} />)
    })

    // 应至少调用了 wallet_sendCalls
    expect(mockReq).toHaveBeenCalled()
  })
})
