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
// PENDING 不算成功 —— 它的语义是"已提交到 mempool、未上链"。
// 若把它当 success，调用方会在 tx 实际未确认时就弹"操作成功"，
// 之后若 tx revert 用户已经离开页面，账面和实际状态不一致。
// 让 PENDING 落到"既非 success 也非 fail"的桶里，轮询循环继续。
export function isSuccessStatus(status: any): boolean {
  return status === 200 ||
    status === 'CONFIRMED' ||
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
// EIP-5792 的 calls schema 仅允许 to/value/data/chainId/capabilities，没有顶层 gas 字段；
// MetaMask 会严格校验并以 `Expected type never` 拒绝整个 request。如果后续需要透传
// 后端算好的 gas，要走 capabilities 协议，并按钱包能力降级。
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

/**
 * wallet_sendCalls 编排结果：
 * - `{ kind: 'hash', txHash }` —— 拿到了有效的 0x66 字符 hash，调用方应进入"等待 receipt"流程
 * - `{ kind: 'batch_success_no_hash' }` —— 轮询最终状态 200 但没拿到 hash，
 *   钱包/relay 已确认 batch 成功，调用方应直接走"成功收尾"流程
 */
export type BatchSendCallsOutcome =
  | { kind: 'hash'; txHash: `0x${string}` }
  | { kind: 'batch_success_no_hash' }

/**
 * 调用 wallet_sendCalls 并轮询 wallet_getCallsStatus 直到拿到 hash 或确认成功。
 * 失败/拒绝/不支持等情况以 Error 抛出，由调用方决定是否走顺序执行兜底。
 */
export async function executeBatchSendCalls(
  address: string,
  transactions: any[],
): Promise<BatchSendCallsOutcome> {
  if (typeof window === 'undefined') throw new Error('Wallet not connected')
  const ethereum = (window as any).ethereum
  if (!ethereum) throw new Error('Ethereum provider not found')

  try {
    const requestParams = buildSendCallsParams(transactions, address)

    const result = await ethereum.request({
      method: 'wallet_sendCalls',
      params: [requestParams],
    })

    let { batchId, txHash } = parseSendCallsResult(result)
    if (!batchId) throw new Error('Failed to get batch ID from wallet_sendCalls result')

    // 如果只拿到 batch ID 而不是 tx hash，轮询 getCallsStatus
    if (!txHash || txHash === batchId) {
      let attempts = 0
      // 30 × 2s = 60s polling, 留够 ~5 个 block 的链上确认时间
      const maxAttempts = 30
      const pollInterval = 2000

      while (attempts < maxAttempts && (!txHash || txHash === batchId)) {
        try {
          await new Promise(resolve => setTimeout(resolve, pollInterval))

          const statusResult: any = await ethereum.request({
            method: 'wallet_getCallsStatus',
            params: [batchId],
          })

          if (statusResult && typeof statusResult === 'object') {
            if (isSuccessStatus(statusResult.status)) {
              txHash = extractTxHashFromStatus(statusResult)
            }
            if (isFailedStatus(statusResult.status)) {
              throw new Error(`Batch transaction failed: ${statusResult.error || statusResult.message || 'Unknown error'}`)
            }
          }

          if (txHash && txHash !== batchId) break
          attempts++
        } catch (statusError: any) {
          console.warn(`Failed to query batch status (attempt ${attempts + 1}):`, statusError)
          if (attempts >= maxAttempts - 1) {
            throw new Error(`Failed to get transaction hash from batch status: ${statusError.message || 'Unknown error'}`)
          }
          attempts++
        }
      }

      // 轮询循环结束仍未拿到 hash：再做一次最终查询，若 status=200 视为成功
      if (!txHash || txHash === batchId) {
        let lastStatusResult: any = null
        try {
          lastStatusResult = await ethereum.request({
            method: 'wallet_getCallsStatus',
            params: [batchId],
          })
        } catch (e) {
          console.warn('Failed to get final status:', e)
        }

        if (lastStatusResult && lastStatusResult.status === 200) {
          return { kind: 'batch_success_no_hash' }
        } else {
          console.warn('Could not extract transaction hash from status after polling, using batch ID')
          txHash = batchId
        }
      }
    }

    if (!isValidTxHash(txHash)) {
      throw new Error('Invalid transaction hash format and batch status is not successful')
    }

    return { kind: 'hash', txHash: txHash as `0x${string}` }
  } catch (error: any) {
    console.error('wallet_sendCalls error:', error)

    if (error.message?.includes('user rejected') || error.code === 4001) {
      throw new Error('User rejected the transaction')
    } else if (error.message?.includes('not supported') || error.message?.includes('method not found')) {
      throw new Error('Wallet does not support wallet_sendCalls method')
    } else {
      throw error
    }
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
