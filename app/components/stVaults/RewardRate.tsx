import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import { InfoOutlined } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const RewardRate = ({ apr }: { apr: number }) => {
    const { t } = useTranslation()
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography
                sx={{
                  fontSize: 14,
                  color: '#000000',
                  fontWeight: 400,
                }}
              >
                {t('stvaults_reward_rate')}
              </Typography>
              <Tooltip title={t('stvaults_reward_rate_tooltip')}>
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
            <Typography
              sx={{
                fontSize: 14,
                color: '#000000',
                fontWeight: 600,
              }}
            >
              {apr} %
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography
                sx={{
                  fontSize: 14,
                  color: '#000000',
                  fontWeight: 400,
                }}
              >
                {t('stvaults_service_fee')}
              </Typography>
              <Tooltip title={t('stvaults_service_fee_tooltip')}>
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
            <Typography
              sx={{
                fontSize: 14,
                color: '#000000',
                fontWeight: 600,
              }}
            >
              0.0867 %
            </Typography>
          </Box>
        </Box>
    )
  }

export default RewardRate;