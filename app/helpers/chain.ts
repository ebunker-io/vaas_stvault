import * as wagmiChains from 'wagmi/chains'
import { ENV } from '../config'

// viem 抛 ChainMismatchError 时模板里若 chain.name 是 undefined 就会出现字面 "undefined"
// （见 audit 报的 "id: 560048 – undefined"）。这里维护一份链名兜底表：先查 wagmi/chains 的官方
// 链注册表，再回退到当前环境 ENV.chains，最后兜底成 "Chain <id>"，避免任何情况下显示 undefined。
export function getChainName(chainId: number | undefined | null): string {
  if (chainId === undefined || chainId === null) return 'Unknown network'
  for (const c of Object.values(wagmiChains) as any[]) {
    if (c && typeof c === 'object' && c.id === chainId && typeof c.name === 'string') {
      return c.name
    }
  }
  for (const c of ENV.chains) {
    const cc = c as any
    if (cc.id === chainId && typeof cc.name === 'string') return cc.name
  }
  return `Chain ${chainId}`
}

// 反解 viem ChainMismatchError 的 message 模板，提取 current / target 链 id。
const CHAIN_MISMATCH_PATTERN = /wallet \(id:\s*(\d+)\)[\s\S]*?transaction \(id:\s*(\d+)/

// 统一格式化交易类错误：ChainMismatchError 走带链名的可读文案，其它错误保留原 message 的首句。
export function formatTransactionError(
  err: unknown,
  t: (key: string, opts?: any) => string,
): string {
  if (!err) return t('transaction_failed_generic')
  const e = err as { name?: string; message?: string; shortMessage?: string }
  const msg = e.message || e.shortMessage || ''

  const m = msg.match(CHAIN_MISMATCH_PATTERN)
  if (m || e.name === 'ChainMismatchError') {
    return t('wallet_switch_network_error', {
      current: getChainName(m ? Number(m[1]) : undefined),
      target: getChainName(m ? Number(m[2]) : undefined),
    })
  }

  return msg.split('.')[0] || t('transaction_failed_generic')
}
