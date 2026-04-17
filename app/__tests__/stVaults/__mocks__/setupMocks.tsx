/**
 * 共享 mock 配置：为 stVault 组件测试提供统一的依赖 mock
 */

// ---- next/router ----
export const mockPush = jest.fn()
export const mockBack = jest.fn()
export const mockRouterEvents = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
}

jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    query: {},
    pathname: '/stVaults',
    asPath: '/stVaults',
    events: mockRouterEvents,
  }),
  __esModule: true,
  default: {
    push: mockPush,
    back: mockBack,
  },
}))

// ---- react-i18next ----
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en-us' },
  }),
}))

// ---- config ----
jest.mock('../../../config', () => ({
  ENV: {
    host: 'https://api.test.ebunker.io',
    explorer: 'https://beaconcha.in',
    etherscan: 'https://etherscan.io',
    ebunkerPublicKey: 'mock-key',
    ssvPublicKey: 'mock-ssv-key',
    chains: [{ id: 1, name: 'mainnet' }],
  },
  BUILD_ENV: 'test',
}))

// ---- wagmi ----
export const mockSendTransaction = jest.fn()
export const mockDisconnect = jest.fn()

jest.mock('wagmi', () => ({
  useAccount: jest.fn(() => ({
    address: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
    isConnected: true,
  })),
  useBalance: jest.fn(() => ({
    data: { value: BigInt('10000000000000000000'), formatted: '10.0', symbol: 'ETH' },
    refetch: jest.fn(),
  })),
  useSendTransaction: jest.fn(() => ({
    sendTransaction: mockSendTransaction,
    isPending: false,
    data: undefined,
    error: undefined,
  })),
  useWaitForTransactionReceipt: jest.fn(() => ({
    isLoading: false,
    isSuccess: false,
    isError: false,
  })),
  useSignMessage: jest.fn(() => ({ signMessageAsync: jest.fn() })),
  useDisconnect: jest.fn(() => ({ disconnect: mockDisconnect })),
  useAccountEffect: jest.fn(),
}))

// ---- @rainbow-me/rainbowkit ----
export const mockOpenConnectModal = jest.fn()

jest.mock('@rainbow-me/rainbowkit', () => ({
  useConnectModal: () => ({ openConnectModal: mockOpenConnectModal }),
  ConnectButton: () => null,
}))

// ---- helpers/request ----
export const mockFetcher = jest.fn()

jest.mock('../../../helpers/request', () => ({
  fetcher: (...args: any[]) => mockFetcher(...args),
  getHost: () => 'https://api.test.ebunker.io',
  getExplorer: () => 'https://beaconcha.in',
  getEtherscan: () => 'https://etherscan.io',
}))

// ---- lucide-react ----
jest.mock('lucide-react', () => ({
  Loader2: (props: any) => <span data-testid="loader" {...props} />,
}))

// ---- @material-ui/icons ----
jest.mock('@material-ui/icons', () => ({
  Refresh: () => <span data-testid="refresh-icon" />,
}))

// ---- image mocks ----
jest.mock('../../../assets/images/stvault/icon-eth.png', () => ({ src: '/mock-eth.png' }), { virtual: true })
jest.mock('../../../assets/images/stvault/image-lido-eth.svg', () => ({ src: '/mock-lido.svg' }), { virtual: true })
jest.mock('../../../assets/images/stvault/image-user0.png', () => ({ src: '/mock-user0.png' }), { virtual: true })
jest.mock('../../../assets/images/stvault/image-user1.png', () => ({ src: '/mock-user1.png' }), { virtual: true })
jest.mock('../../../assets/images/stvault/image-user2.png', () => ({ src: '/mock-user2.png' }), { virtual: true })
jest.mock('../../../assets/images/stvault/image-user3.png', () => ({ src: '/mock-user3.png' }), { virtual: true })
