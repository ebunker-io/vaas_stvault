/**
 * CreateVaultForm 组件测试
 *
 * 覆盖：
 * - 渲染（标题、协议、锁定金额、奖励率、按钮）
 * - 余额不足提示
 * - 创建 vault 交易流程
 * - 成功/失败弹窗
 */

// ---- Mocks ----
const mockPush = jest.fn()
jest.mock('next/router', () => ({
  __esModule: true,
  default: { push: mockPush, back: jest.fn() },
  useRouter: () => ({ push: mockPush, query: {} }),
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
let mockCreateData: any = undefined
let mockCreateError: any = undefined
let mockTxData: any = undefined
let mockTxError: any = undefined
let mockBalanceValue = BigInt('10000000000000000000') // 10 ETH
let mockReceiptSuccess = false
let mockReceiptError = false

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: '0x1234567890abcdef1234567890abcdef12345678' }),
  useBalance: () => ({ data: { value: mockBalanceValue } }),
  useSendTransaction: () => ({
    sendTransaction: mockSendTransaction,
    isPending: false,
    data: mockTxData,
    error: mockTxError,
  }),
  useWaitForTransactionReceipt: () => ({
    isLoading: false,
    isSuccess: mockReceiptSuccess,
    isError: mockReceiptError,
  }),
}))

jest.mock('../../hooks/useStVaultDashboard', () => ({
  useStVaultCreate: () => ({
    data: mockCreateData,
    isLoading: false,
    error: mockCreateError,
  }),
}))

jest.mock('../../helpers/request', () => ({
  fetcher: jest.fn(),
  getHost: () => 'https://api.test.ebunker.io',
}))

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import CreateVaultForm from '../../components/stVaults/CreateVaultForm'

beforeEach(() => {
  jest.clearAllMocks()
  sessionStorage.clear()
  mockCreateData = undefined
  mockCreateError = undefined
  mockTxData = undefined
  mockTxError = undefined
  mockBalanceValue = BigInt('10000000000000000000')
  mockReceiptSuccess = false
  mockReceiptError = false
})

describe('CreateVaultForm 渲染', () => {
  it('应显示页面标题', () => {
    render(<CreateVaultForm address="0x1234567890abcdef1234567890abcdef12345678" apr={3.5} count={0} />)
    expect(screen.getByText('stvaults_start_staking')).toBeInTheDocument()
  })

  it('应显示协议选择', () => {
    render(<CreateVaultForm address="0x1234567890abcdef1234567890abcdef12345678" apr={3.5} count={0} />)
    expect(screen.getByText('stvaults_staking_protocol')).toBeInTheDocument()
  })

  it('应显示 1 ETH 锁定金额', () => {
    render(<CreateVaultForm address="0x1234567890abcdef1234567890abcdef12345678" apr={3.5} count={0} />)
    expect(screen.getByText('1 ETH')).toBeInTheDocument()
    expect(screen.getByText('stvaults_lock')).toBeInTheDocument()
  })

  it('应显示奖励率', () => {
    render(<CreateVaultForm address="0x1234567890abcdef1234567890abcdef12345678" apr={3.5} count={0} />)
    expect(screen.getByText('3.5 %')).toBeInTheDocument()
  })

  it('应显示创建按钮', () => {
    render(<CreateVaultForm address="0x1234567890abcdef1234567890abcdef12345678" apr={3.5} count={0} />)
    expect(screen.getByText('stvaults_create_lido_vault')).toBeInTheDocument()
  })

  it('应显示 My Vaults 链接', () => {
    render(<CreateVaultForm address="0x1234567890abcdef1234567890abcdef12345678" apr={3.5} count={0} />)
    expect(screen.getByText('my_vaults')).toBeInTheDocument()
  })
})

describe('CreateVaultForm 余额检查', () => {
  it('余额 < 1 ETH 时应显示余额不足提示', () => {
    mockBalanceValue = BigInt('500000000000000000') // 0.5 ETH
    render(<CreateVaultForm address="0x1234567890abcdef1234567890abcdef12345678" apr={3.5} count={0} />)
    expect(screen.getByText('insufficient_wallet_balance')).toBeInTheDocument()
  })

  it('余额 < 1 ETH 时创建按钮应被禁用', () => {
    mockBalanceValue = BigInt('500000000000000000')
    render(<CreateVaultForm address="0x1234567890abcdef1234567890abcdef12345678" apr={3.5} count={0} />)
    const button = screen.getByText('stvaults_create_lido_vault').closest('button')
    expect(button).toBeDisabled()
  })

  it('余额 >= 1 ETH 时不应显示余额不足', () => {
    mockBalanceValue = BigInt('2000000000000000000') // 2 ETH
    render(<CreateVaultForm address="0x1234567890abcdef1234567890abcdef12345678" apr={3.5} count={0} />)
    expect(screen.queryByText('insufficient_wallet_balance')).not.toBeInTheDocument()
  })

  it('address 为 undefined 时按钮应被禁用', () => {
    render(<CreateVaultForm address={undefined} apr={3.5} count={0} />)
    const button = screen.getByText('stvaults_create_lido_vault').closest('button')
    expect(button).toBeDisabled()
  })
})

describe('CreateVaultForm 交易流程', () => {
  it('点击创建按钮应触发交易', () => {
    mockCreateData = { to: '0xcontract', value: '1000000000000000000', data: '0xcreate' }
    render(<CreateVaultForm address="0x1234567890abcdef1234567890abcdef12345678" apr={3.5} count={0} />)
    const button = screen.getByText('stvaults_create_lido_vault').closest('button')!
    fireEvent.click(button)
    expect(mockSendTransaction).toHaveBeenCalled()
  })

  it('交易错误时应显示失败弹窗', () => {
    mockTxError = { message: 'User rejected transaction.' }
    render(<CreateVaultForm address="0x1234567890abcdef1234567890abcdef12345678" apr={3.5} count={0} />)
    expect(screen.getByText('Transaction failed')).toBeInTheDocument()
  })

  it('My Vaults 链接应导航到 dashboard', () => {
    render(<CreateVaultForm address="0x1234567890abcdef1234567890abcdef12345678" apr={3.5} count={0} />)
    fireEvent.click(screen.getByText('my_vaults'))
    expect(mockPush).toHaveBeenCalledWith('/dashboard?type=lido')
  })
})
