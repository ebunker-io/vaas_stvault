import {createTheme} from '@mui/material'

export const subTextColor = '#7f7a87'
export const titleTextColor = '#2d72de'

export const theme = createTheme({
  spacing: 5,
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 1000,
      lg: 1200,
      xl: 1560,
    },
  },
  palette: {
    mode: 'light',
    primary: {
      main: '#2d6aa7',
    },
  },
  components: {
    MuiTypography: {
      defaultProps: {
        fontFamily: "'Montserrat', sans-serif",
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          width: '480px',
          maxWidth: '100%',
          borderRadius: '7px',
          background: '#ccff00',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        variant: 'contained',
        disableElevation: false,
        disableRipple: false,
        disableFocusRipple: false,
        disableTouchRipple: false,
      },
      styleOverrides: {
        contained: {
          minWidth: '100px',
          textTransform: 'initial',
          boxShadow: 'none',
          ':hover': {
            boxShadow: 'none',
          },
        },
        containedSecondary: {
          background: '#000516',
          borderRadius: '6px',
          color: '#909090',
          ':hover': {
            background: '#000516',
          },
        },
      },
    },
  },
})
