import CircularProgress, { CircularProgressProps } from '@mui/material/CircularProgress'
import { Box, BoxProps, Menu, MenuProps, Popover, Stack, styled, Typography } from '@mui/material'
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material'
import Image from 'next/image'
import { getImage } from '../helpers/image'
import { ReactNode, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useWindowSize } from '../hooks'
import Tooltip, { TooltipProps, tooltipClasses } from '@mui/material/Tooltip';

export function CircularProgressWithLabel(props: CircularProgressProps & { value: number }) {
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <CircularProgress disableShrink variant='determinate' {...props} />
      <Box
        sx={{
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant='caption' component='div' color='text.secondary'>{`${Math.round(props.value)}%`}</Typography>
      </Box>
    </Box>
  )
}

export const AlertDialog = ({
  open,
  title,
  contentText,
  buttonLeftText,
  buttonRightText,
  leftButtonEnable,
  rightButtonEnable,
  onLeftClick,
  onRightClick,
}: {
  open: boolean
  title?: string
  contentText?: string
  buttonLeftText?: string
  buttonRightText?: string
  leftButtonEnable?: boolean
  rightButtonEnable?: boolean
  onLeftClick?: any
  onRightClick?: any
}) => {
  const onClose = () => { }

  const onLeftButtonClicked = () => {
    if (onLeftClick) {
      onLeftClick()
    }
  }

  const onRightButtonClicked = () => {
    if (onRightClick) {
      onRightClick()
    }
  }

  return (
    <Dialog open={open} onClose={onClose} aria-labelledby='alert-dialog-title' aria-describedby='alert-dialog-description'>
      <DialogTitle id='alert-dialog-title'>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText id='alert-dialog-description'>{contentText}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onLeftButtonClicked} color='primary' disabled={!leftButtonEnable}>
          {buttonLeftText}
        </Button>
        <Button onClick={onRightButtonClicked} color='primary' disabled={!rightButtonEnable} autoFocus>
          {buttonRightText}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export const Block = styled(Box)`
  background: #00051626;
  border-radius: 19px;
  padding-top: 40px;
  padding-bottom: 40px;
`

interface UploadBoxProps extends BoxProps {
  onUpload: any
  onResetUpload: any
  title: string
  result: string
  loading: boolean
  uploaded: boolean
}

export const UploadBox = ({ onUpload, onResetUpload, title, result, loading, uploaded, ...props }: UploadBoxProps) => {
  const { t } = useTranslation()
  return (
    <Stack
      {...props as any}
      alignItems={'center'}
      justifyContent={'center'}
      className='border border-neutral-200 border-dashed hover:bg-neutral-50 transition-all'
      sx={{
        width: { md: '382px', xs: '228px' },
        height: '200px',
        borderRadius: '8px',
        position: 'relative',
        '& input': {
          position: 'absolute',
          left: 0,
          top: 0,
          opacity: 0,
          width: '100%',
          height: '100%',
          cursor: 'pointer',
        },
      }}
    >
      {/*@ts-ignore*/}
      {!uploaded && <input type='file' webkitdirectory={'true'} mozdirectory={'true'} multiple={true} onChange={onUpload} accept={'application/json'} />}

      {loading ? (
        <CircularProgress thickness={1} size={40} />
      ) : (
        <Image src={uploaded ? getImage('success2') : getImage('dir')} alt={'dir'} width={55} height={55} />
      )}

      {uploaded ? (
        <Stack direction={'row'} alignItems={'center'} spacing={2} mb={1} mt={8}>
          <Image src={getImage('close')} alt={'close'} width={15} height={15} onClick={onResetUpload} />
          <Box mt={5} className={'upload_title'}>
            {result}
          </Box>
        </Stack>
      ) : (
        <Typography mt={5} className={'upload_title'}>
          {title}
        </Typography>
      )}
    </Stack>
  )
}

export const StyledMenu = styled((props: MenuProps) => (
  <Menu
    elevation={0}
    anchorOrigin={{
      vertical: 'bottom',
      horizontal: 'right',
    }}
    transformOrigin={{
      vertical: 'top',
      horizontal: 'right',
    }}
    {...props}
  />
))(({ theme }) => ({
  '& .MuiPaper-root': {
    padding: '30px 0',
    borderRadius: 6,
    marginTop: theme.spacing(4),
    minWidth: 243,
    color: theme.palette.mode === 'light' ? 'rgb(55, 65, 81)' : theme.palette.grey[300],
    // boxShadow:
    //   'rgb(255, 255, 255) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px',
    // boxShadow: 'rgb(0 0 0 / 24%) 12px 16px 24px, rgb(0 0 0 / 24%) 12px 8px 12px, rgb(0 0 0 / 32%) 4px 4px 8px',
    // border: '1px solid #303030',
    fontSize: 14,
    '& .MuiMenu-list': {
      padding: '0px 17px',
    },
    '& .MuiMenuItem-root:not(:last-child)': {
      marginBottom: '20px',
    },
    '& .MuiMenuItem-root': {
      height: '40px',
      border: '1px solid',
      padding: '12px 24px',
      borderRadius: '5px',
      fontSize: 15,
      fontFamily: "'Montserrat', sans-serif",
      textAlign: 'center',
      fontWeight: 600,
      justifyContent: 'center',
      '& .MuiSvgIcon-root': {
        color: theme.palette.text.secondary,
        marginRight: theme.spacing(1.5),
      },
      '&:hover': {
        // background: 'rgb(19, 26, 22)',
      },
      '&:active': {
        // backgroundColor: alpha(theme.palette.primary.main, theme.palette.action.selectedOpacity),
      },
    },
  },
}))

export const ExitNodeMenu = styled((props: MenuProps) => (
  <Menu
    elevation={0}
    anchorOrigin={{
      vertical: 'bottom',
      horizontal: 'left',
    }}
    transformOrigin={{
      vertical: 'top',
      horizontal: 'left',
    }}
    {...props}
  />
))(({ theme }) => ({
  '& .MuiPaper-root': {
    padding: '2px 0',
    borderRadius: 6,
    marginTop: theme.spacing(0),
    minWidth: 140,
    color: theme.palette.mode === 'light' ? 'rgb(55, 65, 81)' : theme.palette.grey[300],
    // background: '#e0e0e0',
    // boxShadow:
    //   'rgb(255, 255, 255) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px',
    // boxShadow: 'rgb(0 0 0 / 24%) 12px 16px 24px, rgb(0 0 0 / 24%) 12px 8px 12px, rgb(0 0 0 / 32%) 4px 4px 8px',
    // border: '1px solid #303030',
    fontSize: 14,
    '& .MuiMenu-list': {
      padding: '0px 17px',
    },
    '& .MuiMenuItem-root:not(:last-child)': {
      marginBottom: '10px',
    },
    '& .MuiMenuItem-root': {
      height: '30px',
      border: '1px solid',
      padding: '12px 17px',
      borderRadius: '5px',
      fontSize: 15,
      fontFamily: "'Montserrat', sans-serif",
      textAlign: 'center',
      fontWeight: 600,
      justifyContent: 'center',
      '& .MuiSvgIcon-root': {
        color: theme.palette.text.secondary,
        marginRight: theme.spacing(1),
      },
      '&:hover': {
        // background: 'rgb(19, 26, 22)',
      },
      '&:active': {
        // backgroundColor: alpha(theme.palette.primary.main, theme.palette.action.selectedOpacity),
      },
    },
  },
}))

export const LanguageStyledMenu = styled((props: MenuProps) => (
  <Menu
    elevation={0}
    anchorOrigin={{
      vertical: 'bottom',
      horizontal: 'right',
    }}
    transformOrigin={{
      vertical: 'top',
      horizontal: 'right',
    }}
    {...props}
  />
))(({ theme }) => ({
  '& .MuiPaper-root': {
    padding: '13px 0',
    borderRadius: 0,
    marginTop: theme.spacing(4),
    minWidth: 108,
    color: theme.palette.mode === 'light' ? 'rgb(55, 65, 81)' : theme.palette.grey[300],
    background: '#000',
    border: '1px solid #fff',
    // boxShadow:
    //   'rgb(255, 255, 255) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px',
    // boxShadow: 'rgb(0 0 0 / 24%) 12px 16px 24px, rgb(0 0 0 / 24%) 12px 8px 12px, rgb(0 0 0 / 32%) 4px 4px 8px',
    // border: '1px solid #303030',
    fontSize: 14,
    '& .MuiMenu-list': {
      padding: '0px 17px',
    },
    '& .MuiMenuItem-root:not(:last-child)': {
      marginBottom: '2px',
    },
    '& .MuiMenuItem-root': {
      color: '#fff',
      background: 'transparent !important',
      height: '30px',
      padding: '12px 0',
      borderRadius: '5px',
      fontSize: 15,
      fontFamily: "'Montserrat', sans-serif",
      textAlign: 'left',
      fontWeight: 600,
      justifyContent: 'flex-start',
      display: 'flex',
      '& .MuiSvgIcon-root': {
        color: theme.palette.text.secondary,
        marginRight: theme.spacing(1.5),
      },
      '&:hover': {
        background: '#fff',
      },
      '&:active': {
        backgroundColor: '#fff !important',
        // backgroundColor: alpha(theme.palette.primary.main, theme.palette.action.selectedOpacity),
      },
    },
  },
}))

export const AppLanguageStyledMenu = styled((props: MenuProps) => (
  <Menu
    elevation={0}
    anchorOrigin={{
      vertical: 'bottom',
      horizontal: 'right',
    }}
    transformOrigin={{
      vertical: 'top',
      horizontal: 'right',
    }}
    {...props}
  />
))(({ theme }) => ({
  '& .MuiPaper-root': {
    padding: '13px 0',
    borderRadius: 0,
    marginTop: theme.spacing(4),
    minWidth: 108,
    color: theme.palette.mode === 'light' ? 'rgb(55, 65, 81)' : theme.palette.grey[300],
    background: '#fff',
    border: '1px solid #000',
    // boxShadow:
    //   'rgb(255, 255, 255) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px',
    // boxShadow: 'rgb(0 0 0 / 24%) 12px 16px 24px, rgb(0 0 0 / 24%) 12px 8px 12px, rgb(0 0 0 / 32%) 4px 4px 8px',
    // border: '1px solid #303030',
    fontSize: 14,
    '& .MuiMenu-list': {
      padding: '0px 17px',
    },
    '& .MuiMenuItem-root:not(:last-child)': {
      marginBottom: '2px',
    },
    '& .MuiMenuItem-root': {
      background: 'transparent !important',
      height: '30px',
      padding: '12px 0',
      borderRadius: '5px',
      fontSize: 15,
      fontFamily: "'Montserrat', sans-serif",
      textAlign: 'left',
      fontWeight: 600,
      justifyContent: 'flex-start',
      display: 'flex',
      '& .MuiSvgIcon-root': {
        color: theme.palette.text.secondary,
        marginRight: theme.spacing(1.5),
      },
      '&:hover': {
        background: '#fff',
      },
      '&:active': {
        backgroundColor: '#fff !important',
        // backgroundColor: alpha(theme.palette.primary.main, theme.palette.action.selectedOpacity),
      },
    },
  },
}))

export const StyledPopover = ({
  anchorEl,
  onClose,
  content,
  onMouseEnter,
  onMouseLeave,
}: {
  anchorEl: HTMLElement | null
  onClose: any
  content: ReactNode
  onMouseEnter?: any
  onMouseLeave?: any
}) => {
  const open = Boolean(anchorEl)

  return (
    <Popover
      id='mouse-over-popover'
      sx={{
        pointerEvents: 'none',
        mt: '10px',
        '& .MuiPaper-root': {
          boxShadow: 'none',
          background: '#ccff00',
          '&:before': {
            position: 'absolute',
            top: -10,
            content: '" "',
            display: 'block',
            background: '#ccff00',
            width: 0,
            height: 0,
            borderStyle: 'solid',
            borderWidth: '0 5px 5px 5px',
            borderColor: 'transparent transparent #ccff00 transparent',
          },
        },
      }}
      open={open}
      anchorEl={anchorEl}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'center',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'center',
      }}
      onClose={onClose}
      disableRestoreFocus
    >
      <Typography
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        sx={{
          p: '21px 17px',
          maxWidth: '500px',
          fontSize: '12px',
        }}
      >
        {content}
      </Typography>
    </Popover>
  )
}

