import { Box, Dialog, DialogProps, Stack, Typography, Button } from '@mui/material'
import { CheckCircle } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'

interface VaultSuccessModalProps extends DialogProps {
  onView?: () => void
  onConfirm?: () => void
  title?: string
  subtitle?: string
}

const VaultSuccessModal = ({ onView, onConfirm, title, subtitle, ...props }: VaultSuccessModalProps): JSX.Element => {
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
          backgroundColor: '#FFFFFF',
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        {/* Success Icon */}
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
              border: '2px solid #10b981',
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
              border: '2px dashed #10b981',
              opacity: 0.4,
              animation: 'pulse 2s ease-in-out infinite 0.3s',
            }}
          />
          {/* Main circle with checkmark */}
          <Box
            sx={{
              position: 'relative',
              width: 60,
              height: 60,
              borderRadius: '50%',
              backgroundColor: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
            }}
          >
            <CheckCircle sx={{ fontSize: 40, color: '#ffffff' }} />
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
          {title || 'Vault created successfully'}
        </Typography>

        {/* Subtitle */}
        {subtitle && (
          <Typography
            sx={{
              fontSize: 14,
              color: '#6b7280',
              fontWeight: 400,
              textAlign: 'center',
              maxWidth: '320px',
            }}
          >
            {subtitle}
          </Typography>
        )}

        {/* Buttons */}
        <Stack direction={'row'} spacing={2} sx={{ width: '100%', mt: 2 }}>
          {onView && (
            <Button
              onClick={() => {
                if (onView) {
                  onView()
                }
                // @ts-ignore
                if (props.onClose) {
                  // @ts-ignore
                  props.onClose()
                }
              }}
              variant="outlined"
              sx={{
                flex: 1,
                padding: '12px 24px',
                borderColor: '#d1d5db',
                color: '#000000',
                fontSize: 16,
                fontWeight: 500,
                borderRadius: '8px',
                textTransform: 'none',
                '&:hover': {
                  opacity: 0.7,
                },
              }}
            >
              View
            </Button>
          )}
          {onConfirm && (
            <Button
              onClick={() => {
                if (onConfirm) {
                  onConfirm()
                }
                // @ts-ignore
                if (props.onClose) {
                  // @ts-ignore
                  props.onClose()
                }
              }}
              sx={{
                flex: 1,
                padding: '12px 24px',
                backgroundColor: '#CCFF00',
                color: '#000000',
                fontSize: 16,
                fontWeight: 500,
                borderRadius: '8px',
                textTransform: 'none',
                '&:hover': {
                  opacity: 0.7,
                },
              }}
            >
              Confirm
            </Button>
          )}
        </Stack>
      </Box>
    </Dialog>
  )
}

export default VaultSuccessModal

