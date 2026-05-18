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
import { formatTransactionError } from '../../helpers/chain'
import { executeBatchSendCalls } from '../../helpers/batchTransaction'


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
    if (!address) throw new Error('Wallet not connected')

    const outcome = await executeBatchSendCalls(address, transactions)

    if (outcome.kind === 'batch_success_no_hash') {
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
    }

    setLastTxHash(outcome.txHash)
    setPendingTransactions(transactions)
    setCurrentTxIndex(transactions.length - 1)
    return outcome.txHash
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


    try {
      sendTransaction({
        to: transaction.to as `0x${string}`,
        value: txValue,
        data: transaction.data as `0x${string}`,
        chainId: transaction.chainId,
        // 后端用 estimate_gas + 1.2x buffer 算出 gas，避免钱包自己估算时
        // 在含 oracle proof / state-dependent 的 stVault tx 上估低导致 revert
        gas: transaction.gas ? BigInt(transaction.gas) : undefined,
      });
    } catch (error) {
      console.error('Send transaction error:', error);
      setLoading(false);
      setPendingTransactions([]);
      setCurrentTxIndex(0);
      setErrorMessage(formatTransactionError(error, t));
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
      setLoading(true);
      setParams(null);
      setPendingTransactions(apiData);
      setCurrentTxIndex(0);
      lastTxDataRef.current = null;

      // 判断是否使用批量合并：MetaMask 钱包且交易数大于 1
      const isMetaMaskWallet:any = isMetaMask()
      const shouldUseBatch = isMetaMaskWallet && apiData.length > 1


      if (shouldUseBatch) {
        try {
          const result = await executeBatchTransactions(apiData)
          // 如果返回 'batch_success'，说明已经成功处理（status 200），不需要等待确认
          if (result === 'batch_success') {
            return // 直接返回，不执行后续逻辑
          }
        } catch (error: any) {
          console.error('Batch execution error:', error)
          console.error('Error details:', error.message, error.code)
          
          // 如果批量执行失败，回退到顺序执行
          executeNextTransaction(apiData, 0)
        }
      } else {
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
      setErrorMessage(formatTransactionError(error, t));
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
            {data?.vault || ''}
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
            setLoading(true);
            setMintParams({
              from_address: address,
              vault: data.vault,
              amount: amount.toString(),
            });
          } else if (activeTab === 1) {
            setLoading(true);
            setRepayParams({
              from_address: address,
              vault: data.vault,
              amount: amount.toString(),
            });
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
