import { createConfig, http } from 'wagmi'
import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import {
  injectedWallet,
  metaMaskWallet,
  okxWallet,
  walletConnectWallet,
  coinbaseWallet,
  bitgetWallet,
  phantomWallet,
  ledgerWallet,
  // trustWallet,
} from '@rainbow-me/rainbowkit/wallets'
import { mainnet, goerli } from 'wagmi/chains'

import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { ENV } from '../config'
export const projectId = '4aeb28534b16a28112649dbe84122cd2'

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [injectedWallet, metaMaskWallet, walletConnectWallet, coinbaseWallet, okxWallet, bitgetWallet, phantomWallet, ledgerWallet],
    },
  ],
  {
    appName: 'Ebunker',
    projectId: projectId,
  }
)

export const defaultConfig = getDefaultConfig({
  appName: 'Ebunker',
  projectId: projectId,
  chains: ENV.chains as any,
  ssr: false, // If your dApp uses server side rendering (SSR)
  transports: {
    [mainnet.id]: http(),
    [goerli.id]: http(),
    [ENV.chains[0].id]: http() || http(ENV.chains[0].rpcUrls.default.http[0]),
  },
})
export const hoodiConfig = getDefaultConfig({
  appName: 'Hoodi',
  projectId: projectId,
  chains: ENV.chains as any,
  ssr: false, // If your dApp uses server side rendering (SSR)
  transports: {
    [mainnet.id]: http(),
    [goerli.id]: http(),
    [ENV.chains[0].id]: http() || http(ENV.chains[0].rpcUrls.default.http[0]),
  },
})

export const config = createConfig({
  chains: ENV.chains as any,
  connectors: connectors,
  ssr: false,
  transports: {
    [mainnet.id]: http(process.env.NEXT_PUBLIC_MAINNET_RPC_URL),
    [goerli.id]: http(),
  },
})
