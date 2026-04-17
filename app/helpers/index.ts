import {BigNumber} from 'ethers'

export const delay = (time: number) => {
  return new Promise((resolve) => setTimeout(resolve, time))
}

export const getDepositAddress = (chainId: number | undefined,validator_type?:string) => {
  switch (chainId) {
    case 1:
      return validator_type === "02" ? "0x00000000219ab540356cBB839Cbe05303d7705Fa" : "0xa1619Fb8CcC03Ee3c8D543fB8be993764030e028"
    case 5:
      return validator_type === "02" ? "0x4242424242424242424242424242424242424242" : "0x6271762adafe2b66bc56a306c6e32b0045712cd4"
    case 560048:
      return validator_type === "02" ? "0x00000000219ab540356cBB839Cbe05303d7705Fa" : "0x7e4fa2776cecb0c0f6a672b20fccb7729a2eea82"
    default:
      return validator_type === "02" ? "0x8A04d14125D0FDCDc742F4A05C051De07232EDa4" : "0x3892653CC2E380fB28A53eb52cAF2fF89E6452Ed"
      // return '0xa12866FC0e5A41F87c201Efcc0906a961416590A'
  }
}

 export const getUnstakeAddress = (chainId: number | undefined) => {
  switch (chainId) {
    case 1:
      return "0x00000961Ef480Eb55e80D19ad83579A64c007002" 
    case 5:
      return "0x00000961Ef480Eb55e80D19ad83579A64c007002"
    case 560048:
      return "0x00000961Ef480Eb55e80D19ad83579A64c007002"
    default:
      return "0x00000961Ef480Eb55e80D19ad83579A64c007002"
  }
}

export const formatDate = (dateString: string) => {
  const d = new Date(dateString)
  return d.toLocaleString('zh-CN')
}

export function calculateGasMargin(value: BigNumber): BigNumber {
  return value.mul(120).div(100)
}
