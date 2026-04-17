import { KeyboardArrowDown } from "@mui/icons-material";
import { Box, Typography } from "@mui/material";
import Lido from '../../assets/images/stvault/image-lido-eth.svg';
import { useTranslation } from 'react-i18next';

const ProtocolItem = () => {
    const { t } = useTranslation()
    return <Box
        sx={{
            display: 'flex',
            alignItems: 'center',
            border: '1px solid #E6E6E9',
            borderRadius: "12px",
            padding: '0 16px',
            height: '54px',
            backgroundColor: '#ffffff',
            cursor: 'not-allowed',
            gap: 1
        }}
    >
        <img
            src={Lido.src}
            style={{
                width: 28,
                height: 28, 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 1.5,
            }}
        />

        <Typography
            sx={{
                flex: 1,
                fontSize: 16,
                color: '#000000',
                fontWeight: 500,
            }}
        >
            {t('stvaults_lido_stvaults')}
        </Typography>
        <KeyboardArrowDown sx={{ color: '#C7C9D2' }} />
    </Box>
}

export default ProtocolItem;