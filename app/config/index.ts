import { mainnet, sepolia, goerli} from 'wagmi/chains'
import { type Chain } from 'viem'
import { GoerliSetting, HoodiSetting, MainnetSetting } from '@ebunker.io/deposit'
// @ts-ignore
import { EBUNKER_PUBLIC_KEY } from '@ebunker.io/crypto'

const devChain: Chain = {
  id: 9999,
  name: 'Ebunker',
  // network: 'Ebunker',
  nativeCurrency: {
    name: 'Ebunker',
    symbol: 'ETH',
    decimals: 18,
  },
  // rpcUrls: { default: 'http://35.241.73.52:8545' },
  rpcUrls: { default: { http: ['https://rpceth1-test.ebunker.io'] }, public: { http: ['https://rpceth1-test.ebunker.io'] } },
}

const hoodiChain: Chain = {
  id: 560048, // 官方 Hoodi 测试网 Chain ID（之前写 10000 是错误的）
  name: 'Hoodi Testnet',
  // network: 'hoodi',
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://0xrpc.io/hoodi'],
    },
    public: {
      http: ['https://0xrpc.io/hoodi'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Etherscan (Hoodi)',
      url: 'https://hoodi.etherscan.io',
    },
    beacon: {
      name: 'Beaconcha.in',
      url: 'https://hoodi.beaconcha.in',
    },
  },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11', // 该地址为 community 默认部署在多个链上的 Multicall3
      blockCreated: 1, // 如不确定可以设为 1 或移除此字段
    },
  },
  testnet: true,
}

//ebunker&ssv public key
const EBUNKER_PUBLIC_KEY_SSV_Production =
  '-----BEGIN PUBLIC KEY-----\n' +
  'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDfdnwsND747VDyJYMQmkVC3QuK\n' +
  'eJp1StdoGVyYHgIgSERfAA1sJ67BzBxwjPp22mGp6wWAgFylcx2vtM57hEzc97/1\n' +
  '0C94XXEBq3lYJ5MKGDzTM0W4SZ2BRX5SigO1BWFFXc8AbteIazHxfNLBFGEhBqk8\n' +
  'MLbnY0x9KxwSEEN7BQIDAQAB\n' +
  '-----END PUBLIC KEY-----'
const EBUNKER_PUBLIC_KEY_SSV_Development =
  '-----BEGIN PUBLIC KEY-----\n' +
  'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC9v8O7p730KOKOndfHsmteRybJ\n' +
  'z2jyrDPoiVyzpQUzL7nu1/ZPZ+yeCH8r8tQr97g1LMg0lkKWWGauosz0lZ5cjdbk\n' +
  'OJHoTU6M/euFjA2/m9dUcfh7kJHLDfFpCfP0RrNUXQrUjiXMWdL1NyHj0x8fnuNL\n' +
  'onXSaylCtANuySBkqwIDAQAB\n' +
  '-----END PUBLIC KEY-----'
const EBUNKER_PUBLIC_KEY_SSV_Goerli =
  '-----BEGIN PUBLIC KEY-----\n' +
  'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC9v8O7p730KOKOndfHsmteRybJ\n' +
  'z2jyrDPoiVyzpQUzL7nu1/ZPZ+yeCH8r8tQr97g1LMg0lkKWWGauosz0lZ5cjdbk\n' +
  'OJHoTU6M/euFjA2/m9dUcfh7kJHLDfFpCfP0RrNUXQrUjiXMWdL1NyHj0x8fnuNL\n' +
  'onXSaylCtANuySBkqwIDAQAB\n' +
  '-----END PUBLIC KEY-----'
const EBUNKER_PUBLIC_KEY_SSV_Hoodi =
  '-----BEGIN PUBLIC KEY-----\n' +
  'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC9v8O7p730KOKOndfHsmteRybJ\n' +
  'z2jyrDPoiVyzpQUzL7nu1/ZPZ+yeCH8r8tQr97g1LMg0lkKWWGauosz0lZ5cjdbk\n' +
  'OJHoTU6M/euFjA2/m9dUcfh7kJHLDfFpCfP0RrNUXQrUjiXMWdL1NyHj0x8fnuNL\n' +
  'onXSaylCtANuySBkqwIDAQAB\n' +
  '-----END PUBLIC KEY-----'
const EBUNKER_PUBLIC_KEY_Production = EBUNKER_PUBLIC_KEY
const EBUNKER_PUBLIC_KEY_Development = EBUNKER_PUBLIC_KEY
const EBUNKER_PUBLIC_KEY_Goerli = EBUNKER_PUBLIC_KEY
const EBUNKER_PUBLIC_KEY_Hoodi = EBUNKER_PUBLIC_KEY

export class Env {
  host: string
  chainSetting: any
  chains: Chain[]
  explorer: string
  etherscan: string
  ebunkerPublicKey: string
  ssvPublicKey: string

  constructor(host: string, chainSetting: any, chains: Chain[], explorer: string, etherscan: string, ebunkerPublicKey: string, ssvPublicKey: string) {
    this.host = host
    this.chainSetting = chainSetting
    this.chains = chains
    this.explorer = explorer
    this.etherscan = etherscan
    this.ebunkerPublicKey = ebunkerPublicKey
    this.ssvPublicKey = ssvPublicKey
  }
}

const Production = new Env(
  'https://api.ebunker.io',
  MainnetSetting,
  [mainnet],
  'https://beaconcha.in',
  'https://etherscan.io',
  EBUNKER_PUBLIC_KEY_Production,
  EBUNKER_PUBLIC_KEY_SSV_Production
)
const Development = new Env(
  'https://explorer.test.ebunker.io',
  MainnetSetting,
  [devChain],
  'https://beaconcha.in',
  'https://etherscan.io',
  EBUNKER_PUBLIC_KEY_Development,
  EBUNKER_PUBLIC_KEY_SSV_Development
)
const Goerli = new Env(
  'https://api.goerli.ebunker.io',
  GoerliSetting,
  [goerli],
  'https://prater.beaconcha.in',
  'https://goerli.etherscan.io',
  EBUNKER_PUBLIC_KEY_Goerli,
  EBUNKER_PUBLIC_KEY_SSV_Goerli
)
const Hoodi = new Env(
  'https://hoodi.test.ebunker.io',
  HoodiSetting,
  [hoodiChain],
  'https://hoodi.beaconcha.in',
  'https://hoodi.etherscan.io',
  EBUNKER_PUBLIC_KEY_Hoodi,
  EBUNKER_PUBLIC_KEY_SSV_Hoodi
)
const Local = new Env(
  'http://localhost:8000',
  MainnetSetting,
  [devChain],
  'https://beaconcha.in',
  'https://etherscan.io',
  EBUNKER_PUBLIC_KEY_Development,
  EBUNKER_PUBLIC_KEY_SSV_Development
)

export const BUILD_ENV = process.env.NEXT_PUBLIC_BUILD_ENV
let Current
switch (BUILD_ENV) {
  case 'production':
    Current = Production
    break
  case 'test':
    Current = Development
    break
  case 'goerli':
    Current = Goerli
    break
  case 'local':
    Current = Local
    break
  case 'hoodi':
    Current = Hoodi
    break
  default:
    Current = Development
    break
}
 
export const ENV = Current ?? Local