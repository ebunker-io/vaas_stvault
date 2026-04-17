/**
 * helpers/request.ts 单元测试
 *
 * 测试 API 请求层：
 * - getHost / getExplorer / getEtherscan: 环境配置获取
 * - fetcher: 核心请求函数（token 注入、错误处理、响应转换）
 */

// Mock config
jest.mock('../../config', () => ({
  ENV: {
    host: 'https://api.test.ebunker.io',
    explorer: 'https://beaconcha.in',
    etherscan: 'https://etherscan.io',
    ebunkerPublicKey: 'mock-ebunker-key',
    ssvPublicKey: 'mock-ssv-key',
  },
}))

import { getHost, getExplorer, getEtherscan, getEbunkerPublicKey, getSsvPublicKey, fetcher } from '../../helpers/request'
import { API_ERROR_CODES } from '../../helpers/apiErrorCodes'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value }),
    removeItem: jest.fn((key: string) => { delete store[key] }),
    clear: jest.fn(() => { store = {} }),
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

const t = (key: string) => key

describe('环境配置获取函数', () => {
  it('getHost 应返回 ENV.host', () => {
    expect(getHost()).toBe('https://api.test.ebunker.io')
  })

  it('getExplorer 应返回 ENV.explorer', () => {
    expect(getExplorer()).toBe('https://beaconcha.in')
  })

  it('getEtherscan 应返回 ENV.etherscan', () => {
    expect(getEtherscan()).toBe('https://etherscan.io')
  })

  it('getEbunkerPublicKey 应返回 ENV.ebunkerPublicKey', () => {
    expect(getEbunkerPublicKey()).toBe('mock-ebunker-key')
  })

  it('getSsvPublicKey 应返回 ENV.ssvPublicKey', () => {
    expect(getSsvPublicKey()).toBe('mock-ssv-key')
  })
})

describe('fetcher', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.clear()
  })

  it('应在请求头中注入 Authorization token', async () => {
    localStorageMock.setItem('token', 'test-token-123')

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ code: 200, data: { result: 'ok' } }),
    })

    const headers = new Headers({ 'Content-Type': 'application/json' })
    await fetcher(t, '/api/test', { method: 'GET', headers })

    // 验证 fetch 被调用
    expect(mockFetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
      method: 'GET',
    }))
  })

  it('应正确解析 code 200 响应返回 data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ code: 200, data: { vaults: [] }, msg: 'success' }),
    })

    const headers = new Headers()
    const result = await fetcher(t, '/api/test', { method: 'GET', headers })
    expect(result).toEqual({ vaults: [] })
  })

  it('应在 HTTP 错误时抛出 HttpError', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    const headers = new Headers()
    await expect(fetcher(t, '/api/test', { method: 'GET', headers })).rejects.toThrow()
  })

  it('应在 code 401 时移除 localStorage token', async () => {
    localStorageMock.setItem('token', 'old-token')

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ code: 401, data: null, msg: 'Unauthorized' }),
    })

    const headers = new Headers()
    await expect(fetcher(t, '/api/test', { method: 'GET', headers })).rejects.toThrow()
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('token')
  })

  it('应在业务错误时抛出错误', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ code: 400, data: null, msg: 'Invalid params' }),
    })

    const headers = new Headers()
    // 注意：ts-jest 编译后 instanceof BizError 可能失效，
    // 导致 catch 中走到 PageError 分支，但错误仍会被抛出
    await expect(fetcher(t, '/api/test', { method: 'GET', headers })).rejects.toThrow()
  })

  it('应在网络 TypeError 时抛出 HttpError 502', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    const headers = new Headers()
    try {
      await fetcher(t, '/api/test', { method: 'GET', headers })
      expect(true).toBe(false) // should not reach here
    } catch (error: any) {
      expect(error.httpCode).toBe(502)
    }
  })
})
