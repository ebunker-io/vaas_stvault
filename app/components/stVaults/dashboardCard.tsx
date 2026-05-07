import { Box, Typography, Button, Link, Divider, Chip } from '@mui/material'
import { KeyboardArrowRight } from '@mui/icons-material'
import { useRouter } from 'next/router'
import { DashboardCardData } from '../../types'
import { useTranslation } from 'react-i18next'
import { useCallback, useMemo } from 'react'
import { BUILD_ENV } from '../../config'
import ImageUser0 from '../../assets/images/stvault/image-user0.png'
import ImageUser1 from '../../assets/images/stvault/image-user1.png'
import ImageUser2 from '../../assets/images/stvault/image-user2.png'
import ImageUser3 from '../../assets/images/stvault/image-user3.png'
import { formatEther } from 'viem'

const formatAddress = (address: string) => {
  if (!address) return '';
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}....${address.slice(-4)}`;
}

function ethAddressToWithdrawalCredentials(ethAddress: string) {
  if (!/^0x[0-9a-fA-F]{40}$/.test(ethAddress)) {
    throw new Error("invalid eth address");
  }

  return (
    "0x02" +
    "0000000000000000000000" + // 11 bytes zero padding
    ethAddress.slice(2).toLowerCase()
  );
}

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
const formatHealthFactor = (healthFactor: string | null | undefined) => {
  if (!healthFactor || healthFactor === 'Infinity') return '∞';
  const num = parseFloat(healthFactor);
  if (!Number.isFinite(num) || num >= 9999) return '∞';
  if (num < 0) return '—';
  return `${Math.round(num)}%`;
}

// 根据 address 生成 hash 值并返回对应的用户图片
const getUserImage = (address: string) => {
  if (!address) return ImageUser0.src;

  // 简单的 hash 函数：将 address 字符串转换为数字
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    const char = address.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // 取绝对值并 % 4，得到 0-3 的值
  const index = Math.abs(hash) % 4;

  const images = [ImageUser0.src, ImageUser1.src, ImageUser2.src, ImageUser3.src];
  return images[index];
}

const DashboardCard = ({ data }: { data: DashboardCardData }) => {
  const router = useRouter()
  const { t } = useTranslation()

  const handleButtonClick = (type: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('stVaultData', JSON.stringify(data))
    }
    router.push(`/dashboard/form?type=${type}`)
  }

  const totalEth = formatWeiToEth(data.total_value);
  const liabilitySteth = formatWeiToEth(data.liability_steth);
  const remainingMinting = formatWeiToEth(data.remaining_minting_steth);
  const healthFactor = formatHealthFactor(data.health_factor);
  const stakingApr = data.staking_apr ? `${data.staking_apr > 0 ? '+' : ''}${data.staking_apr.toFixed(2)}%` : '0%';

  const linkToLido = useCallback(() => {
    const isTestnet = BUILD_ENV === 'hoodi' || BUILD_ENV === 'test' || BUILD_ENV === 'goerli' || BUILD_ENV === 'local';
    const baseUrl = isTestnet
      ? 'https://stvaults-hoodi.testnet.fi/vaults/'
      : 'https://stvaults.lido.fi/vaults/';
    const url = `${baseUrl}${data.vault}`;
    window.open(url, '_blank');
  }, [data.vault]);

  const linkToValidators = useCallback(() => {
    if (!data?.vault) return;
    const vault = ethAddressToWithdrawalCredentials(data.vault);
    const url = `https://hoodi.beaconcha.in/validators/deposits?q=${vault}`;
    window.open(url, '_blank');
  }, [data.vault]);

  const userImage = useMemo(() => getUserImage(data.vault), [data.vault]);
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        maxWidth: { xs: '100%', md: '1000px' },
        width: '100%',
        margin: '0 auto',
        padding: "30px",
        backgroundColor: '#ffffff',
        borderRadius: 2,
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
        gap: 3,
      }}
    >
      {/* Top Section */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: { xs: 'wrap', md: 'nowrap' },
          gap: 2,
        }}
      >
        {/* Left: Vault Address */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              overflow: 'hidden',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={userImage}
              alt="User avatar"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: 12,
                color: '#6b7280',
                fontWeight: 400,
              }}
            >
              {t('stvaults_vault_address')}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                sx={{
                  fontSize: 18,
                  color: '#000000',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {formatAddress(data.vault)}
              </Typography>
              <Link
                onClick={(e) => {
                  e.preventDefault();
                  linkToLido();
                }}
                sx={{
                  fontSize: 14,
                  color: '#007AFF',
                  fontWeight: 400,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  cursor: 'pointer',
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                {t('stvaults_lido_stvaults')}
                <KeyboardArrowRight sx={{ fontSize: 16 }} />
              </Link>
              <Chip
                label={`${t('stvaults_health_factor')} ${healthFactor}`}
                sx={{
                  height: 24,
                  fontSize: 12,
                  fontWeight: 500,
                  backgroundColor: '#dbeafe',
                  color: '#007AFF',
                  '& .MuiChip-label': {
                    padding: '0 8px',
                  },
                }}
              />
            </Box>
          </Box>
        </Box>

        {/* <Box sx={{ width: '0px', flex: 1 }}></Box> */}

        {/* Right: Net Staking APR */}
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1 }}>
            <Typography
              sx={{
                fontSize: 14,
                color: '#7A8AA0',
                fontWeight: 400,
              }}
            >
              {t('stvaults_net_staking_apr')}
            </Typography>
            <Typography
              sx={{
                fontSize: 32,
                color: '#000000',
                fontWeight: 600,
              }}
            >
              {stakingApr}
            </Typography>
          </Box>
          <Box sx={{ width: '1px', height: "50px", backgroundColor: '#E6E6E9' }}></Box>
          <Link
            onClick={(e) => {
              e.preventDefault();
              linkToValidators();
            }}
            target="_blank"
            sx={{
              fontSize: 14,
              color: '#7A8AA0',
              fontWeight: 400,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              '&:hover': {
                textDecoration: 'underline',
              },
              cursor: 'pointer',
            }}
          >
            {t('stvaults_validators')}
            <KeyboardArrowRight sx={{ fontSize: 12, width: 12, height: 12, color: '#7A8AA0' }} />
          </Link>
        </Box>
      </Box>

      {/* Divider */}
      <Divider sx={{ borderColor: '#e5e7eb' }} />

      {/* Bottom Section */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 3,
          alignItems: 'center',
        }}
      >
        {/* Left: Total ETH */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography
              sx={{
                fontSize: 12,
                color: '#6b7280',
                fontWeight: 400,
              }}
            >
              {t('stvaults_total_eth')}
            </Typography>
            <Typography
              sx={{
                fontSize: 32,
                color: '#000000',
                fontWeight: 700,
              }}
            >
              {totalEth} ETH
            </Typography>
            <Typography
              sx={{
                fontSize: 11,
                color: '#9ca3af',
                fontWeight: 400,
                opacity: 0,
              }}
            >
              Remaining minting
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 4, flexDirection: { xs: 'column', sm: 'row' }, pr: { xs: 0, md: 10 } }}>
            <Button
              onClick={() => handleButtonClick('stake')}
              sx={{
                flex: 1,
                padding: '12px 24px',
                backgroundColor: '#ccff00',
                color: '#000000',
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 3,
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: '#b8e600',
                },
              }}
            >
              {t('stvaults_deposit')}
            </Button>
            <Button
              onClick={() => handleButtonClick('withdraw')}
              variant="outlined"
              sx={{
                flex: 1,
                padding: '12px 24px',
                borderColor: '#d1d5db',
                color: '#6b7280',
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 3,
                textTransform: 'none',
                '&:hover': {
                  borderColor: '#9ca3af',
                  backgroundColor: '#f9fafb',
                },
              }}
            >
              {t('stvaults_withdraw')}
            </Button>
          </Box>
        </Box>

        {/* Right: stETH liability */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography
              sx={{
                fontSize: 12,
                color: '#6b7280',
                fontWeight: 400,
              }}
            >
              {t('stvaults_steth_liability')}
            </Typography>
            <Typography
              sx={{
                fontSize: 32,
                color: '#000000',
                fontWeight: 700,
              }}
            >
              {liabilitySteth} stETH
            </Typography>
            <Typography
              sx={{
                fontSize: 11,
                color: '#9ca3af',
                fontWeight: 400,
              }}
            >
              {t('stvaults_remaining_minting_capacity')} {remainingMinting} stETH
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 4, flexDirection: { xs: 'column', sm: 'row' }, pr: { xs: 0, md: 10 } }}>
            <Button
              onClick={() => handleButtonClick('mint')}
              sx={{
                flex: 1,
                padding: '12px 24px',
                backgroundColor: '#ccff00',
                color: '#000000',
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 3,
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: '#b8e600',
                },
              }}
            >
              {t('stvaults_mint')}
            </Button>
            <Button
              onClick={() => handleButtonClick('repay')}
              variant="outlined"
              sx={{
                flex: 1,
                padding: '12px 24px',
                borderColor: '#d1d5db',
                color: '#6b7280',
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 3,
                textTransform: 'none',
                '&:hover': {
                  borderColor: '#9ca3af',
                  backgroundColor: '#f9fafb',
                },
              }}
            >
              {t('stvaults_repay')}
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

export default DashboardCard

