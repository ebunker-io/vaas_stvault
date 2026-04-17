/**
 * MetaMask wallet_sendCalls 批量交易工具函数
 *
 * 从 stVaultsForm / stakeForm / mintForm 中提取的共享逻辑。
 */

/** 解析 wallet_sendCalls 返回值 */
export function parseSendCallsResult(result: any): { batchId?: string; txHash?: string } {
  let batchId: string | undefined
  let txHash: string | undefined

  if (typeof result === 'string') {
    txHash = result
    batchId = result
  } else if (Array.isArray(result) && result.length > 0) {
    txHash = result[0]
    batchId = result[0]
  } else if (result && typeof result === 'object') {
    txHash = result.txHash || result.hash
    batchId = result.id || result.batchId || txHash
  }

  return { batchId, txHash }
}

/** 判断轮询状态是否成功 */
export function isSuccessStatus(status: any): boolean {
  return status === 200 ||
    status === 'CONFIRMED' ||
    status === 'PENDING' ||
    status === 'SUCCESS'
}

/** 判断轮询状态是否失败 */
export function isFailedStatus(status: any): boolean {
  return status === 'FAILED' ||
    status === 'REJECTED' ||
    (typeof status === 'number' && status >= 400)
}

/** 从 statusResult 中提取交易 hash */
export function extractTxHashFromStatus(statusResult: any): string | undefined {
  let txHash: string | undefined

  if (statusResult.calls && Array.isArray(statusResult.calls) && statusResult.calls.length > 0) {
    const lastCall = statusResult.calls[statusResult.calls.length - 1]
    txHash = lastCall.hash || lastCall.txHash || lastCall.transactionHash
  }

  if (!txHash && statusResult.transactions && Array.isArray(statusResult.transactions) && statusResult.transactions.length > 0) {
    const lastTx = statusResult.transactions[statusResult.transactions.length - 1]
    txHash = lastTx.hash || lastTx.txHash || lastTx.transactionHash
  }

  if (!txHash) {
    txHash = statusResult.txHash || statusResult.hash || statusResult.transactionHash
  }

  return txHash
}

/** 验证交易 hash 格式 */
export function isValidTxHash(hash: string | undefined): boolean {
  return !!hash && typeof hash === 'string' && hash.startsWith('0x') && hash.length === 66
}

/** 构建 wallet_sendCalls 请求参数 */
export function buildSendCallsParams(transactions: any[], address: string) {
  const chainId = transactions[0]?.chainId
  if (!chainId) throw new Error('Chain ID not found in transaction data')

  const chainIdHex = `0x${Number(chainId).toString(16)}`
  const calls = transactions.map((tx: any) => {
    const call: any = { to: tx.to.toLowerCase(), data: tx.data }
    const txValue = BigInt(typeof tx.value === 'string' ? tx.value : tx.value.toString())
    if (txValue > BigInt(0)) {
      call.value = `0x${txValue.toString(16)}`
    }
    return call
  })

  return {
    version: "2.0.0",
    chainId: chainIdHex,
    from: address,
    calls,
    atomicRequired: true,
  }
}

/** 判断是否应使用批量交易 */
export function shouldUseBatch(isMetaMask: boolean, txCount: number): boolean {
  return isMetaMask && txCount > 1
}

/** MetaMask 检测 */
export function detectMetaMask(): boolean {
  if (typeof window === 'undefined') return false
  const ethereum = (window as any).ethereum
  if (!ethereum) return false
  return !!(
    ethereum.isMetaMask === true ||
    ethereum._metamask !== undefined ||
    (ethereum.providers && Array.isArray(ethereum.providers) &&
      ethereum.providers.some((p: any) => p.isMetaMask === true))
  )
}
