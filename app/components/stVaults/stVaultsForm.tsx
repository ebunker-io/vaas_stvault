import { Box, Typography, Select, MenuItem, Button, IconButton, Theme, SelectChangeEvent, useTheme, Tooltip } from '@mui/material'
import { InfoOutlined, KeyboardArrowDown, Diamond } from '@mui/icons-material'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useAccount, useBalance, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { useStVaultSupply, useStVaultRefresh, useBalanceRefresh } from '../../hooks/useStVaultDashboard';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import ProtocolItem from './ProtocolItem';
import RewardRate from './RewardRate';
import VaultFailedModal from '../modals/vault-failed';
import VaultSuccessModal from '../modals/vault-success';
import EthIcon from '../../assets/images/stvault/icon-eth.png';
import { formatEther } from 'viem';
const formatWeiToEth = (wei: string) => { 
  const eth = formatWeiToEthFull(wei);
  const arr = eth.split('.');
  if (arr.length > 1) {
    return arr[0] + '.' + arr[1].substring(0, 4);
  }
  return eth; 
}

const formatWeiToEthFull = (wei: string) => {
  if (!wei || wei === '0') return '0';
   
  return formatEther(BigInt(wei));
}

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 440,
    },
  },
};

interface StVaultDashboardItem {
  vault: string;
  vault_owner: string;
  dashboard: string;
  operator_fee_rate: number;
  staking_apr: number;
  health_factor: string;
  liability_steth: string;
  remaining_minting_steth: string;
  total_minting_steth: string;
  withdrawable_value: string;
  locked: string;
  undisbursed_operator_fee: string;
  unsettled_lido_fee: string;
  status: string;
  created_time: string;
}

