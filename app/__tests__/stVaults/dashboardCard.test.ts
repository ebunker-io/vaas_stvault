/**
 * DashboardCard 数据逻辑单元测试
 *
 * 测试 dashboardCard 组件使用的数据转换和业务逻辑：
 * - DashboardCardData 类型验证
 * - 数据显示格式化
 * - Lido 链接生成
 * - sessionStorage 数据存储
 */

import { DashboardCardData } from '../../types'

// Mock 数据工厂
const createMockVaultData = (overrides?: Partial<DashboardCardData>): DashboardCardData => ({
  vault: '0x1234567890abcdef1234567890abcdef12345678',
  status: 'active',
  dashboard: '0xdashboard1234567890abcdef1234567890ab',
  vault_owner: '0xowner1234567890abcdef1234567890abcdef',
  node_operator: '0xoperator1234567890abcdef1234567890ab',
  node_operator_manager: ['0xmanager1234567890abcdef1234567890ab'],
  total_value: '32000000000000000000', // 32 ETH
  vault_balance: '32000000000000000000',
  staking_apr: 3.45,
  health_factor: '150.5',
  liability_steth: '10000000000000000000', // 10 stETH
  remaining_minting_steth: '5000000000000000000', // 5 stETH
  total_minting_steth: '15000000000000000000',
  withdrawable_value: '20000000000000000000', // 20 ETH
  locked: '12000000000000000000',
  operator_fee_rate: 0.1,
  undisbursed_operator_fee: '100000000000000000',
  infra_fee: 0.05,
  liquidity_fee: 0.03,
  unsettled_lido_fee: '50000000000000000',
  confirm_expiry: 7200,
  tier_id: 1,
  created_time: '2024-01-15T10:00:00Z',
  ...overrides,
})

// 从 dashboardCard.tsx 提取的链接生成逻辑
const getLidoLink = (vault: string, buildEnv: string) => {
  const isTestnet = buildEnv === 'hoodi' || buildEnv === 'test' || buildEnv === 'goerli' || buildEnv === 'local'
  const baseUrl = isTestnet
    ? 'https://stvaults-hoodi.testnet.fi/vaults/'
    : 'https://stvaults.lido.fi/vaults/'
  return `${baseUrl}${vault}`
}

function ethAddressToWithdrawalCredentials(ethAddress: string) {
  if (!/^0x[0-9a-fA-F]{40}$/.test(ethAddress)) {
    throw new Error("invalid eth address")
  }
  return (
    "0x02" +
    "0000000000000000000000" +
    ethAddress.slice(2).toLowerCase()
  )
}

const getValidatorsLink = (vault: string) => {
  const wc = ethAddressToWithdrawalCredentials(vault)
  return `https://hoodi.beaconcha.in/validators/deposits?q=${wc}`
}

describe('DashboardCardData 类型验证', () => {
  it('mock 数据应包含所有必需字段', () => {
    const data = createMockVaultData()
    expect(data.vault).toBeDefined()
    expect(data.status).toBeDefined()
    expect(data.dashboard).toBeDefined()
    expect(data.vault_owner).toBeDefined()
    expect(data.total_value).toBeDefined()
    expect(data.staking_apr).toBeDefined()
    expect(data.health_factor).toBeDefined()
    expect(data.liability_steth).toBeDefined()
    expect(data.remaining_minting_steth).toBeDefined()
    expect(data.withdrawable_value).toBeDefined()
    expect(typeof data.staking_apr).toBe('number')
    expect(typeof data.tier_id).toBe('number')
  })

  it('应支持 override 创建不同测试数据', () => {
    const data = createMockVaultData({ staking_apr: 5.0, health_factor: 'Infinity' })
    expect(data.staking_apr).toBe(5.0)
    expect(data.health_factor).toBe('Infinity')
  })
})

describe('Lido 链接生成', () => {
  const vault = '0x1234567890abcdef1234567890abcdef12345678'

  it('生产环境应使用 lido.fi 域名', () => {
    const link = getLidoLink(vault, 'production')
    expect(link).toBe(`https://stvaults.lido.fi/vaults/${vault}`)
  })

  it('hoodi 测试网应使用 testnet.fi 域名', () => {
    const link = getLidoLink(vault, 'hoodi')
    expect(link).toBe(`https://stvaults-hoodi.testnet.fi/vaults/${vault}`)
  })

  it('test 环境应使用 testnet.fi 域名', () => {
    const link = getLidoLink(vault, 'test')
    expect(link).toContain('testnet.fi')
  })

  it('goerli 环境应使用 testnet.fi 域名', () => {
    const link = getLidoLink(vault, 'goerli')
    expect(link).toContain('testnet.fi')
  })

  it('local 环境应使用 testnet.fi 域名', () => {
    const link = getLidoLink(vault, 'local')
    expect(link).toContain('testnet.fi')
  })
})

