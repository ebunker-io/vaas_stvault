/**
 * helpers/batchTransaction.ts 单元测试
 *
 * 测试从组件中提取的批量交易工具函数，覆盖所有分支。
 */

import {
  parseSendCallsResult,
  isSuccessStatus,
  isFailedStatus,
  extractTxHashFromStatus,
  isValidTxHash,
  buildSendCallsParams,
  shouldUseBatch,
  detectMetaMask,
} from '../../helpers/batchTransaction'

describe('parseSendCallsResult', () => {
  it('字符串结果', () => {
    const r = parseSendCallsResult('0xabc123')
    expect(r.txHash).toBe('0xabc123')
    expect(r.batchId).toBe('0xabc123')
  })

  it('数组结果', () => {
    const r = parseSendCallsResult(['0xhash1', '0xhash2'])
    expect(r.txHash).toBe('0xhash1')
    expect(r.batchId).toBe('0xhash1')
  })

  it('对象结果 - txHash', () => {
    const r = parseSendCallsResult({ txHash: '0xh1', id: 'batch-1' })
    expect(r.txHash).toBe('0xh1')
    expect(r.batchId).toBe('batch-1')
  })

  it('对象结果 - hash', () => {
    const r = parseSendCallsResult({ hash: '0xh2', batchId: 'b2' })
    expect(r.txHash).toBe('0xh2')
    expect(r.batchId).toBe('b2')
  })

  it('对象结果 - 只有 batchId', () => {
    const r = parseSendCallsResult({ batchId: 'batch-only' })
    expect(r.txHash).toBeUndefined()
    expect(r.batchId).toBe('batch-only')
  })

  it('null 结果', () => {
    const r = parseSendCallsResult(null)
    expect(r.batchId).toBeUndefined()
  })

  it('undefined 结果', () => {
    const r = parseSendCallsResult(undefined)
    expect(r.batchId).toBeUndefined()
  })

  it('空数组结果', () => {
    const r = parseSendCallsResult([])
    expect(r.batchId).toBeUndefined()
  })

  it('空对象结果', () => {
    const r = parseSendCallsResult({})
    expect(r.txHash).toBeUndefined()
    expect(r.batchId).toBeUndefined()
  })
})

describe('isSuccessStatus', () => {
  it('200 → true', () => expect(isSuccessStatus(200)).toBe(true))
  it('CONFIRMED → true', () => expect(isSuccessStatus('CONFIRMED')).toBe(true))
  it('PENDING → true', () => expect(isSuccessStatus('PENDING')).toBe(true))
  it('SUCCESS → true', () => expect(isSuccessStatus('SUCCESS')).toBe(true))
  it('FAILED → false', () => expect(isSuccessStatus('FAILED')).toBe(false))
  it('500 → false', () => expect(isSuccessStatus(500)).toBe(false))
  it('null → false', () => expect(isSuccessStatus(null)).toBe(false))
  it('0 → false', () => expect(isSuccessStatus(0)).toBe(false))
})

describe('isFailedStatus', () => {
  it('FAILED → true', () => expect(isFailedStatus('FAILED')).toBe(true))
  it('REJECTED → true', () => expect(isFailedStatus('REJECTED')).toBe(true))
  it('400 → true', () => expect(isFailedStatus(400)).toBe(true))
  it('500 → true', () => expect(isFailedStatus(500)).toBe(true))
  it('200 → false', () => expect(isFailedStatus(200)).toBe(false))
  it('CONFIRMED → false', () => expect(isFailedStatus('CONFIRMED')).toBe(false))
  it('PENDING → false', () => expect(isFailedStatus('PENDING')).toBe(false))
  it('399 → false', () => expect(isFailedStatus(399)).toBe(false))
})

describe('extractTxHashFromStatus', () => {
  it('从 calls[last].hash 提取', () => {
    expect(extractTxHashFromStatus({ calls: [{ hash: '0xfirst' }, { hash: '0xlast' }] })).toBe('0xlast')
  })
  it('从 calls[last].txHash 提取', () => {
    expect(extractTxHashFromStatus({ calls: [{ txHash: '0xonly' }] })).toBe('0xonly')
  })
  it('从 calls[last].transactionHash 提取', () => {
    expect(extractTxHashFromStatus({ calls: [{ transactionHash: '0xtx' }] })).toBe('0xtx')
  })
  it('从 transactions[last].hash 提取', () => {
    expect(extractTxHashFromStatus({ transactions: [{ hash: '0xtxhash' }] })).toBe('0xtxhash')
  })
  it('从 transactions[last].transactionHash 提取', () => {
    expect(extractTxHashFromStatus({ transactions: [{ transactionHash: '0xth' }] })).toBe('0xth')
  })
  it('从根级别 txHash 提取', () => {
    expect(extractTxHashFromStatus({ txHash: '0xroot' })).toBe('0xroot')
  })
  it('从根级别 hash 提取', () => {
    expect(extractTxHashFromStatus({ hash: '0xroothash' })).toBe('0xroothash')
  })
  it('从根级别 transactionHash 提取', () => {
    expect(extractTxHashFromStatus({ transactionHash: '0xrootth' })).toBe('0xrootth')
  })
  it('calls 优先于 transactions', () => {
    expect(extractTxHashFromStatus({
      calls: [{ hash: '0xcall' }],
      transactions: [{ hash: '0xtx' }],
      hash: '0xroot',
    })).toBe('0xcall')
  })
  it('transactions 优先于根级别', () => {
    expect(extractTxHashFromStatus({
      transactions: [{ hash: '0xtx' }],
      hash: '0xroot',
    })).toBe('0xtx')
  })
  it('空 calls 应尝试 transactions', () => {
    expect(extractTxHashFromStatus({ calls: [], transactions: [{ hash: '0xfb' }] })).toBe('0xfb')
  })
  it('全空应返回 undefined', () => {
    expect(extractTxHashFromStatus({})).toBeUndefined()
  })
})

