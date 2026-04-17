import { Box, Typography, IconButton, Button, Tooltip } from '@mui/material'
import { InfoOutlined, Autorenew } from '@mui/icons-material'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/router'
import { useAccount, useBalance, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi'
import { DashboardCardData } from '../../types'
import EthIcon from '../../assets/images/stvault/icon-eth.png'
import { useStVaultMintSteth, useStVaultRepaySteth, useStVaultRefresh, useMintRefresh } from '../../hooks/useStVaultDashboard'
import { Loader2 } from 'lucide-react'
import VaultFailedModal from '../modals/vault-failed'
import VaultSuccessModal from '../modals/vault-success'
import { useTranslation } from 'react-i18next'
import { formatEther } from 'viem'


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

const MintForm = ({ tab, data }: { tab: number; data: DashboardCardData | null }) => {
  const router = useRouter()
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState(tab)
  const [amount, setAmount] = useState<string>('')
  const [isFocused, setIsFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mintParams, setMintParams] = useState<{ from_address: string; vault: string; amount: string } | null>(null)
  const [repayParams, setRepayParams] = useState<{ from_address: string; vault: string; amount: string } | null>(null)
  const { address } = useAccount()
  const { data: ethBalance } = useBalance({ address })
  const { data: mintData, isLoading: mintLoading, error: mintError } = useStVaultMintSteth(mintParams)
  const { data: repayData, isLoading: repayLoading, error: repayError } = useStVaultRepaySteth(repayParams)
  const { sendTransaction, isPending: isTransactionPending, data: txData, error: txError } = useSendTransaction()
  const { refresh: refreshVault } = useStVaultRefresh(data?.vault)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showFailedModal, setShowFailedModal] = useState(false)
  const [pendingTransactions, setPendingTransactions] = useState<any[]>([])
  const [currentTxIndex, setCurrentTxIndex] = useState(0)
  const [currentTxHash, setCurrentTxHash] = useState<`0x${string}` | undefined>(undefined)
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | undefined>(undefined)
  const lastTxDataRef = useRef<any>(null)
  const { refresh: refreshMint, data: mintDataResult } = useMintRefresh(data?.vault)
  const [errorMessage, setErrorMessage] = useState('')

  // 等待当前交易的确认（用于顺序执行）
  const { isLoading: isWaitingCurrentReceipt, isSuccess: isCurrentReceiptSuccess, isError: isCurrentReceiptError } = useWaitForTransactionReceipt({
    hash: currentTxHash,
  })

  // 等待最后一个交易的确认
  const { isLoading: isWaitingReceipt, isSuccess: isReceiptSuccess, isError: isReceiptError } = useWaitForTransactionReceipt({
    hash: lastTxHash && currentTxIndex + 1 >= pendingTransactions.length ? lastTxHash : undefined,
  })

  const isLoading = loading || mintLoading || repayLoading || isTransactionPending || isWaitingReceipt || isWaitingCurrentReceipt

  const getMaxValue = () => {
    if (activeTab === 0) {
      return mintDataResult?.remaining_minting_capacity_steth ? formatWeiToEth(mintDataResult.remaining_minting_capacity_steth) : '0.0000'
    }
    return mintDataResult?.liability_steth ? formatWeiToEth(mintDataResult.liability_steth) : '0.0000'
  }

  const getMaxValueFull = () => {
    if (activeTab === 0) {
      return mintDataResult?.remaining_minting_capacity_steth ? formatWeiToEthFull(mintDataResult.remaining_minting_capacity_steth) : '0'
    }
    return mintDataResult?.liability_steth ? formatWeiToEthFull(mintDataResult.liability_steth) : '0'
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
    const amountNum = parseFloat(amount)
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

      // 获取链 ID（十六进制格式）
      const chainIdHex = `0x${Number(chainId).toString(16)}`

      // 构建 calls 数组
      const calls = transactions.map(tx => {
        const call: any = {
          to: tx.to.toLowerCase(),
          data: tx.data,
        }

        // 如果 value 不为 0，添加到 call 中（十六进制格式）
        const txValue = BigInt(typeof tx.value === 'string' ? tx.value : tx.value.toString())
        if (txValue > BigInt(0)) {
          call.value = `0x${txValue.toString(16)}`
        }

        return call
      })

      // 构建 wallet_sendCalls 请求
      const requestParams = {
        version: "2.0.0",
        chainId: chainIdHex,
        from: address,
        calls: calls,
        atomicRequired: true, // 所有交易必须全部成功
      }

      console.log('Using wallet_sendCalls to batch execute transactions:', requestParams)

      // 调用 wallet_sendCalls
      const result = await ethereum.request({
        method: 'wallet_sendCalls',
        params: [requestParams],
      })

      console.log('wallet_sendCalls result:', result)

      // 解析返回结果
      let batchId: string | undefined
      let txHash: string | undefined

      if (typeof result === 'string') {
        // 直接返回字符串，可能是交易 hash 或 batch ID
        txHash = result
        batchId = result
      } else if (Array.isArray(result) && result.length > 0) {
        txHash = result[0]
        batchId = result[0]
      } else if (result && typeof result === 'object') {
        // 优先查找交易 hash
        txHash = result.txHash || result.hash
        // batch ID 用于查询状态
        batchId = result.id || result.batchId || txHash
      }

      if (!batchId) {
        throw new Error('Failed to get batch ID from wallet_sendCalls result')
      }

      // 如果返回的是 batch ID 而不是交易 hash，需要查询状态获取实际交易 hash
      if (!txHash || txHash === batchId) {
        console.log('Result contains batch ID, querying status to get transaction hash...')
        
        // 轮询查询 batch 状态，最多尝试 10 次
        let attempts = 0
        const maxAttempts = 10
        const pollInterval = 2000 // 2 秒

        while (attempts < maxAttempts && (!txHash || txHash === batchId)) {
          try {
            // 等待一段时间让交易被处理
            await new Promise(resolve => setTimeout(resolve, pollInterval))
            
            // 查询 batch 状态
            const statusResult: any = await ethereum.request({
              method: 'wallet_getCallsStatus',
              params: [batchId],
            })

            console.log(`wallet_getCallsStatus result (attempt ${attempts + 1}):`, statusResult)

            // 从状态中提取交易 hash
            if (statusResult && typeof statusResult === 'object') {
              // 检查状态：支持数字状态码 200（成功）或字符串状态
              const isSuccess = statusResult.status === 200 || 
                               statusResult.status === 'CONFIRMED' || 
                               statusResult.status === 'PENDING' ||
                               statusResult.status === 'SUCCESS'

              if (isSuccess) {
                // 尝试从多个可能的字段中提取交易 hash
                // 1. 检查 calls 数组中的 hash
                if (statusResult.calls && Array.isArray(statusResult.calls) && statusResult.calls.length > 0) {
                  // 取最后一个 call 的 hash（通常是主交易）
                  const lastCall: any = statusResult.calls[statusResult.calls.length - 1]
                  txHash = lastCall.hash || lastCall.txHash || lastCall.transactionHash
                }
                
                // 2. 检查 transactions 数组
                if (!txHash && statusResult.transactions && Array.isArray(statusResult.transactions) && statusResult.transactions.length > 0) {
                  const lastTx: any = statusResult.transactions[statusResult.transactions.length - 1]
                  txHash = lastTx.hash || lastTx.txHash || lastTx.transactionHash
                }
                
                // 3. 检查根级别的 hash 字段
                if (!txHash) {
                  txHash = statusResult.txHash || statusResult.hash || statusResult.transactionHash
                }

                // 4. 如果 status 是 200 且没有找到 hash，说明交易已成功但可能还在确认中
                // 这种情况下，我们可以使用 batch ID 作为标识，但需要特殊处理
                if (!txHash && statusResult.status === 200) {
                  console.log('Status is 200 but no transaction hash found, batch may be processing')
                  // 继续轮询，等待 hash 出现
                }
              }

              // 如果状态是失败，抛出错误
              const isFailed = statusResult.status === 'FAILED' || 
                              statusResult.status === 'REJECTED' ||
                              (typeof statusResult.status === 'number' && statusResult.status >= 400)
              if (isFailed) {
                throw new Error(`Batch transaction failed: ${statusResult.error || statusResult.message || 'Unknown error'}`)
              }
            }

            // 如果找到了交易 hash，退出循环
            if (txHash && txHash !== batchId) {
              break
            }

            attempts++
          } catch (statusError: any) {
            console.warn(`Failed to query batch status (attempt ${attempts + 1}):`, statusError)
            
            // 如果是最后一次尝试，抛出错误
            if (attempts >= maxAttempts - 1) {
              throw new Error(`Failed to get transaction hash from batch status: ${statusError.message || 'Unknown error'}`)
            }
            
            attempts++
          }
        }

        // 如果仍然没有找到交易 hash，检查最后一次查询的状态
        if (!txHash || txHash === batchId) {
          // 最后一次查询状态结果
          let lastStatusResult: any = null
          try {
            lastStatusResult = await ethereum.request({
              method: 'wallet_getCallsStatus',
              params: [batchId],
            })
          } catch (e) {
            console.warn('Failed to get final status:', e)
          }

          // 如果状态是 200（成功），即使没有交易 hash，也认为交易已成功
          if (lastStatusResult && lastStatusResult.status === 200) {
            console.log('Status is 200, batch transaction is successful but no hash found')
            console.log('This may be a batch operation that completes atomically')
            // 对于批量交易，如果状态是 200，直接标记为成功，不等待确认
            setLoading(false)
            setMintParams(null)
            setRepayParams(null)
            setPendingTransactions([])
            setCurrentTxIndex(0)
            setLastTxHash(undefined)
            lastTxDataRef.current = null
            setShowSuccessModal(true)
            setAmount('')
            setTimeout(() => {
              if (data?.vault) {
                refreshVault()
                refreshMint()
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

      // 验证交易 hash 格式（应该是 0x 开头的 66 字符）
      const isValidHash = txHash && typeof txHash === 'string' && txHash.startsWith('0x') && txHash.length === 66
      
      if (!isValidHash) {
        console.warn('Transaction hash format is invalid, may not be able to wait for confirmation')
        // 如果 hash 格式无效，无法使用 useWaitForTransactionReceipt 等待
        // 这种情况下，如果之前查询的状态是 200，应该已经在上面的逻辑中处理了
        // 否则抛出错误
        throw new Error('Invalid transaction hash format and batch status is not successful')
      }

      // 设置最后一个交易 hash，等待确认
      setLastTxHash(txHash as `0x${string}`)
      setPendingTransactions(transactions)
      setCurrentTxIndex(transactions.length - 1) // 设置为最后一笔交易的索引

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
  }, [address, data?.vault, refreshVault, refreshMint])

  const executeNextTransaction = useCallback((transactions: any[], index: number) => {
    if (index >= transactions.length) {
      // 所有交易已完成
      setLoading(false);
      setPendingTransactions([]);
      setCurrentTxIndex(0);
      setShowSuccessModal(true);
      setTimeout(() => {
        if (data?.vault) {
          refreshVault();
        }
      }, 3000);
      return;
    }

    const transaction = transactions[index];
    const txValue = BigInt(typeof transaction.value === 'string' ? transaction.value : transaction.value.toString());

    // 检查余额是否足够（预留 0.0001 ETH 作为 gas）
    const gasReserve = BigInt('100000000000000'); // 0.0001 ETH
    const requiredBalance = txValue + gasReserve;

    if (ethBalance?.value && ethBalance.value < requiredBalance) {
      console.error(`Insufficient ETH balance for transaction ${index + 1}/${transactions.length}`);
      console.error(`Required: ${requiredBalance.toString()} wei, Available: ${ethBalance.value.toString()} wei`);
      console.error(`Transaction value: ${txValue.toString()} wei`);
      setLoading(false);
      setPendingTransactions([]);
      setCurrentTxIndex(0);
      setErrorMessage(`Insufficient ETH balance. Transaction ${index + 1} requires ${(Number(requiredBalance) / 1e18).toFixed(6)} ETH, but you have ${(Number(ethBalance.value) / 1e18).toFixed(6)} ETH.`);
      setShowFailedModal(true);
      return;
    }

    console.log(`Executing transaction ${index + 1}/${transactions.length}`);
    console.log(`To: ${transaction.to}`);
    console.log(`Value: ${txValue.toString()} wei (${(Number(txValue) / 1e18).toFixed(6)} ETH)`);
    console.log(`Current ETH balance: ${ethBalance?.value ? (Number(ethBalance.value) / 1e18).toFixed(6) : '0'} ETH`);

    try {
      sendTransaction({
        to: transaction.to as `0x${string}`,
        value: txValue,
        data: transaction.data as `0x${string}`,
        chainId: transaction.chainId,
      });
    } catch (error) {
      console.error('Send transaction error:', error);
      setLoading(false);
      setPendingTransactions([]);
      setCurrentTxIndex(0);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to send transaction');
      setShowFailedModal(true);
    }
  }, [sendTransaction, data?.vault, refreshVault, ethBalance])

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
      const isMetaMaskWallet:any = isMetaMask()
      const shouldUseBatch = isMetaMaskWallet && apiData.length > 1

      console.log('Is MetaMask wallet:', isMetaMaskWallet)
      console.log('Transaction count > 1:', apiData.length > 1)
      console.log('Should use batch execution:', shouldUseBatch)

      if (shouldUseBatch) {
        console.log(`Using batch execution (sendCalls) for ${apiData.length} transactions`)
        try {
          const result = await executeBatchTransactions(apiData)
          // 如果返回 'batch_success'，说明已经成功处理（status 200），不需要等待确认
          if (result === 'batch_success') {
            console.log('Batch transaction successful (status 200), no need to wait for receipt')
            return // 直接返回，不执行后续逻辑
          }
          console.log('Batch execution initiated successfully')
        } catch (error: any) {
          console.error('Batch execution error:', error)
          console.error('Error details:', error.message, error.code)
          
          // 如果批量执行失败，回退到顺序执行
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
        // 开始执行第一个交易
        executeNextTransaction(apiData, 0)
      }
    }
  }

  // 切换 tab 时重置 amount
  useEffect(() => {
    setAmount('')
  }, [activeTab])

  useEffect(() => {
    if (mintData && !mintError) {
      handleTransaction(mintData, mintError, setMintParams);
    }
  }, [mintData, mintError])

  useEffect(() => {
    if (repayData && !repayError) {
      handleTransaction(repayData, repayError, setRepayParams);
    }
  }, [repayData, repayError])

  useEffect(() => {
    if (txData && pendingTransactions.length > 0 && txData !== lastTxDataRef.current) {
      console.log(`Transaction ${currentTxIndex + 1}/${pendingTransactions.length} sent successfully:`, txData);
      lastTxDataRef.current = txData;

      // 如果还有待执行的交易，等待当前交易确认后再执行下一个
      if (currentTxIndex + 1 < pendingTransactions.length) {
        // 设置当前交易 hash，等待确认
        setCurrentTxHash(txData as `0x${string}`);
      } else {
        // 最后一个交易，等待确认
        if (txData) {
          setLastTxHash(txData as `0x${string}`);
        }
      }
    }
  }, [txData, pendingTransactions, currentTxIndex])

  // 当当前交易确认成功后，执行下一笔交易
  useEffect(() => {
    if (isCurrentReceiptSuccess && currentTxHash && currentTxIndex + 1 < pendingTransactions.length) {
      console.log(`Transaction ${currentTxIndex + 1} confirmed, executing next transaction...`);
      const nextIndex = currentTxIndex + 1;
      setCurrentTxIndex(nextIndex);
      setCurrentTxHash(undefined); // 重置当前交易 hash
      lastTxDataRef.current = null; // 重置 ref，允许下一笔交易
      // 执行下一笔交易
      executeNextTransaction(pendingTransactions, nextIndex);
    }
  }, [isCurrentReceiptSuccess, currentTxHash, currentTxIndex, pendingTransactions, executeNextTransaction])

  // 监听当前交易确认错误
  useEffect(() => {
    if (isCurrentReceiptError && currentTxHash) {
      console.error(`Transaction ${currentTxIndex + 1} failed on chain`);
      setLoading(false);
      setMintParams(null);
      setRepayParams(null);
      setPendingTransactions([]);
      setCurrentTxIndex(0);
      setCurrentTxHash(undefined);
      setLastTxHash(undefined);
      lastTxDataRef.current = null;
      setErrorMessage(`Transaction ${currentTxIndex + 1} failed on chain. Please check your transaction status.`);
      setShowFailedModal(true);
    }
  }, [isCurrentReceiptError, currentTxHash, currentTxIndex])

  // 监听最后一个交易的确认状态
  useEffect(() => {
    if (isReceiptSuccess && lastTxHash && currentTxIndex + 1 >= pendingTransactions.length) {
      // 交易已确认，显示成功弹窗
      setLoading(false);
      setMintParams(null);
      setRepayParams(null);
      setPendingTransactions([]);
      setCurrentTxIndex(0);
      setLastTxHash(undefined);
      lastTxDataRef.current = null;
      setShowSuccessModal(true);
      setAmount('');
      setTimeout(() => {
        if (data?.vault) {
          refreshVault();
          refreshMint();
        }
      }, 3000);
    }
  }, [isReceiptSuccess, lastTxHash, currentTxIndex, pendingTransactions.length, data?.vault, refreshVault, refreshMint])

  // 监听交易确认错误
  useEffect(() => {
    if (isReceiptError) {
      setLoading(false);
      setMintParams(null);
      setRepayParams(null);
      setPendingTransactions([]);
      setCurrentTxIndex(0);
      setLastTxHash(undefined);
      lastTxDataRef.current = null;
      console.error('Transaction receipt error');
      setErrorMessage('Transaction failed on chain. Please check your transaction status.');
      setShowFailedModal(true);
    }
  }, [isReceiptError])

  useEffect(() => {
    const error = mintError || repayError || txError
    if (error) {
      setLoading(false);
      setMintParams(null);
      setRepayParams(null);
      setPendingTransactions([]);
      setCurrentTxIndex(0);
      lastTxDataRef.current = null;
      console.error('Error:', error);
      setErrorMessage(error.message?.split('.')[0] || '');
      setShowFailedModal(true);
    }
  }, [mintError, repayError, txError])

  useEffect(() => {
    if (amount) {
      setMintParams(null);
      setRepayParams(null);
    }
  }, [amount])

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        maxWidth: { xs: '92%', md: '760px' },
        width: { xs: '92vw', md: '540px' },
        margin: '0 auto',
        padding: 4,
        backgroundColor: '#ffffff',
        borderRadius: 2,
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
        gap: 3,
      }}
    >
      {/* Tabs */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Box
          onClick={() => setActiveTab(0)}
          sx={{
            padding: '8px 16px',
            borderRadius: '20px',
            backgroundColor: activeTab === 0 ? '#e5e7eb' : 'transparent',
            color: activeTab === 0 ? '#000000' : '#9ca3af',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {t('stvaults_mint')}
        </Box>
        <Box
          onClick={() => setActiveTab(1)}
          sx={{
            padding: '8px 16px',
            borderRadius: '20px',
            backgroundColor: activeTab === 1 ? '#e5e7eb' : 'transparent',
            color: activeTab === 1 ? '#000000' : '#9ca3af',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {t('stvaults_repay')}
        </Box>
      </Box>

      {/* My Lido stVaults Section */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography
            sx={{
              fontSize: 14,
              color: '#9ca3af',
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
            borderRadius: 1,
            padding: '12px 16px',
            backgroundColor: '#ffffff',
            cursor: 'pointer',
            '&:hover': {
              borderColor: '#d1d5db',
            },
          }}
        >
          <Typography
            sx={{
              flex: 1,
              fontSize: 14,
              color: '#000000',
              fontWeight: 400,
              fontFamily: 'monospace',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {data?.vault || '0x3m2r3ujefijfiojwf023ruf893ujf9ujoehjfo2'}
          </Typography>
        </Box>
      </Box>

      {/* Enter Amount Section */}
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
              disabled={!address || isLoading}
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
              <img src={EthIcon.src} alt="stETH"
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
                stETH
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: '120px', justifyContent: 'flex-end' }}>
              <Typography
                sx={{
                  fontSize: 12,
                  color: '#7A8AA0',
                  fontWeight: 400,
                  whiteSpace: 'nowrap',
                }}
              >
                {getMaxValue()}
              </Typography>
              <Typography
                onClick={() => {
                  const maxValueFull = getMaxValueFull()
                  if (maxValueFull && maxValueFull !== '0') {
                    setAmount(maxValueFull)
                  }
                }}
                sx={{
                  fontSize: 12,
                  color: '#000000',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
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

      {/* Summary Information */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography
          sx={{
            fontSize: 14,
            color: '#000000',
            fontWeight: 400,
          }}
        >
          {t('stvaults_minted')} <Box component="span" sx={{ fontWeight: 700 }}>{mintDataResult?.liability_steth ? formatWeiToEth(mintDataResult.liability_steth) : '0.0000'}</Box>
        </Typography>
        <Typography
          sx={{
            fontSize: 14,
            color: '#000000',
            fontWeight: 400,
          }}
        >
          {t('stvaults_mintable')} <Box component="span" sx={{ fontWeight: 700 }}>{mintDataResult?.remaining_minting_capacity_steth ? formatWeiToEth(mintDataResult.remaining_minting_capacity_steth) : '0.0000'}</Box>
        </Typography>
      </Box>

      {/* Action Button */}
      <Button
        onClick={() => {
          if (!address) {
            return;
          }
          const amountNum = parseFloat(amount) || 0;
          if (!data?.dashboard || amountNum <= 0) {
            return;
          }

          if (activeTab === 0) {
            // if (mintData && mintParams) {
            //   handleTransaction(mintData, mintError, setMintParams);
            // } else {
              setLoading(true);
              setMintParams({
                from_address: address,
                vault: data.vault,
                amount: amount.toString(),
              });
            // }
          } else if (activeTab === 1) {
            // if (repayData && repayParams) {
            //   handleTransaction(repayData, repayError, setRepayParams);
            // } else {
              setLoading(true);
              setRepayParams({
                from_address: address,
                vault: data.vault,
                amount: amount.toString(),
              });
              console.log('repayParams', amountNum);
            // }
          }
        }}
        disabled={!address || isLoading || !isValidAmount()}
        sx={{
          width: '100%',
          minHeight: '48px',
          padding: '14px 24px',
          backgroundColor: address ? '#ccff00' : '#e5e7eb',
          color: address ? '#000000' : '#9ca3af',
          fontSize: 16,
          fontWeight: 600,
          borderRadius: 1,
          textTransform: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: activeTab === 0 ? 1 : 0,
          '&:hover': {
            backgroundColor: address ? '#b8e600' : '#e5e7eb',
          },
          '&:disabled': {
            backgroundColor: '#e5e7eb',
            color: '#9ca3af',
          },
        }}
      >
        <Box sx={{ minWidth: '80px', textAlign: 'center' }}>
          {activeTab === 0 ? t('stvaults_mint') : t('stvaults_repay')}
        </Box>
        {isLoading && <Loader2 className='w-4 h-4 animate-spin' />}
      </Button>
      <VaultFailedModal onClose={() => setShowFailedModal(false)} message={errorMessage || mintError?.message || repayError?.message || txError?.message || 'Transaction failed'} open={showFailedModal} />
      <VaultSuccessModal onClose={() => setShowSuccessModal(false)} onView={() => { router.back() }}
        onConfirm={() => { setShowSuccessModal(false) }} open={showSuccessModal}
        title={activeTab === 0 ? String(t('stvaults_vault_mint_success')) : String(t('stvaults_vault_repay_success'))}
        subtitle={activeTab === 0 ? String(t('stvaults_vault_mint_success_desc')) : String(t('stvaults_vault_repay_success_desc'))} />
    </Box>
  )
}

export default MintForm
