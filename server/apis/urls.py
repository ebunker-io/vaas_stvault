from django.urls import path

from .views import session
from .views import captcha
from .views import customer
from .views import stvault
from .views import rpc

app_name = 'api'
urlpatterns = [
    path('rpc/eth-mainnet', rpc.RpcProxyMainnetView.as_view(), name="rpc_eth_mainnet"),
    path('rpc/hoodi', rpc.RpcProxyHoodiView.as_view(), name="rpc_hoodi"),
    path('sessions', session.SessionApiView.as_view(), name="login"),

    path('captchas', captcha.CaptchaApiView.as_view(), name="captchas"),
    path('captchas/bind_email', captcha.EmailCaptchaApiView.as_view(), name="create_bind_email_captcha"),
    path('captchas/bind_withdraw_address', captcha.WithdrawAddressCaptchaApiView.as_view(), name="create_bind_withdraw_address_captcha"),

    path('customers/verify_email_bind', customer.CustomerBindEmailApiView.as_view(), name="verify_email_bind"),
    path('customers/my_info', customer.CustomerMyInfoApiView.as_view(), name="my_info"),
    path('customers/reward_address', customer.CustomerRewardAddressApiView.as_view(), name='reward_address'),

    # stvault / Dashboard
    path('v2/stvault/create', stvault.StVaultCreateApiView.as_view(), name='stvault_create_dashboard'),
    path('v2/stvault/create/hash', stvault.StVaultCreateHashApiView.as_view(), name='stvault_create_hash'),
    path('v2/stvault/list', stvault.StVaultListApiView.as_view(), name='stvault_list'),
    path('v2/stvault/dashboard/list', stvault.StVaultDashboardListApiView.as_view(), name='stvault_dashboard _list'),
    path('v2/stvault/supply', stvault.DashboardSupplyApiView.as_view(), name='stvault_fund_to_dashboard'),
    path('v2/stvault/withdraw', stvault.DashboardWithdrawApiView.as_view(), name='stvault_withdraw_from_dashboard'),
    path('v2/stvault/mint_steth', stvault.DashboardMintstETHApiView.as_view(), name='stvault_mint_steth_to_dashboard'),
    path('v2/stvault/repay_steth', stvault.DashboardRepaystETHApiView.as_view(), name='stvault_repay_steth_to_dashboard'),
    path('v2/stvault/metrics', stvault.DashboardMetricsDataApiView.as_view(), name='stvault_metrics_data'),
    path('v2/stvault/refresh', stvault.StVaultInfoRefreshApiView.as_view(), name='stvault_info_refresh'),
    path('v2/stvault/refresh/balance', stvault.StVaultRefreshBalanceApiView.as_view(), name='stvault_refresh_balance'),
    path('v2/stvault/refresh/mint_balance', stvault.StVaultRefreshMintBalanceApiView.as_view(), name='stvault_refresh_mint_balance_steth'),
    path('v2/stvault/statistics', stvault.StVaultStatisticsApiView.as_view(), name='stvault_statistics'),

    # stvault / operator / PDG
    path('v2/stvault/operator/guarantor', stvault.PDGGuarantorApiView.as_view(), name='stvault_set_guarantor'),
    path('v2/stvault/operator/depositor', stvault.PDGDepositorApiView.as_view(), name='stvault_set_depositor'),
    path('v2/stvault/operator/guarantee', stvault.PDGGuaranteeApiView.as_view(), name='stvault_guarantee_amount'),
    path('v2/stvault/operator/predeposit', stvault.PDGPredepositApiView.as_view(), name='stvault_predeposit'),
    path('v2/stvault/operator/proveandtopup', stvault.PDGProveWCAndTopUpApiView.as_view(), name='stvault_prove_wc_activate_and_top_up_validators'),
    path('v2/stvault/operator/topup', stvault.PDGTopUpApiView.as_view(), name='stvault_topup_existing_validators'),
    path('v2/stvault/operator/validator/exit', stvault.PDGRequestValidatorExitApiView.as_view(), name='stvault_request_validator_exit'),
    path('v2/stvault/operator/withdraw', stvault.PDGWithdrawNOBalanceApiView.as_view(), name='stvault_withdraw_node_operator_balance'),
    path('v2/stvault/operator/prove_unknown', stvault.PDGProveUnknownValidatorApiView.as_view(), name='stvault_prove_unknown_validator'),
]
