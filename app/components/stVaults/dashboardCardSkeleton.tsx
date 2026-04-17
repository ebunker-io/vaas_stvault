import { Box, Skeleton, Divider } from '@mui/material'

const DashboardCardSkeleton = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        maxWidth: { xs: '100%', md: '900px' },
        width: '100%',
        margin: '0 auto',
        padding: 3,
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
          <Skeleton
            variant="circular"
            width={48}
            height={48}
          />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
            <Skeleton
              variant="rectangular"
              width="40%"
              height={14}
              sx={{ borderRadius: 1 }}
            />
            <Skeleton
              variant="rectangular"
              width="70%"
              height={20}
              sx={{ borderRadius: 1 }}
            />
          </Box>
        </Box>

        {/* Right: Net Staking APR */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: { xs: 'flex-start', md: 'flex-end' } }}>
          <Skeleton
            variant="rectangular"
            width={100}
            height={14}
            sx={{ borderRadius: 1 }}
          />
          <Skeleton
            variant="rectangular"
            width={80}
            height={24}
            sx={{ borderRadius: 1 }}
          />
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
        }}
      >
        {/* Left: Total ETH */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Skeleton
              variant="rectangular"
              width="30%"
              height={14}
              sx={{ borderRadius: 1 }}
            />
            <Skeleton
              variant="rectangular"
              width="60%"
              height={36}
              sx={{ borderRadius: 1 }}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <Skeleton
              variant="rectangular"
              width="100%"
              height={44}
              sx={{ borderRadius: 1 }}
            />
            <Skeleton
              variant="rectangular"
              width="100%"
              height={44}
              sx={{ borderRadius: 1 }}
            />
          </Box>
        </Box>

        {/* Right: stETH liability */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Skeleton
              variant="rectangular"
              width="35%"
              height={14}
              sx={{ borderRadius: 1 }}
            />
            <Skeleton
              variant="rectangular"
              width="60%"
              height={36}
              sx={{ borderRadius: 1 }}
            />
            <Skeleton
              variant="rectangular"
              width="80%"
              height={12}
              sx={{ borderRadius: 1 }}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <Skeleton
              variant="rectangular"
              width="100%"
              height={44}
              sx={{ borderRadius: 1 }}
            />
            <Skeleton
              variant="rectangular"
              width="100%"
              height={44}
              sx={{ borderRadius: 1 }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

export default DashboardCardSkeleton