const StVaultsForm = ({ address, list, apr }: { address: `0x${string}` | undefined; list: StVaultDashboardItem[]; apr: number }) => {
  const router = useRouter()
  const { openConnectModal } = useConnectModal()
  const { t } = useTranslation()
  const [stVaultsAddress, setStVaultsAddress] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const names = useMemo(() => {
    return list?.map((item: StVaultDashboardItem) => {
      return item.vault;
    }) || [];
  }, [list]);
  const [loading, setLoading] = useState(false);
  const { data: balance } = useBalance({ address })
  const [supplyParams, setSupplyParams] = useState<{ from_address: string; vault: string; amount: string } | null>(null)
  const { data: supplyData, isLoading: supplyLoading, error: supplyError } = useStVaultSupply(supplyParams);
  const { sendTransaction, isPending: isTransactionPending, data: txData, error: txError } = useSendTransaction();
  const { refresh: refreshVault } = useStVaultRefresh(stVaultsAddress)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showFailedModal, setShowFailedModal] = useState(false)
  const [pendingTransactions, setPendingTransactions] = useState<any[]>([])
  const [currentTxIndex, setCurrentTxIndex] = useState(0)
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | undefined>(undefined)
  const lastTxDataRef = useRef<any>(null)
  const { refresh: refreshSupply, data: supplyDataResult } = useBalanceRefresh(stVaultsAddress)
  
  // 等待最后一个交易的确认
  const { isLoading: isWaitingReceipt, isSuccess: isReceiptSuccess, isError: isReceiptError } = useWaitForTransactionReceipt({
    hash: lastTxHash && currentTxIndex + 1 >= pendingTransactions.length ? lastTxHash : undefined,
  })
  
  const isLoading = loading || supplyLoading || isTransactionPending || isWaitingReceipt;
 
  const getMaxValueFull = () => {
    return balance?.value ? formatWeiToEthFull(balance.value.toString()) : '0'
  }

  const isValidAmount = () => {
    if (!amount || amount.trim() === '') {
      return false
    }
    const trimmedAmount = amount.trim()
    // 检查是否以 0 开头但不是 0. 开头（如 01, 00, 0123 等）
    if (trimmedAmount.startsWith('0') && !trimmedAmount.startsWith('0.')) {
      return false
    }
    const amountNum = parseFloat(trimmedAmount)
    if (isNaN(amountNum) || amountNum <= 0) {
      return false
    }
    const maxValue = parseFloat(getMaxValueFull())
    if (amountNum > maxValue) {
      return false
    }
    return true
  }

  // 检测是否是 MetaMask 钱包
  const isMetaMask = () => {
    if (typeof window === 'undefined') {
      return false
    }
    const ethereum = (window as any).ethereum
    if (!ethereum) {
      return false
    }
    return ethereum.isMetaMask === true || 
           ethereum._metamask !== undefined ||
           (ethereum.providers && Array.isArray(ethereum.providers) && ethereum.providers.some((p: any) => p.isMetaMask === true))
  }

  // 使用 wallet_sendCalls 批量执行交易
  const executeBatchTransactions = useCallback(async (transactions: any[]) => {
    if (!address || typeof window === 'undefined') {
      throw new Error('Wallet not connected')
    }

    const ethereum = (window as any).ethereum
    if (!ethereum) {
      throw new Error('Ethereum provider not found')
    }

    try {
      const chainId = transactions[0]?.chainId
      if (!chainId) {
        throw new Error('Chain ID not found in transaction data')
      }

      const chainIdHex = `0x${Number(chainId).toString(16)}`

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

      console.log('Using wallet_sendCalls to batch execute transactions:', requestParams)

      const result = await ethereum.request({
        method: 'wallet_sendCalls',
        params: [requestParams],
      })

      console.log('wallet_sendCalls result:', result)

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

      if (!batchId) {
        throw new Error('Failed to get batch ID from wallet_sendCalls result')
      }

      if (!txHash || txHash === batchId) {
        console.log('Result contains batch ID, querying status to get transaction hash...')
        
        let attempts = 0
        const maxAttempts = 10
        const pollInterval = 2000

        while (attempts < maxAttempts && (!txHash || txHash === batchId)) {
          try {
            await new Promise(resolve => setTimeout(resolve, pollInterval))
            
            const statusResult: any = await ethereum.request({
              method: 'wallet_getCallsStatus',
              params: [batchId],
            })

            console.log(`wallet_getCallsStatus result (attempt ${attempts + 1}):`, statusResult)

            if (statusResult && typeof statusResult === 'object') {
              const isSuccess = statusResult.status === 200 || 
                               statusResult.status === 'CONFIRMED' || 
                               statusResult.status === 'PENDING' ||
                               statusResult.status === 'SUCCESS'

              if (isSuccess) {
                if (statusResult.calls && Array.isArray(statusResult.calls) && statusResult.calls.length > 0) {
                  const lastCall: any = statusResult.calls[statusResult.calls.length - 1]
                  txHash = lastCall.hash || lastCall.txHash || lastCall.transactionHash
                }
                
                if (!txHash && statusResult.transactions && Array.isArray(statusResult.transactions) && statusResult.transactions.length > 0) {
                  const lastTx: any = statusResult.transactions[statusResult.transactions.length - 1]
                  txHash = lastTx.hash || lastTx.txHash || lastTx.transactionHash
                }
                
                if (!txHash) {
                  txHash = statusResult.txHash || statusResult.hash || statusResult.transactionHash
                }

                if (!txHash && statusResult.status === 200) {
                  console.log('Status is 200 but no transaction hash found, batch may be processing')
                }
              }

              const isFailed = statusResult.status === 'FAILED' || 
                              statusResult.status === 'REJECTED' ||
                              (typeof statusResult.status === 'number' && statusResult.status >= 400)
              if (isFailed) {
                throw new Error(`Batch transaction failed: ${statusResult.error || statusResult.message || 'Unknown error'}`)
              }
            }

            if (txHash && txHash !== batchId) {
              break
            }

            attempts++
          } catch (statusError: any) {
            console.warn(`Failed to query batch status (attempt ${attempts + 1}):`, statusError)
            
            if (attempts >= maxAttempts - 1) {
              throw new Error(`Failed to get transaction hash from batch status: ${statusError.message || 'Unknown error'}`)
            }
            
            attempts++
          }
        }

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
            console.log('Status is 200, batch transaction is successful but no hash found')
            setLoading(false)
            setSupplyParams(null)
            setPendingTransactions([])
            setCurrentTxIndex(0)
            setLastTxHash(undefined)
            lastTxDataRef.current = null
            setShowSuccessModal(true)
            setTimeout(() => {
              if (stVaultsAddress) {
                refreshVault()
                refreshSupply()
              }
            }, 3000)
            return 'batch_success'
          } else {
            console.warn('Could not extract transaction hash from status after polling, using batch ID')
            txHash = batchId
          }
        }
      }

      console.log('Final transaction hash:', txHash)

      const isValidHash = txHash && typeof txHash === 'string' && txHash.startsWith('0x') && txHash.length === 66
      
      if (!isValidHash) {
        throw new Error('Invalid transaction hash format and batch status is not successful')
      }

      setLastTxHash(txHash as `0x${string}`)
      setPendingTransactions(transactions)
      setCurrentTxIndex(transactions.length - 1)

      return txHash
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
  }, [address, stVaultsAddress, refreshVault, refreshSupply])

  const executeNextTransaction = useCallback((transactions: any[], index: number) => {
    if (index >= transactions.length) {
      // 所有交易已完成
      setLoading(false);
      setPendingTransactions([]);
      setCurrentTxIndex(0);
      setShowSuccessModal(true);
      setTimeout(() => {
        if (stVaultsAddress) {
          refreshVault();
        }
      }, 3000);
      return;
    }

    const transaction = transactions[index];
    try {
      sendTransaction({
        to: transaction.to as `0x${string}`,
        value: BigInt(typeof transaction.value === 'string' ? transaction.value : transaction.value.toString()),
        data: transaction.data as `0x${string}`,
        chainId: transaction.chainId,
      });
      console.log(`Executing transaction ${index + 1}/${transactions.length}`);
    } catch (error) {
      console.error('Send transaction error:', error);
      setLoading(false);
      setPendingTransactions([]);
      setCurrentTxIndex(0);
    }
  }, [sendTransaction, stVaultsAddress, refreshVault])

  const handleTransaction = async (apiData: any, apiError: any, setParams: (value: null) => void) => {
    if (apiError) {
      console.error('StVault API error:', apiError);
      setLoading(false);
      setParams(null);
      setPendingTransactions([]);
      setCurrentTxIndex(0);
      lastTxDataRef.current = null;
      return;
    }

    if (apiData && Array.isArray(apiData) && apiData.length > 0) {
      console.log('StVault API response:', apiData);
      setLoading(true);
      setParams(null);
      setPendingTransactions(apiData);
      setCurrentTxIndex(0);
      lastTxDataRef.current = null;

      // 判断是否使用批量合并：MetaMask 钱包且交易数大于 1
      const isMetaMaskWallet = isMetaMask()
      const shouldUseBatch = isMetaMaskWallet && apiData.length > 1

      console.log('Is MetaMask wallet:', isMetaMaskWallet)
      console.log('Transaction count > 1:', apiData.length > 1)
      console.log('Should use batch execution:', shouldUseBatch)

      if (shouldUseBatch) {
        console.log(`Using batch execution (sendCalls) for ${apiData.length} transactions`)
        try {
          const result = await executeBatchTransactions(apiData)
          if (result === 'batch_success') {
            console.log('Batch transaction successful (status 200), no need to wait for receipt')
            return
          }
          console.log('Batch execution initiated successfully')
        } catch (error: any) {
          console.error('Batch execution error:', error)
          console.error('Error details:', error.message, error.code)
          console.log('Falling back to sequential execution')
          executeNextTransaction(apiData, 0)
        }
      } else {
        if (!isMetaMaskWallet) {
          console.log('Not using batch: Not MetaMask wallet')
        } else if (apiData.length <= 1) {
          console.log('Not using batch: Only 1 transaction')
        }
        console.log(`Using sequential execution for ${apiData.length} transaction(s)`)
        executeNextTransaction(apiData, 0)
      }
    }
  }

  useEffect(() => {
    if (supplyData && !supplyError) {
      handleTransaction(supplyData, supplyError, setSupplyParams);
    }
  }, [supplyData, supplyError])

  useEffect(() => {
    if (txData && pendingTransactions.length > 0 && txData !== lastTxDataRef.current) {
      console.log('Transaction sent successfully:', txData);
      lastTxDataRef.current = txData;

      // 如果还有待执行的交易，执行下一个
      if (currentTxIndex + 1 < pendingTransactions.length) {
        const nextIndex = currentTxIndex + 1;
        setCurrentTxIndex(nextIndex);
        // 等待一小段时间后执行下一个交易，确保前一个交易已确认
        setTimeout(() => {
          executeNextTransaction(pendingTransactions, nextIndex);
        }, 1000);
      } else {
        // 最后一个交易，等待确认
        if (txData) {
          setLastTxHash(txData as `0x${string}`);
        }
      }
    }
  }, [txData, pendingTransactions, currentTxIndex, executeNextTransaction])

  // 监听最后一个交易的确认状态
  useEffect(() => {
    if (isReceiptSuccess && lastTxHash && currentTxIndex + 1 >= pendingTransactions.length) {
      // 交易已确认，显示成功弹窗
      setLoading(false);
      setSupplyParams(null);
      setPendingTransactions([]);
      setCurrentTxIndex(0);
      setLastTxHash(undefined);
      lastTxDataRef.current = null;
      setShowSuccessModal(true);
      setTimeout(() => {
        if (stVaultsAddress) {
          refreshVault();
          refreshSupply();
        }
      }, 3000);
    }
  }, [isReceiptSuccess, lastTxHash, currentTxIndex, pendingTransactions.length, stVaultsAddress, refreshVault, refreshSupply])

  // 监听交易确认错误
  useEffect(() => {
    if (isReceiptError) {
      setLoading(false);
      setSupplyParams(null);
      setPendingTransactions([]);
      setCurrentTxIndex(0);
      setLastTxHash(undefined);
      lastTxDataRef.current = null;
      console.error('Transaction receipt error');
      setShowFailedModal(true);
    }
  }, [isReceiptError])

  useEffect(() => {
    if (supplyError || txError) {
      setLoading(false);
      setSupplyParams(null);
      setPendingTransactions([]);
      setCurrentTxIndex(0);
      setLastTxHash(undefined);
      lastTxDataRef.current = null;
      console.error('Error:', supplyError || txError);
      setShowFailedModal(true);
    }
  }, [supplyError, txError])

  useEffect(() => {
    // 只在 stVaultsAddress 为空且 names 有值时设置默认值
    if (names.length > 0 && !stVaultsAddress) {
      setStVaultsAddress(names[0] || '');
    }
  }, [names, stVaultsAddress])

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        maxWidth: { xs: '92%', md: '760px' },
        width: { xs: '92vw', md: '540px'},
        margin: '0 auto',
        padding: { xs: "16px 12px", md: "16px 24px" },
        backgroundColor: '#ffffff',
        borderRadius: 2,
        gap: 3,
      }}
    >
      {/* Title */}
      <Typography
        sx={{
          fontSize: { xs: 16, md: 18 },
          fontWeight: 500,
          color: '#000000',
          textAlign: 'left',
        }}
      >
        {t('stvaults_start_staking')}
      </Typography>

      {/* Staking Protocol Section */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography
          sx={{
            fontSize: 12,
            color: '#7A8AA0',
            fontWeight: 400,
          }}
        >
          {t('stvaults_staking_protocol')}
        </Typography>
        <ProtocolItem />

        <Typography
          sx={{
            fontSize: 12,
            color: '#007AFF',
            fontWeight: 400,
          }}
        >
          {t('stvaults_lido_service')}
        </Typography>
      </Box>

      {/* My Lido stVaults Section */}
      <SelectStVaults isConnected={!!address} names={names} stVaultsAddress={stVaultsAddress} setStVaultsAddress={setStVaultsAddress} />
      {/* Enter Amount Section */}
      <EnterAmount isConnected={!!address} amount={amount} setAmount={setAmount} balance={balance} />
      <Typography
          sx={{
            fontSize: 12,
            color: '#000000',
            fontWeight: 400,
            opacity: 0.4,
          }}
        >
          {t('stvaults_lido_service_tooltip')}
        </Typography>
      {/* Rates and Fees Section */}
      <RewardRate apr={apr} />

      {/* Stake Button */}
      <Button
        onClick={() => {
          if (!address) {
            openConnectModal?.()
            return;
          }
          const amountNum = parseFloat(amount) || 0;
          if (!stVaultsAddress || amountNum <= 0) {
            return;
          }

          const selectedVault = list?.find((item: StVaultDashboardItem) => item.vault === stVaultsAddress);
          if (!selectedVault?.dashboard) {
            return;
          }

          if (supplyData) {
            handleTransaction(supplyData, supplyError, setSupplyParams);
          } else {
            setLoading(true);
            setSupplyParams({
              from_address: address,
              vault: selectedVault.vault,
              amount: amount.toString(),
            });
          }
        }}
        disabled={!address || isLoading || !isValidAmount()}
        sx={{
          width: '100%',
          height: '54px',
          padding: '0 16px',
          backgroundColor: address ? '#CCFF00' : '#000000',
          color: address ? '#000000' : '#ffffff',
          fontSize: "20px",
          textAlign: 'center',
          lineHeight: "54px",
          fontWeight: 500,
          borderRadius: "12px",
          textTransform: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          '&:hover': {
            backgroundColor: address ? '#b8e600' : '#333333',
          },
          '&:disabled': {
            backgroundColor: '#e5e7eb',
            color: '#9ca3af',
          },
        }}
      >
        {address ? t('stvaults_stake') : t('login')}
        {isLoading && <Loader2 className='w-4 h-4 animate-spin' />}
      </Button>
      <VaultFailedModal onClose={() => setShowFailedModal(false)} message={supplyError?.message || txError?.message} open={showFailedModal} />
      <VaultSuccessModal onClose={() => setShowSuccessModal(false)} onView={() => { router.push(`/dashboard?type=lido`) }} onConfirm={() => { setShowSuccessModal(false) }} open={showSuccessModal} title={String(t('stvaults_vault_stake_success'))} subtitle={String(t('stvaults_vault_stake_success_desc'))} />
    </Box>
  )
}

