import { Box, Typography, TextField, Select, MenuItem, Button, IconButton, Theme, SelectChangeEvent, useTheme, OutlinedInput, InputAdornment, Tooltip } from '@mui/material'
import { InfoOutlined, KeyboardArrowDown, Diamond, KeyboardArrowRight } from '@mui/icons-material'
import { useEffect, useState } from 'react';
import { useAccount, useBalance, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { useStVaultCreate } from '../../hooks/useStVaultDashboard';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import ProtocolItem from './ProtocolItem';
import RewardRate from './RewardRate';
import VaultFailedModal from '../modals/vault-failed';
import VaultSuccessModal from '../modals/vault-success';
import router from 'next/router';

interface StVaultCreateData {
  from: string;
  to: string;
  value: string | number;
  data: string;
  chainId: number;
}

const CreateVaultForm = ({ address, apr, count }: { address: `0x${string}` | undefined, apr: number, count: number }) => {

  const { t } = useTranslation()
  const [loading, setLoading] = useState(false);
  const [createVault, setCreateVault] = useState<any>("");
  const { data: createData, isLoading: createLoading, error: createError } = useStVaultCreate(createVault);
  const { sendTransaction, isPending: isTransactionPending, data: txData, error: txError } = useSendTransaction();
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showFailedModal, setShowFailedModal] = useState(false)
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | undefined>(undefined)
  const { data: balance } = useBalance({ address })

  // 等待交易确认
  const { isLoading: isWaitingReceipt, isSuccess: isReceiptSuccess, isError: isReceiptError } = useWaitForTransactionReceipt({
    hash: lastTxHash,
  })

  const isLoading = loading || createLoading || isTransactionPending || isWaitingReceipt

  useEffect(() => {
    if (address) {
      setLoading(false);
      console.log('StVault Dashboard API called with address:', address);
    }
  }, [address])

  const handleCreateVault = () => {
    if (createError) {
      console.error('StVault Create API error:', createError);
      return;
    }

    if (createData) {
      console.log('StVault Create API response:', createData);

      try {
        setLoading(true);
        sendTransaction({
          to: createData.to as `0x${string}`,
          value: BigInt(typeof createData.value === 'string' ? createData.value : createData.value.toString()),
          data: createData.data as `0x${string}`,
        });
      } catch (error) {
        console.error('Send transaction error:', error);
      }
    }
  }

  useEffect(() => {
    if (createData) {
      console.log('StVault Create API response:', createData);
      handleCreateVault();
    }
  }, [createData])

  useEffect(() => {
    if (txData) {
      console.log('Transaction sent successfully:', txData);
      // 设置交易 hash 并等待确认
      setLastTxHash(txData as `0x${string}`);
    }
  }, [txData])

  // 监听交易确认状态
  useEffect(() => {
    if (isReceiptSuccess && lastTxHash) {
      // 交易已确认，显示成功弹窗
      setLoading(false);
      setLastTxHash(undefined);
      sessionStorage.setItem('creatingCount', (count + 1).toString());
      setShowSuccessModal(true);
    }
  }, [isReceiptSuccess, lastTxHash, count])

  // 监听交易确认错误
  useEffect(() => {
    if (isReceiptError) {
      setLoading(false);
      setLastTxHash(undefined);
      console.error('Transaction receipt error');
      setShowFailedModal(true);
    }
  }, [isReceiptError])

  useEffect(() => {
    if (txError) {
      setLoading(false);
      setLastTxHash(undefined);
      console.error('Transaction error:', txError);
      setShowFailedModal(true);
    }
  }, [txError])

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        maxWidth: { xs: '92%', md: '760px' },
        width: { xs: '92vw', md: '540px' },
        height: { xs: "90%", md: "450px" },
        margin: '0 auto',
        padding: 4,
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
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography
              sx={{
                fontSize: 12,
                color: '#000000',
                opacity: 0.4,
                fontWeight: 400,
              }}
            >
              {t('stvaults_lido_core_deposit')}
            </Typography>
            <Tooltip title={t('stvaults_lido_core_deposit_tooltip')}>
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
          <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => { router.push(`/dashboard?type=lido`) }}>
            <Typography
              sx={{
                fontSize: 14,
                color: '#007AFF',
                fontWeight: 600,
              }}
            >
              {t('my_vaults')}
              <KeyboardArrowRight sx={{ fontSize: 14, color: '#007AFF' }} />
            </Typography>
          </Box>
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            border: '1px solid #E6E6E9',
            borderRadius: "12px",
            padding: '0 16px',
            height: '74px',
            backgroundColor: '#ffffff',
            cursor: 'not-allowed',
            gap: 1
          }}
        >
          <Typography
            sx={{
              flex: 1,
              fontSize: 24,
              color: '#000000',
              fontWeight: 600,
            }}
          >
            1 ETH
          </Typography>

          <Box
            sx={{
              fontSize: 16,
              color: '#000000',
              fontWeight: 500,
              backgroundColor: '#CCFF00',
              borderRadius: '30px',
              width: '86px',
              height: '42px',
              textAlign: 'center',
              lineHeight: '42px',
            }}
          >
            <span>{t('stvaults_lock')}</span>
          </Box>
        </Box>
        {
          balance && balance.value < BigInt(1000000000000000000) &&
          <Typography
            sx={{
              fontSize: 12,
              color: '#FF1414',
              fontWeight: 400,
            }}
          >
            {t('insufficient_wallet_balance')}
          </Typography>
        }
      </Box>

      {/* Rates and Fees Section */}
      <RewardRate apr={apr || 0} />

      {/* Stake Button */}
      <Button
        onClick={() => {
          setLoading(true);
          if (createData) {
            handleCreateVault();
          } else {
            setCreateVault(address);
          }
        }}
        disabled={!address || isLoading || !balance || balance.value < BigInt(1000000000000000000)}
        sx={{
          width: '100%',
          height: '54px',
          padding: '0 16px',
          backgroundColor: address && (!balance || balance.value >= BigInt(1000000000000000000)) ? '#CCFF00' : '#e5e7eb',
          color: address && (!balance || balance.value >= BigInt(1000000000000000000)) ? '#000000' : '#9ca3af',
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
            backgroundColor: address && (!balance || balance.value >= BigInt(1000000000000000000)) ? '#b8e600' : '#e5e7eb',
          },
          '&:disabled': {
            backgroundColor: '#e5e7eb',
            color: '#9ca3af',
          },
        }}
      >
        {t('stvaults_create_lido_vault')}
        {isLoading && <Loader2 className='w-4 h-4 animate-spin' />}
      </Button>

      <VaultFailedModal onClose={() => setShowFailedModal(false)} message={txError?.message?.split('.')[0] || createError?.message?.split('.')[0] || ''} open={showFailedModal} />
      <VaultSuccessModal onClose={() => setShowSuccessModal(false)} onView={() => { router.push(`/dashboard?type=lido`) }}  
       open={showSuccessModal} title={String(t('stvaults_vault_state_success'))} subtitle={String(t('stvaults_vault_state_success_desc'))} />

    </Box>
  )
}

export default CreateVaultForm


