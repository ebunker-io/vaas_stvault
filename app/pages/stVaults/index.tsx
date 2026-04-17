import { NextPage } from 'next'
import { Box } from '@mui/material'
import { AppLayout } from '../../components/layout'
import Loading from '../../components/stVaults/loading'
import StVaultsForm from '../../components/stVaults/stVaultsForm'
import { useAccount } from 'wagmi'
import { useStVaultDashboard } from '../../hooks/useStVaultDashboard'
import CreateVaultForm from '../../components/stVaults/CreateVaultForm'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

const StVaults: NextPage = () => {
  const router = useRouter()
  const { isCreate, count } = router.query
  const { address }: any = useAccount({})
  const { data, error }: any = useStVaultDashboard(address);
  const [isFirst, setIsFirst] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setIsFirst(true);
    }, 500);
  }, []);

  useEffect(() => {
    if(data){
      setIsFirst(true);
    }
  }, [data]);

  // Handle error gracefully, especially 401 errors
  useEffect(() => {
    if (error) {
      console.error('StVault Dashboard error:', error);
      // Don't crash the page, just set isFirst to true to show the form
      setIsFirst(true);
    }
  }, [error]);

  return (
    <AppLayout>
      <Box sx={{ display: 'flex', flexDirection: 'column', paddingTop: { xs: '30px', md: '60px' }, alignItems: 'center', gap: 2, margin: '0 auto', height: { xs: '100%', md: '800px' } }}>
        <Box sx={{
          display: 'flex', flexDirection: 'column',  borderRadius: "30px",
          boxShadow: '0px 2px 8px 0px rgba(240, 242, 237, 0.5)',
          backgroundColor: '#ffffff',
          width: { xs: '90%', md: '520px' } 
        }}>
          {isCreate ? (
            <CreateVaultForm address={address} apr={data?.rated_apr || 0} count={ data && data.vaults && data.vaults.length || 0} />
          ) : (
            <>
              {((!data && address && !error) || !isFirst) && <Loading />}
              {
                data && data.vaults && data.vaults.length == 0 && <CreateVaultForm count={0} address={address} apr={data.rated_apr || 0}/>
              }
              {((!address && isFirst) || (data && data.vaults && data.vaults.length > 0) || (error && isFirst)) && (
                <StVaultsForm 
                  address={address} 
                  list={data?.vaults || []} 
                  apr={data?.rated_apr || 0}
                />
              )}
            </>
          )}
        </Box>
      </Box>
    </AppLayout >
  )
}

export default StVaults