export const SelectStVaults = ({ isConnected, names, stVaultsAddress, setStVaultsAddress }: { isConnected: boolean; names: string[]; stVaultsAddress: string; setStVaultsAddress: (value: string) => void }) => {
  const { t } = useTranslation()
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography
          sx={{
            fontSize: 12,
            color: '#000000',
            opacity: 0.4,
            fontWeight: 400,
          }}
        >
          {t('stvaults_my_lido_stvaults')}
        </Typography>
        <Tooltip title={t('stvaults_lido_stvaults_tooltip')}>
          <IconButton
            sx={{
              padding: 0,
              width: 16,
              height: 16,
              '& .MuiSvgIcon-root': {
                fontSize: 14,
                color: '#9ca3af',
              },
            }}
          >
            <InfoOutlined />
          </IconButton>
        </Tooltip>
      </Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          border: '1px solid #e5e7eb',
          borderRadius: "12px",
          padding: '0 8px 0 16px',
          height: '54px',
          backgroundColor: '#ffffff',
          cursor: isConnected ? 'pointer' : 'not-allowed',
          '&:hover': {
            borderColor: isConnected ? '#CCFF00' : '#e5e7eb',
          },
        }}
      >
        <Select
          disabled={!isConnected}
          displayEmpty
          value={stVaultsAddress}
          onChange={(e: any) => {
            setStVaultsAddress(e.target.value);
          }}
          MenuProps={MenuProps}
          inputProps={{ 'aria-label': 'Without label' }}
          IconComponent={KeyboardArrowDown}
          sx={{
            width: '100%',
            height: '54px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            '& .MuiSelect-select': {
              display: 'flex',
              alignItems: 'center',
              height: '54px',
              lineHeight: '54px',
              padding: '0 10px 0 0',
            },
            '& .MuiOutlinedInput-notchedOutline': {
              border: 'none',
            },
            '& .MuiSelect-icon': {
              color: '#C7C9D2',
            },
            '&.Mui-disabled': {
              backgroundColor: '#ffffff',
              '& .MuiSelect-icon': {
                color: '#C7C9D2',
              },
            },
          }}
        >
          {names.map((name) => (
            <MenuItem
              key={name}
              value={name}
            >
              <Typography
                sx={{
                  flex: 1,
                  fontSize: 16,
                  color: '#000000',
                  fontWeight: 400,
                  fontFamily: 'monospace',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {name}
              </Typography>
            </MenuItem>
          ))}
        </Select>
      </Box>
    </Box>
  )
}