export const TooltipWithIcon = ({ content }: { content: ReactNode }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  return (
    <Box onMouseEnter={(e) => setAnchorEl(e.currentTarget)} onMouseLeave={() => setAnchorEl(anchorEl)}>
      <img src={getImage('tooltip-icon')} alt='tooltip' width={18} height={18} style={{ cursor: 'pointer' }} />
      <StyledPopover
        onMouseLeave={() => setAnchorEl(null)}
        onMouseEnter={(e: any) => {
          console.log(e)
          setAnchorEl(e.currentTarget)
        }}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        content={content}
      />
    </Box>
  )
}

export const ShowTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: '#ccff00',
    color: 'rgba(0, 0, 0, 0.87)',
    boxShadow: theme.shadows[1],
    fontSize: 11,
  },
}));

export const ClickTooltipWithIcon = ({ content, direction }: { content: ReactNode; direction?: string }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const handlePopoverOpen = (e: any) => {
    setAnchorEl(e.currentTarget)
  }

  const handlePopoverClose = () => {
    setAnchorEl(null)
  }

  const open = Boolean(anchorEl)

  return (
    <div>
      <Box aria-owns={open ? 'mouse-over-popover' : undefined} aria-haspopup='true' onClick={handlePopoverOpen} sx={{ height: 18 }}>
        <img src={getImage('tooltip-icon')} alt='tooltip' width={18} height={18} style={{ cursor: 'pointer' }} />
      </Box>
      <Popover
        id='mouse-over-popover'
        sx={{
          pointerEvents: 'none',
          mt: direction === 'top' ? '-10px' : '10px',
          '& .MuiPaper-root': {
            boxShadow: 'none',
            background: '#ccff00',
            '&:before': {
              position: 'absolute',
              top: -10,
              content: '" "',
              display: 'block',
              background: '#ccff00',
              width: 0,
              height: 0,
              borderStyle: 'solid',
              borderWidth: '0 5px 5px 5px',
              borderColor: 'transparent transparent #ccff00 transparent',
            },
          },
        }}
        open={open}
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: direction === 'top' ? 'top' : 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: direction === 'top' ? 'bottom' : 'top',
          horizontal: 'center',
        }}
        onClose={handlePopoverClose}
        disableRestoreFocus
      >
        <Typography
          sx={{
            p: '21px 17px',
            maxWidth: '500px',
            fontSize: '12px',
          }}
        >
          {content}
        </Typography>
      </Popover>
    </div>
  )
}