describe('isValidTxHash', () => {
  it('有效 hash', () => expect(isValidTxHash('0x' + 'a'.repeat(64))).toBe(true))
  it('太短', () => expect(isValidTxHash('0xabc')).toBe(false))
  it('不以 0x 开头', () => expect(isValidTxHash('a'.repeat(66))).toBe(false))
  it('undefined', () => expect(isValidTxHash(undefined)).toBe(false))
  it('空字符串', () => expect(isValidTxHash('')).toBe(false))
  it('batch ID', () => expect(isValidTxHash('batch-abc-123')).toBe(false))
})

describe('buildSendCallsParams', () => {
  it('应正确构建参数', () => {
    const txs = [
      { to: '0xApprove', value: '0', data: '0xapprove', chainId: 1 },
      { to: '0xSupply', value: '1000000000000000000', data: '0xsupply', chainId: 1 },
    ]
    const result = buildSendCallsParams(txs, '0xUser')
    expect(result.version).toBe("2.0.0")
    expect(result.chainId).toBe("0x1")
    expect(result.from).toBe('0xUser')
    expect(result.atomicRequired).toBe(true)
    expect(result.calls).toHaveLength(2)
    expect(result.calls[0].to).toBe('0xapprove')
    expect(result.calls[0].value).toBeUndefined()
    expect(result.calls[1].to).toBe('0xsupply')
    expect(result.calls[1].value).toBe('0xde0b6b3a7640000')
  })

  it('chainId 560048 (hoodi)', () => {
    const txs = [{ to: '0x1', value: '0', data: '0x', chainId: 560048 }]
    expect(buildSendCallsParams(txs, '0xU').chainId).toBe('0x88bb0')
  })

  it('无 chainId 应抛错', () => {
    expect(() => buildSendCallsParams([{ to: '0x1', value: '0', data: '0x' }], '0xU')).toThrow('Chain ID not found')
  })

  it('value 为数字类型', () => {
    const r = buildSendCallsParams([{ to: '0x1', value: 1000, data: '0x', chainId: 1 }], '0xU')
    expect(r.calls[0].value).toBe('0x3e8')
  })

  it('地址应转小写', () => {
    const r = buildSendCallsParams([{ to: '0xAAAA', value: '0', data: '0x', chainId: 1 }], '0xU')
    expect(r.calls[0].to).toBe('0xaaaa')
  })
})

describe('shouldUseBatch', () => {
  it('MetaMask + 多笔 → true', () => expect(shouldUseBatch(true, 2)).toBe(true))
  it('MetaMask + 1笔 → false', () => expect(shouldUseBatch(true, 1)).toBe(false))
  it('非 MetaMask + 多笔 → false', () => expect(shouldUseBatch(false, 3)).toBe(false))
  it('非 MetaMask + 1笔 → false', () => expect(shouldUseBatch(false, 1)).toBe(false))
  it('MetaMask + 0笔 → false', () => expect(shouldUseBatch(true, 0)).toBe(false))
})

describe('detectMetaMask', () => {
  beforeEach(() => { delete (window as any).ethereum })

  it('isMetaMask=true → true', () => {
    (window as any).ethereum = { isMetaMask: true }
    expect(detectMetaMask()).toBe(true)
  })

  it('_metamask 存在 → true', () => {
    (window as any).ethereum = { _metamask: {} }
    expect(detectMetaMask()).toBe(true)
  })

  it('providers 中有 MetaMask → true', () => {
    (window as any).ethereum = { providers: [{ isMetaMask: true }] }
    expect(detectMetaMask()).toBe(true)
  })

  it('providers 中无 MetaMask → false', () => {
    (window as any).ethereum = { providers: [{ isMetaMask: false }] }
    expect(detectMetaMask()).toBe(false)
  })

  it('无 ethereum → false', () => {
    expect(detectMetaMask()).toBe(false)
  })

  it('空对象 → false', () => {
    (window as any).ethereum = {}
    expect(detectMetaMask()).toBe(false)
  })

  it('isMetaMask=false → false', () => {
    (window as any).ethereum = { isMetaMask: false }
    expect(detectMetaMask()).toBe(false)
  })
})