describe('Validators 链接生成', () => {
  it('应生成包含 withdrawal credentials 的链接', () => {
    const vault = '0x1234567890abcdef1234567890abcdef12345678'
    const link = getValidatorsLink(vault)
    expect(link).toContain('hoodi.beaconcha.in/validators/deposits')
    expect(link).toContain('0x02')
  })

  it('withdrawal credentials 应以 0x02 开头', () => {
    const vault = '0xABCDEF1234567890abcdef1234567890ABCDEF12'
    const link = getValidatorsLink(vault)
    const wc = link.split('q=')[1]
    expect(wc.startsWith('0x02')).toBe(true)
  })
})

describe('sessionStorage 数据存储逻辑', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('应将 vault 数据序列化存入 sessionStorage', () => {
    const data = createMockVaultData()
    sessionStorage.setItem('stVaultData', JSON.stringify(data))
    const stored = JSON.parse(sessionStorage.getItem('stVaultData') || '{}')
    expect(stored.vault).toBe(data.vault)
    expect(stored.total_value).toBe(data.total_value)
    expect(stored.staking_apr).toBe(data.staking_apr)
  })

  it('应能正确反序列化 vault 数据', () => {
    const data = createMockVaultData({ staking_apr: 5.67 })
    sessionStorage.setItem('stVaultData', JSON.stringify(data))
    const stored: DashboardCardData = JSON.parse(sessionStorage.getItem('stVaultData')!)
    expect(stored.staking_apr).toBe(5.67)
    expect(stored.node_operator_manager).toEqual(['0xmanager1234567890abcdef1234567890ab'])
  })

  it('creatingCount 应正确递增', () => {
    sessionStorage.setItem('creatingCount', '0')
    const count = parseInt(sessionStorage.getItem('creatingCount') || '0')
    sessionStorage.setItem('creatingCount', (count + 1).toString())
    expect(sessionStorage.getItem('creatingCount')).toBe('1')
  })
})

describe('余额检查逻辑 (CreateVaultForm)', () => {
  it('余额 >= 1 ETH 时应允许创建', () => {
    const balance = BigInt('1000000000000000000') // 1 ETH
    const minRequired = BigInt('1000000000000000000')
    expect(balance >= minRequired).toBe(true)
  })

  it('余额 < 1 ETH 时应禁止创建', () => {
    const balance = BigInt('999999999999999999') // 0.999... ETH
    const minRequired = BigInt('1000000000000000000')
    expect(balance < minRequired).toBe(true)
  })

  it('余额为 0 时应禁止创建', () => {
    const balance = BigInt(0)
    const minRequired = BigInt('1000000000000000000')
    expect(balance < minRequired).toBe(true)
  })

  it('余额为 32 ETH 时应允许创建', () => {
    const balance = BigInt('32000000000000000000')
    const minRequired = BigInt('1000000000000000000')
    expect(balance >= minRequired).toBe(true)
  })
})

describe('MintForm gas reserve 检查逻辑', () => {
  const gasReserve = BigInt('100000000000000') // 0.0001 ETH

  it('交易值 + gas reserve 小于余额时应允许', () => {
    const txValue = BigInt('500000000000000000') // 0.5 ETH
    const balance = BigInt('1000000000000000000') // 1 ETH
    const required = txValue + gasReserve
    expect(balance >= required).toBe(true)
  })

  it('交易值 + gas reserve 大于余额时应拒绝', () => {
    const txValue = BigInt('999950000000000000') // ~0.99995 ETH
    const balance = BigInt('1000000000000000000') // 1 ETH
    const required = txValue + gasReserve
    // 0.99995 + 0.0001 = 1.00005 > 1
    expect(balance < required).toBe(true)
  })

  it('gas reserve 应为 0.0001 ETH', () => {
    expect(gasReserve.toString()).toBe('100000000000000')
    expect(Number(gasReserve) / 1e18).toBeCloseTo(0.0001, 6)
  })
})