export const Warning = ({ content }: { content: ReactNode }) => {
  const { width } = useWindowSize()
  const isMobile = width < 768

  return (
    <Stack direction={'row'} alignItems={'flex-start'} spacing={1}>
      <img src={getImage('warning')} alt='warning' width={isMobile ? 11 : 18} height={isMobile ? 11 : 18} style={{ marginTop: '2px' }} />
      <Box color={'#f24e1e'} fontSize={{ md: 15, xs: 10 }} fontWeight={600}>
        {content}
      </Box>
    </Stack>
  )
}

export const RevealBox = ({ onSetReveal }: { onSetReveal: any }) => {
  const [reveal, setReveal] = useState(true)
  return (
    <Box sx={{ width: '40px', position: 'relative', pl: '20px' }}>
      <Box
        sx={{
          width: '1px',
          height: '100%',
          background: '#000',
        }}
      />
      <Stack
        alignItems={'center'}
        justifyContent={'center'}
        onClick={() => {
          onSetReveal(!reveal)
          setReveal(!reveal)
        }}
        sx={{
          width: '21px',
          height: '40px',
          position: 'absolute',
          top: '50%',
          left: '10px',
          background: '#fff',
          cursor: 'pointer',
        }}
      >
        {reveal && <img src={getImage('reveal')} alt='' width={21} height={15} />}
        {!reveal && <img src={getImage('unrevealed')} alt='' width={21} height={15} />}
      </Stack>
    </Box>
  )
}

export const StakeNotice = ({ onClick }: { onClick: any }) => {
  const { width } = useWindowSize()
  const isMobile = width < 768
  const { t } = useTranslation()
  return (
    <Stack direction={'row'} justifyContent={'center'} mb={6} onClick={onClick} sx={{ cursor: 'pointer' }}>
      <Stack
        direction={'row'}
        alignItems={'center'}
        justifyContent={'center'}
        gap={1}
        sx={{
          fontSize: 12,
          background: '#d9d9d9',
          width: '648px',
          height: '32px',
          borderRadius: '4px',
        }}
      >
        <img src={getImage('warning')} alt='warning' width={isMobile ? 11 : 16} height={isMobile ? 11 : 16} />
        {t('stake_notice')}
      </Stack>
    </Stack>
  )
}
