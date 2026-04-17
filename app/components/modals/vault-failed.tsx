import { Box, Dialog, DialogProps, Stack, Typography, Button } from '@mui/material'
import { Cancel } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'

interface VaultFailedModalProps extends DialogProps {
  onClose?: () => void
  message?: string
}

const VaultFailedModal = ({ onClose, message, ...props }: VaultFailedModalProps): JSX.Element => {
  const { t } = useTranslation()

  return (
    <Dialog
      keepMounted
      {...props}
      transitionDuration={300}
      sx={{
        '.MuiPaper-root': {
          borderRadius: '12px',
          padding: '24px',
          minWidth: { md: '400px', xs: '320px' },
          border: '1px dashed #d1d5db',
          backgroundColor: "white"
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        {/* Error Icon */}
        <Box
          sx={{
            position: 'relative',
            width: 80,
            height: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Animated rings */}
          <Box
            sx={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              border: '2px solid #ef4444',
              opacity: 0.3,
              animation: 'pulse 2s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': {
                  transform: 'scale(1)',
                  opacity: 0.3,
                },
                '50%': {
                  transform: 'scale(1.2)',
                  opacity: 0.1,
                },
              },
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              width: '70%',
              height: '70%',
              borderRadius: '50%',
              border: '2px dashed #ef4444',
              opacity: 0.4,
              animation: 'pulse 2s ease-in-out infinite 0.3s',
            }}
          />
          {/* Main circle with X */}
          <Box
            sx={{
              position: 'relative',
              width: 60,
              height: 60,
              borderRadius: '50%',
              backgroundColor: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
            }}
          >
            <Cancel sx={{ fontSize: 40, color: '#ffffff' }} />
          </Box>
        </Box>

        {/* Title */}
        <Typography
          sx={{
            fontSize: { xs: 20, md: 24 },
            fontWeight: 700,
            color: '#000000',
            textAlign: 'center',
          }}
        >
          Transaction failed
        </Typography>

        {/* Subtitle */}
        <Typography
          sx={{
            fontSize: 14,
            color: '#FF1414',
            fontWeight: 400,
            textAlign: 'center',
            maxWidth: '320px',
          }}
        >
          {message || 'Transaction failed. Please check the reason and try again.'}
        </Typography>

        {/* Close Button */}
        <Button
          onClick={() => {
            if (onClose) {
              onClose()
            }
            // @ts-ignore
            if (props.onClose) {
              // @ts-ignore
              props.onClose()
            }
          }}
          sx={{
            width: '100%',
            padding: '12px 24px',
            backgroundColor: '#CCFF00',
            color: '#000000',
            fontSize: 14,
            fontWeight: 500,
            borderRadius: '8px',
            textTransform: 'none',
            mt: 2,
            '&:hover': {
              opacity: 0.7,
            },
          }}
        >
          Close
        </Button>
      </Box>
    </Dialog>
  )
}

export default VaultFailedModal

