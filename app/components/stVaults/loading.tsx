import { Box, Skeleton } from '@mui/material'

const Loading = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        maxWidth: { xs: '92%', md: '760px' },
        width: { xs: '92vw', md: '540px' },
        height: { xs:"90%", md:"650px"},
        padding: "32px 16px",
        gap: 2
      }}
    >
      {/* Header/Title Area */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          marginBottom: 3,
        }}
      >
        <Skeleton
          variant="rectangular"
          width="60%"
          height={24}
          sx={{ borderRadius: 1 }}
        />
        <Skeleton
          variant="text"
          width="30%"
          height={16}
          sx={{ borderRadius: 1 }}
        />
        <Skeleton
          variant="rectangular"
          width="100%"
          height={48}
          sx={{ borderRadius: 1 }}
        />
      </Box>

      {/* Main Content Area */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          marginBottom: 3,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Skeleton
            variant="text"
            width="25%"
            height={16}
            sx={{ borderRadius: 1 }}
          />
          <Skeleton
            variant="text"
            width="15%"
            height={16}
            sx={{ borderRadius: 1 }}
          />
        </Box>
        <Skeleton
          variant="rectangular"
          width="100%"
          height={200}
          sx={{ borderRadius: 1 }}
        />
      </Box>

      {/* Footer/Action Area */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          <Skeleton
            variant="text"
            width="20%"
            height={16}
            sx={{ borderRadius: 1 }}
          />
          <Skeleton
            variant="text"
            width="25%"
            height={16}
            sx={{ borderRadius: 1 }}
          />
        </Box>
        <Skeleton
          variant="rectangular"
          width="100%"
          height={48}
          sx={{ borderRadius: 1 }}
        />
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              flex: 1,
            }}
          >
            <Skeleton
              variant="text"
              width="30%"
              height={16}
              sx={{ borderRadius: 1 }}
            />
            <Skeleton
              variant="text"
              width="35%"
              height={16}
              sx={{ borderRadius: 1 }}
            />
          </Box>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              alignItems: 'flex-end',
            }}
          >
            <Skeleton
              variant="text"
              width={60}
              height={16}
              sx={{ borderRadius: 1 }}
            />
            <Skeleton
              variant="text"
              width={60}
              height={16}
              sx={{ borderRadius: 1 }}
            />
          </Box>
        </Box>
        <Skeleton
          variant="rectangular"
          width="100%"
          height={48}
          sx={{ borderRadius: 1 }}
        />
      </Box>
    </Box>
  )
}

export default Loading