export const EnterAmount = ({ isConnected, amount, setAmount, balance }: { isConnected: boolean; amount: string; setAmount: (value: string) => void; balance: any }) => {
  const [isFocused, setIsFocused] = useState(false);
  const { t } = useTranslation()
  
  const getMaxValue = () => {
    return balance?.value ? formatWeiToEth(balance.value.toString()) : '0.0000'
  }

  const getMaxValueFull = () => {
    return balance?.value ? formatWeiToEthFull(balance.value.toString()) : '0'
  }
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography
          sx={{
            fontSize: 12,
            color: '#000000',
            opacity: 0.4,
            fontWeight: 400,
          }}
        >
          {t('stvaults_enter_amount')}
        </Typography>
      <Box
        sx={{
          height: '102px',
          borderRadius: '12px',
          border: `1px solid ${isFocused ? '#CCFF00' : '#E6E6E9'}`,
          backgroundColor: '#ffffff',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'border-color 0.2s ease',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, height: "42px", justifyContent: 'center', flex: 1 }}>
          <input
            type="number"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
            }}
            placeholder='0.00'
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={!isConnected}
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 24,
              color: '#374151',
              fontWeight: 600,
              padding: 0,
              width: '100%',
              fontFamily: 'inherit',
            }}
          />
          <Typography
            sx={{
              fontSize: 12,
              color: '#9ca3af',
              fontWeight: 400,
            }}
          >

          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, height: "42px", justifyContent: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <img src={EthIcon.src} alt="ETH"
              style={{
                width: 20,
                height: 20,
              }}
            />
            <Typography
              sx={{
                fontSize: 16,
                color: '#7A8AA0',
                fontWeight: 500,
              }}
            >
              ETH
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              sx={{
                fontSize: 12,
                color: '#7A8AA0',
                fontWeight: 400,
              }}
            >
              {getMaxValue()} ETH
            </Typography>
            <Typography
              onClick={() => {
                const maxValueFull = getMaxValueFull();
                if (maxValueFull && maxValueFull !== '0') {
                  setAmount(maxValueFull);
                }
              }}
              sx={{
                fontSize: 12,
                color: '#000000',
                fontWeight: 600,
                cursor: 'pointer',
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              {t('stvaults_max')}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

export default StVaultsForm