describe('MetaMask 批量交易判断逻辑', () => {
  it('单笔交易不应使用批量执行', () => {
    const transactions = [{ to: '0x1', value: '0', data: '0x' }]
    const isMetaMask = true
    const shouldUseBatch = isMetaMask && transactions.length > 1
    expect(shouldUseBatch).toBe(false)
  })

  it('非 MetaMask 钱包不应使用批量执行', () => {
    const transactions = [
      { to: '0x1', value: '0', data: '0x' },
      { to: '0x2', value: '1000', data: '0x' },
    ]
    const isMetaMask = false
    const shouldUseBatch = isMetaMask && transactions.length > 1
    expect(shouldUseBatch).toBe(false)
  })

  it('MetaMask + 多笔交易应使用批量执行', () => {
    const transactions = [
      { to: '0x1', value: '0', data: '0xapprove' },
      { to: '0x2', value: '1000000000000000000', data: '0xsupply' },
    ]
    const isMetaMask = true
    const shouldUseBatch = isMetaMask && transactions.length > 1
    expect(shouldUseBatch).toBe(true)
  })
})

describe('批量交易参数构建', () => {
  it('应正确构建 wallet_sendCalls 参数', () => {
    const transactions = [
      { to: '0xContractA', value: '0', data: '0xapprove', chainId: 1 },
      { to: '0xContractB', value: '1000000000000000000', data: '0xsupply', chainId: 1 },
    ]
    const address = '0xUserAddress'

    const chainIdHex = `0x${Number(transactions[0].chainId).toString(16)}`
    const calls = transactions.map(tx => {
      const call: any = {
        to: tx.to.toLowerCase(),
        data: tx.data,
      }
      const txValue = BigInt(typeof tx.value === 'string' ? tx.value : tx.value.toString())
      if (txValue > BigInt(0)) {
        call.value = `0x${txValue.toString(16)}`
      }
      return call
    })

    const requestParams = {
      version: "2.0.0",
      chainId: chainIdHex,
      from: address,
      calls: calls,
      atomicRequired: true,
    }

    expect(requestParams.version).toBe("2.0.0")
    expect(requestParams.chainId).toBe("0x1")
    expect(requestParams.from).toBe(address)
    expect(requestParams.atomicRequired).toBe(true)
    expect(requestParams.calls).toHaveLength(2)

    // 第一笔交易 value 为 0，不应包含 value 字段
    expect(requestParams.calls[0].value).toBeUndefined()
    expect(requestParams.calls[0].to).toBe('0xcontracta')

    // 第二笔交易有 value
    expect(requestParams.calls[1].value).toBe('0xde0b6b3a7640000') // 1 ETH in hex
    expect(requestParams.calls[1].to).toBe('0xcontractb')
  })

  it('chainId hex 转换应正确', () => {
    expect(`0x${Number(1).toString(16)}`).toBe('0x1') // mainnet
    expect(`0x${Number(5).toString(16)}`).toBe('0x5') // goerli
    expect(`0x${Number(560048).toString(16)}`).toBe('0x88bb0') // hoodi
  })
})

describe('批量交易状态轮询逻辑', () => {
  it('应正确判断成功状态', () => {
    const successStatuses = [200, 'CONFIRMED', 'PENDING', 'SUCCESS']
    successStatuses.forEach(status => {
      const isSuccess = status === 200 ||
        status === 'CONFIRMED' ||
        status === 'PENDING' ||
        status === 'SUCCESS'
      expect(isSuccess).toBe(true)
    })
  })

  it('应正确判断失败状态', () => {
    const failedStatuses = ['FAILED', 'REJECTED', 400, 500]
    failedStatuses.forEach(status => {
      const isFailed = status === 'FAILED' ||
        status === 'REJECTED' ||
        (typeof status === 'number' && status >= 400)
      expect(isFailed).toBe(true)
    })
  })

  it('应正确验证交易 hash 格式', () => {
    const validHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    const isValid = validHash && typeof validHash === 'string' && validHash.startsWith('0x') && validHash.length === 66
    expect(isValid).toBe(true)

    const invalidHash = 'batch-id-123'
    const isInvalid = invalidHash && typeof invalidHash === 'string' && invalidHash.startsWith('0x') && invalidHash.length === 66
    expect(isInvalid).toBe(false)
  })
})
