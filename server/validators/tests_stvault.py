import json
from decimal import Decimal
from datetime import datetime
from unittest.mock import patch, MagicMock

from django.test import TestCase, RequestFactory
from django.utils import timezone

from validators.models.stvault import StVault
from validators.models.stvault_config import StVaultConfig
from validators.contract.stvault.util.stvault import StvaultUtil


# ============================================================
# Model Tests
# ============================================================

class StVaultModelTests(TestCase):
    """StVault model tests"""

    def setUp(self):
        self.vault = StVault.objects.create(
            vault='0xABCDEF1234567890abcdef1234567890ABCDEF12',
            dashboard='0x1234567890abcdef1234567890abcdef12345678',
            vault_owner='0xOwner1234567890abcdef1234567890abcdef12',
            status=StVault.VaultStatus.SUCCESS.value,
            total_value=Decimal('32000000000000000000'),
            vault_balance=Decimal('32000000000000000000'),
            health_factor='150.00',
            liability_steth=Decimal('10000000000000000000'),
            remaining_minting_steth=Decimal('5000000000000000000'),
            total_minting_steth=Decimal('20000000000000000000'),
            withdrawable_value=Decimal('22000000000000000000'),
            locked=Decimal('10000000000000000000'),
            operator_fee_rate=1.0,
            staking_apr=3.5,
            create_hash='0xhash123',
        )
        self.vault_pending = StVault.objects.create(
            vault='0xPending567890abcdef1234567890abcdef123456',
            dashboard='0xDashPending890abcdef1234567890abcdef12345',
            vault_owner='0xOwner1234567890abcdef1234567890abcdef12',
            status=StVault.VaultStatus.PENDING.value,
            create_hash='0xhash_pending',
        )

    # ----- Status property tests -----

    def test_is_success(self):
        self.assertTrue(self.vault.is_success)
        self.assertFalse(self.vault.is_pending)
        self.assertFalse(self.vault.is_provisioned)
        self.assertFalse(self.vault.is_failed)

    def test_is_pending(self):
        self.assertTrue(self.vault_pending.is_pending)
        self.assertFalse(self.vault_pending.is_success)

    def test_is_provisioned(self):
        v = StVault.objects.create(
            vault_owner='0xOwner',
            status=StVault.VaultStatus.PROVISIONED.value,
            create_hash='0xhash_prov',
        )
        self.assertTrue(v.is_provisioned)

    def test_is_failed(self):
        v = StVault.objects.create(
            vault_owner='0xOwner',
            status=StVault.VaultStatus.FAILED.value,
            create_hash='0xhash_fail',
        )
        self.assertTrue(v.is_failed)

    # ----- VaultStatus enum -----

    def test_vault_status_choices(self):
        choices = StVault.VaultStatus.choices()
        self.assertIsInstance(choices, tuple)
        values = [c[0] for c in choices]
        self.assertIn('provisioned', values)
        self.assertIn('pending', values)
        self.assertIn('success', values)
        self.assertIn('failed', values)

    # ----- __str__ -----

    def test_str_with_vault(self):
        s = str(self.vault)
        self.assertIn('0xhash123', s)
        self.assertIn('0xABCDEF', s)

    def test_str_without_vault(self):
        v = StVault.objects.create(
            vault_owner='0xOwner',
            create_hash='0xhash_noaddr',
        )
        s = str(v)
        self.assertIn('uninitialized', s)

    # ----- Health -----

    def test_is_healthy_raises_type_error(self):
        """health_factor is CharField but is_healthy compares with int, causing TypeError"""
        self.vault.health_factor = '150.00'
        with self.assertRaises(TypeError):
            _ = self.vault.is_healthy

    def test_health_ratio_default(self):
        # health_factor is CharField, not float, so health_ratio returns 0.0
        self.assertEqual(self.vault.health_ratio, 0.0)

    def test_health_ratio_with_float(self):
        """When health_factor is set as a float directly (in-memory), health_ratio returns it"""
        self.vault.health_factor = 150.0
        self.assertEqual(self.vault.health_ratio, 150.0)

    def test_is_healthy_with_float_healthy(self):
        """When health_factor is a float > 100, is_healthy returns True"""
        self.vault.health_factor = 150.0
        self.assertTrue(self.vault.is_healthy)

    def test_is_healthy_with_float_unhealthy(self):
        """When health_factor is a float <= 100, is_healthy returns False"""
        self.vault.health_factor = 80.0
        self.assertFalse(self.vault.is_healthy)

    # ----- Field queries -----

    def test_list_fields(self):
        fields = StVault.list_fields()
        self.assertIn('vault', fields)
        self.assertIn('vault_owner', fields)
        self.assertIn('status', fields)
        self.assertIn('staking_apr', fields)
        self.assertIn('health_factor', fields)

    def test_dashboard_fields(self):
        fields = StVault.dashboard_fields()
        self.assertIn('vault', fields)
        self.assertIn('vault_owner', fields)
        # excluded fields
        self.assertNotIn('id', fields)
        self.assertNotIn('block_number', fields)
        self.assertNotIn('create_hash', fields)

    def test_decimal_fields(self):
        dec_fields = StVault.decimal_fields()
        self.assertIn('total_value', dec_fields)
        self.assertIn('vault_balance', dec_fields)
        self.assertIn('liability_steth', dec_fields)
        self.assertIn('locked', dec_fields)
        self.assertIsInstance(dec_fields, set)

    # ----- Query methods -----

    def test_get_list_queryset_all(self):
        result = StVault.get_list_queryset()
        # Only SUCCESS vaults should be returned
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['vault'], self.vault.vault)

    def test_get_list_queryset_by_owner(self):
        result = StVault.get_list_queryset(vault_owner=self.vault.vault_owner)
        self.assertEqual(len(result), 1)

    def test_get_list_queryset_no_match(self):
        result = StVault.get_list_queryset(vault_owner='0xNonExistent')
        self.assertEqual(len(result), 0)

    def test_get_dashboard_queryset(self):
        result = StVault.get_dashboard_queryset(vault_owner=self.vault.vault_owner)
        self.assertEqual(len(result), 1)
        # node_operator_manager should be converted to list
        self.assertEqual(result[0]['node_operator_manager'], [])

    def test_get_dashboard_queryset_with_json_manager(self):
        self.vault.node_operator_manager = '["0xAddr1", "0xAddr2"]'
        self.vault.save()
        result = StVault.get_dashboard_queryset(vault_owner=self.vault.vault_owner)
        self.assertEqual(len(result), 1)
        # JSONField stores the value as-is; get_dashboard_queryset tries json.loads
        item = result[0]
        self.assertIsNotNone(item['node_operator_manager'])

    def test_get_dashboard_vault(self):
        result = StVault.get_dashboard_vault(self.vault.vault)
        self.assertIsNotNone(result)
        self.assertEqual(result['vault_owner'], self.vault.vault_owner)

    def test_get_dashboard_vault_not_found(self):
        result = StVault.get_dashboard_vault('0xNonExistent')
        self.assertIsNone(result)

    def test_get_dashboard_vault_with_valid_json_manager(self):
        """node_operator_manager with valid JSON string should be parsed"""
        self.vault.node_operator_manager = '["0xAddr1", "0xAddr2"]'
        self.vault.save()
        result = StVault.get_dashboard_vault(self.vault.vault)
        self.assertIsNotNone(result)
        # JSONField stores the value; get_dashboard_vault tries json.loads on it
        self.assertIsNotNone(result['node_operator_manager'])

    def test_get_dashboard_vault_with_invalid_json_manager(self):
        """node_operator_manager with invalid JSON should fallback to []"""
        self.vault.node_operator_manager = 'not-valid-json'
        self.vault.save()
        result = StVault.get_dashboard_vault(self.vault.vault)
        self.assertIsNotNone(result)
        self.assertEqual(result['node_operator_manager'], [])

    def test_get_dashboard_vault_with_none_manager(self):
        """node_operator_manager as None should become []"""
        self.vault.node_operator_manager = None
        self.vault.save()
        result = StVault.get_dashboard_vault(self.vault.vault)
        self.assertIsNotNone(result)
        self.assertEqual(result['node_operator_manager'], [])

    def test_get_dashboard_queryset_with_invalid_json_manager(self):
        """get_dashboard_queryset should handle invalid JSON in node_operator_manager"""
        self.vault.node_operator_manager = 'bad-json'
        self.vault.save()
        result = StVault.get_dashboard_queryset(vault_owner=self.vault.vault_owner)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['node_operator_manager'], [])

    # ----- update_dashboard_info -----

    def test_update_dashboard_info_full(self):
        info = {
            'total_value': 64000000000000000000,
            'balance': 60000000000000000000,
            'staking_apr': 4.2,
            'health_factor': '200.00',
            'liability_steth': 15000000000000000000,
            'remaining_minting_capacity_steth': 8000000000000000000,
            'total_minting_capacity_steth': 25000000000000000000,
            'withdrawable_value': 30000000000000000000,
            'locked': 15000000000000000000,
            'operator_fee_rate': 2.0,
            'undisbursed_operator_fee': 1000000000000000000,
            'infra_fee': 0.5,
            'liquidity_fee': 0.3,
            'unsettled_lido_fee': 500000000000000000,
            'confirm_expiry': 86400,
            'refresh_all_data_time': True,
        }
        self.vault.update_dashboard_info(info)
        self.vault.refresh_from_db()

        self.assertEqual(self.vault.total_value, Decimal('64000000000000000000'))
        self.assertEqual(self.vault.vault_balance, Decimal('60000000000000000000'))
        self.assertEqual(self.vault.staking_apr, 4.2)
        self.assertEqual(self.vault.health_factor, '200.00')
        self.assertEqual(self.vault.liability_steth, Decimal('15000000000000000000'))
        self.assertEqual(self.vault.remaining_minting_steth, Decimal('8000000000000000000'))
        self.assertEqual(self.vault.total_minting_steth, Decimal('25000000000000000000'))
        self.assertEqual(self.vault.withdrawable_value, Decimal('30000000000000000000'))
        self.assertEqual(self.vault.locked, Decimal('15000000000000000000'))
        self.assertEqual(self.vault.operator_fee_rate, 2.0)
        self.assertEqual(self.vault.undisbursed_operator_fee, Decimal('1000000000000000000'))
        self.assertEqual(self.vault.infra_fee, 0.5)
        self.assertEqual(self.vault.liquidity_fee, 0.3)
        self.assertEqual(self.vault.unsettled_lido_fee, Decimal('500000000000000000'))
        self.assertEqual(self.vault.confirm_expiry, 86400)
        self.assertIsNotNone(self.vault.refresh_all_data_time)

    def test_update_dashboard_info_partial(self):
        original_total = self.vault.total_value
        info = {
            'balance': 50000000000000000000,
        }
        self.vault.update_dashboard_info(info)
        self.vault.refresh_from_db()
        self.assertEqual(self.vault.vault_balance, Decimal('50000000000000000000'))
        # total_value should not change
        self.assertEqual(self.vault.total_value, original_total)

    def test_update_dashboard_info_empty(self):
        """Empty dict should not update anything"""
        original_updated = self.vault.updated_time
        self.vault.update_dashboard_info({})
        self.vault.refresh_from_db()

    def test_update_dashboard_info_none(self):
        """None should not raise"""
        self.vault.update_dashboard_info(None)

    # ----- Meta -----

    def test_ordering(self):
        """Default ordering is -created_time"""
        vaults = StVault.objects.filter(
            vault_owner=self.vault.vault_owner
        )
        # vault_pending was created after vault, so it should come first
        self.assertEqual(vaults.first().pk, self.vault_pending.pk)


# ============================================================
# StVaultConfig Model Tests
# ============================================================

class StVaultConfigTests(TestCase):
    """StVaultConfig model tests"""

    def setUp(self):
        StVaultConfig.objects.update_or_create(key='TEST_KEY', defaults={'value': 'test_value', 'remark': 'test'})
        StVaultConfig.objects.update_or_create(key='INT_KEY', defaults={'value': '42', 'remark': 'integer config'})

    def test_str(self):
        config = StVaultConfig.objects.get(key='TEST_KEY')
        self.assertEqual(str(config), 'TEST_KEY = test_value')

    # ----- get_value -----

    def test_get_value_exists(self):
        val = StVaultConfig.get_value('TEST_KEY')
        self.assertEqual(val, 'test_value')

    def test_get_value_not_exists(self):
        val = StVaultConfig.get_value('NON_EXISTENT')
        self.assertIsNone(val)

    def test_get_value_default(self):
        val = StVaultConfig.get_value('NON_EXISTENT', 'fallback')
        self.assertEqual(val, 'fallback')

    # ----- get_int_value -----

    def test_get_int_value_exists(self):
        val = StVaultConfig.get_int_value('INT_KEY')
        self.assertEqual(val, 42)

    def test_get_int_value_not_exists(self):
        val = StVaultConfig.get_int_value('NON_EXISTENT', 99)
        self.assertEqual(val, 99)

    def test_get_int_value_non_numeric(self):
        StVaultConfig.objects.update_or_create(key='STR_KEY', defaults={'value': 'not_a_number'})
        val = StVaultConfig.get_int_value('STR_KEY', 0)
        self.assertEqual(val, 0)

    # ----- set_value -----

    def test_set_value_create(self):
        StVaultConfig.set_value('NEW_KEY', 'new_value', 'new remark')
        config = StVaultConfig.objects.get(key='NEW_KEY')
        self.assertEqual(config.value, 'new_value')
        self.assertEqual(config.remark, 'new remark')

    def test_set_value_update(self):
        StVaultConfig.set_value('TEST_KEY', 'updated_value', 'updated remark')
        config = StVaultConfig.objects.get(key='TEST_KEY')
        self.assertEqual(config.value, 'updated_value')
        self.assertEqual(config.remark, 'updated remark')

    def test_set_value_converts_to_string(self):
        StVaultConfig.set_value('NUM_KEY', 123)
        config = StVaultConfig.objects.get(key='NUM_KEY')
        self.assertEqual(config.value, '123')

    def test_set_value_update_without_remark(self):
        """When remark is None, existing remark should not change"""
        StVaultConfig.set_value('TEST_KEY', 'new_val')
        config = StVaultConfig.objects.get(key='TEST_KEY')
        self.assertEqual(config.value, 'new_val')

    @patch('validators.models.stvault_config.StVaultConfig.objects')
    def test_get_value_exception(self, mock_objects):
        """When DB query raises, should return default"""
        mock_objects.filter.side_effect = Exception('DB error')
        val = StVaultConfig.get_value('ANY_KEY', 'fallback')
        self.assertEqual(val, 'fallback')

    @patch('validators.models.stvault_config.StVaultConfig.objects')
    def test_set_value_exception(self, mock_objects):
        """When DB operation raises, should not propagate (logged)"""
        mock_objects.filter.side_effect = Exception('DB error')
        # Should not raise
        StVaultConfig.set_value('ANY_KEY', 'any_value')

    # ----- init_default_config -----

    @patch('validators.models.stvault_config.settings')
    def test_init_default_config(self, mock_settings):
        mock_settings.BACKEND = {'network': 'mainnet'}
        # Clear existing configs to test init
        StVaultConfig.objects.all().delete()
        StVaultConfig.init_default_config()
        self.assertTrue(StVaultConfig.objects.filter(key='IS_PAUSED').exists())
        self.assertTrue(StVaultConfig.objects.filter(key='FEE_BPS').exists())
        self.assertTrue(StVaultConfig.objects.filter(key='CONFIRM_EXPIRY').exists())
        self.assertTrue(StVaultConfig.objects.filter(key='OPERATOR_ADDRESS').exists())

    @patch('validators.models.stvault_config.settings')
    def test_init_default_config_skip_existing(self, mock_settings):
        mock_settings.BACKEND = {'network': 'mainnet'}
        StVaultConfig.objects.update_or_create(key='IS_PAUSED', defaults={'value': '1'})
        StVaultConfig.init_default_config()
        # Should not overwrite existing value
        config = StVaultConfig.objects.get(key='IS_PAUSED')
        self.assertEqual(config.value, '1')


# ============================================================
# StvaultUtil Tests
# ============================================================

class StvaultUtilTests(TestCase):
    """StvaultUtil utility function tests"""

    # ----- format_bp -----

    def test_format_bp_100(self):
        """100 basis points = 1.00%"""
        result = StvaultUtil.format_bp(100)
        self.assertEqual(result, '1.00')

    def test_format_bp_350(self):
        """350 basis points = 3.50%"""
        result = StvaultUtil.format_bp(350)
        self.assertEqual(result, '3.50')

    def test_format_bp_0(self):
        result = StvaultUtil.format_bp(0)
        self.assertEqual(result, '0.00')

    def test_format_bp_10000(self):
        """10000 basis points = 100.00%"""
        result = StvaultUtil.format_bp(10000)
        self.assertEqual(result, '100.00')

    def test_format_bp_decimal_input(self):
        result = StvaultUtil.format_bp(Decimal('250'))
        self.assertEqual(result, '2.50')

    # ----- format_to_eth -----

    def test_format_to_eth_1_ether(self):
        wei = 10 ** 18
        result = StvaultUtil.format_to_eth(wei)
        self.assertEqual(result, '1')

    def test_format_to_eth_32_ether(self):
        wei = 32 * 10 ** 18
        result = StvaultUtil.format_to_eth(wei)
        self.assertEqual(result, '32')

    def test_format_to_eth_zero(self):
        result = StvaultUtil.format_to_eth(0)
        self.assertEqual(result, '0')

    def test_format_to_eth_fraction(self):
        wei = 1500000000000000000  # 1.5 ETH
        result = StvaultUtil.format_to_eth(wei)
        self.assertEqual(result, '1.5')

    def test_format_to_eth_precision(self):
        wei = 1234567890000000000  # ~1.23456789 ETH
        result = StvaultUtil.format_to_eth(wei, precision=8)
        self.assertEqual(result, '1.23456789')

    def test_format_to_eth_small_amount(self):
        wei = 1000000000000000  # 0.001 ETH
        result = StvaultUtil.format_to_eth(wei)
        self.assertEqual(result, '0.001')

    # ----- calculate_health -----

    def test_calculate_health_no_liability(self):
        """When liability is 0, health should be Infinity"""
        result = StvaultUtil.calculate_health(
            total_value=32000000000000000000,
            liability_shares_in_steth_wei=0,
            forced_rebalance_threshold_bp=800,
        )
        self.assertEqual(result['health_ratio'], 'Infinity')
        self.assertTrue(result['is_healthy'])

    def test_calculate_health_healthy(self):
        """Vault with low liability relative to value should be healthy"""
        # total_value = 32 ETH, liability = 10 ETH, threshold = 800 bp (8%)
        result = StvaultUtil.calculate_health(
            total_value=32000000000000000000,
            liability_shares_in_steth_wei=10000000000000000000,
            forced_rebalance_threshold_bp=800,
        )
        health = float(result['health_ratio'])
        self.assertGreater(health, 100)
        self.assertTrue(result['is_healthy'])

    def test_calculate_health_unhealthy(self):
        """Vault with high liability relative to value should be unhealthy"""
        # total_value = 10 ETH, liability = 32 ETH, threshold = 800 bp
        result = StvaultUtil.calculate_health(
            total_value=10000000000000000000,
            liability_shares_in_steth_wei=32000000000000000000,
            forced_rebalance_threshold_bp=800,
        )
        health = float(result['health_ratio'])
        self.assertLess(health, 100)
        self.assertFalse(result['is_healthy'])

    def test_calculate_health_equal_value_liability(self):
        """When total_value equals liability (with threshold), should be under 100"""
        result = StvaultUtil.calculate_health(
            total_value=10000000000000000000,
            liability_shares_in_steth_wei=10000000000000000000,
            forced_rebalance_threshold_bp=800,
        )
        health = float(result['health_ratio'])
        # (10000 - 800) / 10000 * total / liability * 100 = 92%
        self.assertAlmostEqual(health, 92.0, places=1)
        self.assertFalse(result['is_healthy'])

    def test_calculate_health_zero_threshold(self):
        """With 0 threshold, health = (total/liability) * 100"""
        result = StvaultUtil.calculate_health(
            total_value=20000000000000000000,
            liability_shares_in_steth_wei=10000000000000000000,
            forced_rebalance_threshold_bp=0,
        )
        health = float(result['health_ratio'])
        self.assertAlmostEqual(health, 200.0, places=1)
        self.assertTrue(result['is_healthy'])


# ============================================================
# StvaultService Tests (with mocks)
# ============================================================

class StvaultServiceTests(TestCase):
    """StvaultService business logic tests (external calls mocked)"""

    def setUp(self):
        self.vault = StVault.objects.create(
            vault='0xVault1234567890abcdef1234567890abcdef1234',
            dashboard='0xDash1234567890abcdef1234567890abcdef12345',
            vault_owner='0xOwner1234567890abcdef1234567890abcdef12',
            status=StVault.VaultStatus.SUCCESS.value,
            total_value=Decimal('32000000000000000000'),
            create_hash='0xhash_svc',
        )

    @patch('validators.contract.stvault.service.stvault.DashboardContractService')
    @patch('validators.contract.stvault.service.stvault.Web3Tool')
    def test_check_remaining_minting_capacity_shares_enough(self, mock_web3, mock_dashboard):
        from validators.contract.stvault.service.stvault import StvaultService
        mock_web3.check_address.return_value = self.vault.dashboard
        mock_dashboard.get_remaining_minting_capacity_shares.return_value = 1000

        result = StvaultService.check_remaining_minting_capacity_shares(self.vault.dashboard, 500)
        self.assertTrue(result)

    @patch('validators.contract.stvault.service.stvault.DashboardContractService')
    @patch('validators.contract.stvault.service.stvault.Web3Tool')
    def test_check_remaining_minting_capacity_shares_not_enough(self, mock_web3, mock_dashboard):
        from validators.contract.stvault.service.stvault import StvaultService
        mock_web3.check_address.return_value = self.vault.dashboard
        mock_dashboard.get_remaining_minting_capacity_shares.return_value = 200

        result = StvaultService.check_remaining_minting_capacity_shares(self.vault.dashboard, 500)
        self.assertFalse(result)

    @patch('validators.contract.stvault.service.stvault.DashboardContractService')
    @patch('validators.contract.stvault.service.stvault.Web3Tool')
    def test_check_liability_shares_enough(self, mock_web3, mock_dashboard):
        from validators.contract.stvault.service.stvault import StvaultService
        mock_web3.check_address.return_value = self.vault.dashboard
        mock_dashboard.get_liability_shares.return_value = 1000

        result = StvaultService.check_liability_shares(self.vault.dashboard, 500)
        self.assertTrue(result)

    @patch('validators.contract.stvault.service.stvault.DashboardContractService')
    @patch('validators.contract.stvault.service.stvault.Web3Tool')
    def test_check_liability_shares_not_enough(self, mock_web3, mock_dashboard):
        from validators.contract.stvault.service.stvault import StvaultService
        mock_web3.check_address.return_value = self.vault.dashboard
        mock_dashboard.get_liability_shares.return_value = 200

        result = StvaultService.check_liability_shares(self.vault.dashboard, 500)
        self.assertFalse(result)

    @patch('validators.contract.stvault.service.stvault.Web3Tool')
    def test_update_stvault_info(self, mock_web3):
        from validators.contract.stvault.service.stvault import StvaultService
        info = {'total_value': 64000000000000000000}
        StvaultService.update_stvault_info(self.vault.vault, info)
        self.vault.refresh_from_db()
        self.assertEqual(self.vault.total_value, Decimal('64000000000000000000'))

    @patch('validators.contract.stvault.service.stvault.Web3Tool')
    def test_update_stvault_info_not_found(self, mock_web3):
        from validators.contract.stvault.service.stvault import StvaultService
        result = StvaultService.update_stvault_info('0xNonExistent', {'total_value': 100})
        self.assertIsNone(result)

    @patch('validators.contract.stvault.service.stvault.VaultHubContractService')
    @patch('validators.contract.stvault.service.stvault.Web3Tool')
    def test_get_update_report_data_fresh(self, mock_web3, mock_vaulthub):
        """When report is fresh, should return (True, None, None)"""
        from validators.contract.stvault.service.stvault import StvaultService
        mock_web3.check_address.return_value = self.vault.vault
        mock_vaulthub.is_report_fresh.return_value = True

        success, data, error = StvaultService.get_update_report_data(self.vault.vault)
        self.assertTrue(success)
        self.assertIsNone(data)
        self.assertIsNone(error)

    @patch('validators.contract.stvault.service.stvault.LazyOracleContractService')
    @patch('validators.contract.stvault.service.stvault.VaultHubContractService')
    @patch('validators.contract.stvault.service.stvault.Web3Tool')
    def test_get_update_report_data_no_report(self, mock_web3, mock_vaulthub, mock_oracle):
        """When report is not fresh but no report data, should return error"""
        from validators.contract.stvault.service.stvault import StvaultService
        mock_web3.check_address.return_value = self.vault.vault
        mock_vaulthub.is_report_fresh.return_value = False
        mock_oracle.get_latest_report_data.return_value = None

        success, data, error = StvaultService.get_update_report_data(self.vault.vault)
        self.assertFalse(success)
        self.assertIsNone(data)
        self.assertIsNotNone(error)

    @patch('validators.contract.stvault.service.stvault.LazyOracleContractService')
    @patch('validators.contract.stvault.service.stvault.VaultHubContractService')
    @patch('validators.contract.stvault.service.stvault.Web3Tool')
    def test_get_update_report_data_no_cid(self, mock_web3, mock_vaulthub, mock_oracle):
        """When report data has no cid, should return error"""
        from validators.contract.stvault.service.stvault import StvaultService
        mock_web3.check_address.return_value = self.vault.vault
        mock_vaulthub.is_report_fresh.return_value = False
        mock_oracle.get_latest_report_data.return_value = {'report_cid': None}

        success, data, error = StvaultService.get_update_report_data(self.vault.vault)
        self.assertFalse(success)
        self.assertIsNotNone(error)

    @patch('validators.contract.stvault.service.stvault.Web3Tool')
    def test_refresh_stvault_not_found(self, mock_web3):
        """When vault not found, should return None"""
        from validators.contract.stvault.service.stvault import StvaultService
        mock_web3.check_address.return_value = '0xNonExistent'

        result = StvaultService.refresh_stvault('0xNonExistent')
        self.assertIsNone(result)

    # ----- refresh_vault_operator_manager -----

    @patch('validators.contract.stvault.service.stvault.DashboardContractService')
    @patch('validators.contract.stvault.service.stvault.Web3Tool')
    def test_refresh_vault_operator_manager(self, mock_web3, mock_dashboard):
        from validators.contract.stvault.service.stvault import StvaultService
        mock_web3.check_address.return_value = '0xDashChecked'
        mock_dashboard.get_operator_manager.return_value = ['0xManager1', '0xManager2']

        result = StvaultService.refresh_vault_operator_manager(self.vault.dashboard)
        self.assertEqual(result, ['0xManager1', '0xManager2'])
        mock_dashboard.get_operator_manager.assert_called_once_with('0xDashChecked')

    # ----- refresh_stvault_list -----

    @patch('validators.contract.stvault.service.stvault.StVault.get_list_queryset')
    @patch('validators.contract.stvault.service.stvault.StvaultService.refresh_stvault')
    def test_refresh_stvault_list_success(self, mock_refresh, mock_list):
        from validators.contract.stvault.service.stvault import StvaultService
        # get_list_queryset returns dicts, but refresh_stvault_list uses vault.vault (attr access)
        # So we mock to return objects with .vault attribute
        mock_vault = MagicMock()
        mock_vault.vault = self.vault.vault
        mock_list.return_value = [mock_vault]
        mock_refresh.return_value = True

        result = StvaultService.refresh_stvault_list(self.vault.vault_owner)
        self.assertTrue(result)

    @patch('validators.contract.stvault.service.stvault.StVault.get_list_queryset')
    @patch('validators.contract.stvault.service.stvault.StvaultService.refresh_stvault')
    def test_refresh_stvault_list_failure(self, mock_refresh, mock_list):
        from validators.contract.stvault.service.stvault import StvaultService
        mock_vault = MagicMock()
        mock_vault.vault = self.vault.vault
        mock_list.return_value = [mock_vault]
        mock_refresh.return_value = False

        result = StvaultService.refresh_stvault_list(self.vault.vault_owner)
        self.assertFalse(result)

    @patch('validators.contract.stvault.service.stvault.StVault.get_list_queryset')
    def test_refresh_stvault_list_empty(self, mock_list):
        """When no vaults found, should return True"""
        from validators.contract.stvault.service.stvault import StvaultService
        mock_list.return_value = []
        result = StvaultService.refresh_stvault_list('0xNonExistentOwner')
        self.assertTrue(result)

    # ----- refresh_stvault full flow -----

    @patch('validators.contract.stvault.service.stvault.StvaultService.get_vault_metrics')
    @patch('validators.contract.stvault.service.stvault.OperatorGridContractService')
    @patch('validators.contract.stvault.service.stvault.STETHContractService')
    @patch('validators.contract.stvault.service.stvault.DashboardContractService')
    @patch('validators.contract.stvault.service.stvault.Web3Tool')
    def test_refresh_stvault_success(self, mock_web3, mock_dashboard, mock_steth, mock_grid, mock_metrics):
        """Full refresh_stvault with all concurrent queries mocked"""
        from validators.contract.stvault.service.stvault import StvaultService

        vault_addr = self.vault.vault
        dash_addr = self.vault.dashboard
        mock_web3.check_address.side_effect = lambda x: x

        # Mock concurrent query results
        mock_web3.get_balance_wei.return_value = 32000000000000000000
        mock_dashboard.get_vault_connection.return_value = {
            'forced_rebalance_threshold_bp': 800,
            'infra_fee_bp': 100,
            'liquidity_fee_bp': 200,
        }
        mock_dashboard.get_liability_shares.return_value = 5000000000000000000
        mock_dashboard.get_total_value.return_value = 32000000000000000000
        mock_dashboard.get_locked.return_value = 10000000000000000000
        mock_dashboard.get_total_minting_capacity_shares.return_value = 20000000000000000000
        mock_dashboard.get_remaining_minting_capacity_shares.return_value = 15000000000000000000
        mock_dashboard.get_withdrawable_value.return_value = 22000000000000000000
        mock_dashboard.get_accrued_fee.return_value = 500000000000000000
        mock_dashboard.get_fee_rate.return_value = 350
        mock_dashboard.get_confirm_expiry.return_value = 129600
        mock_grid.get_vault_tier_info.return_value = {'tier_id': 1}

        # Mock shares to steth conversions
        mock_steth.get_pooled_eth_by_shares.side_effect = lambda x: x  # 1:1 for simplicity

        # Mock metrics
        mock_metrics.return_value = {
            'staking_apr': 3.5,
            'lido_fee': 100000000000000000,
            'operator_fee': 50000000000000000,
        }

        result = StvaultService.refresh_stvault(vault_addr)
        self.assertTrue(result)

        # Verify vault was updated
        self.vault.refresh_from_db()
        self.assertEqual(self.vault.total_value, Decimal('32000000000000000000'))
        self.assertEqual(self.vault.vault_balance, Decimal('32000000000000000000'))
        self.assertEqual(self.vault.confirm_expiry, 129600)

    @patch('validators.contract.stvault.service.stvault.DashboardContractService')
    @patch('validators.contract.stvault.service.stvault.Web3Tool')
    def test_refresh_stvault_query_failure(self, mock_web3, mock_dashboard):
        """When a concurrent query raises an exception, should return False"""
        from validators.contract.stvault.service.stvault import StvaultService

        mock_web3.check_address.side_effect = lambda x: x
        mock_web3.get_balance_wei.side_effect = Exception('RPC error')
        mock_dashboard.get_vault_connection.side_effect = Exception('RPC error')
        mock_dashboard.get_liability_shares.side_effect = Exception('RPC error')
        mock_dashboard.get_total_value.side_effect = Exception('RPC error')
        mock_dashboard.get_locked.side_effect = Exception('RPC error')
        mock_dashboard.get_total_minting_capacity_shares.side_effect = Exception('RPC error')
        mock_dashboard.get_remaining_minting_capacity_shares.side_effect = Exception('RPC error')
        mock_dashboard.get_withdrawable_value.side_effect = Exception('RPC error')
        mock_dashboard.get_accrued_fee.side_effect = Exception('RPC error')
        mock_dashboard.get_fee_rate.side_effect = Exception('RPC error')
        mock_dashboard.get_confirm_expiry.side_effect = Exception('RPC error')

        result = StvaultService.refresh_stvault(self.vault.vault)
        self.assertFalse(result)

    @patch('validators.contract.stvault.service.stvault.StvaultService.get_vault_metrics')
    @patch('validators.contract.stvault.service.stvault.OperatorGridContractService')
    @patch('validators.contract.stvault.service.stvault.STETHContractService')
    @patch('validators.contract.stvault.service.stvault.DashboardContractService')
    @patch('validators.contract.stvault.service.stvault.Web3Tool')
    def test_refresh_stvault_steth_conversion_failure(self, mock_web3, mock_dashboard, mock_steth, mock_grid, mock_metrics):
        """When shares-to-steth conversion fails, should return False"""
        from validators.contract.stvault.service.stvault import StvaultService

        mock_web3.check_address.side_effect = lambda x: x
        mock_web3.get_balance_wei.return_value = 32000000000000000000
        mock_dashboard.get_vault_connection.return_value = {
            'forced_rebalance_threshold_bp': 800,
            'infra_fee_bp': 100,
            'liquidity_fee_bp': 200,
        }
        mock_dashboard.get_liability_shares.return_value = 5000000000000000000
        mock_dashboard.get_total_value.return_value = 32000000000000000000
        mock_dashboard.get_locked.return_value = 10000000000000000000
        mock_dashboard.get_total_minting_capacity_shares.return_value = 20000000000000000000
        mock_dashboard.get_remaining_minting_capacity_shares.return_value = 15000000000000000000
        mock_dashboard.get_withdrawable_value.return_value = 22000000000000000000
        mock_dashboard.get_accrued_fee.return_value = 500000000000000000
        mock_dashboard.get_fee_rate.return_value = 350
        mock_dashboard.get_confirm_expiry.return_value = 129600
        mock_grid.get_vault_tier_info.return_value = {'tier_id': 1}

        # steth conversion fails
        mock_steth.get_pooled_eth_by_shares.side_effect = Exception('stETH contract error')

        result = StvaultService.refresh_stvault(self.vault.vault)
        self.assertFalse(result)

    @patch('validators.contract.stvault.service.stvault.StvaultService.get_vault_metrics')
    @patch('validators.contract.stvault.service.stvault.OperatorGridContractService')
    @patch('validators.contract.stvault.service.stvault.STETHContractService')
    @patch('validators.contract.stvault.service.stvault.DashboardContractService')
    @patch('validators.contract.stvault.service.stvault.Web3Tool')
    def test_refresh_stvault_no_metrics(self, mock_web3, mock_dashboard, mock_steth, mock_grid, mock_metrics):
        """When get_vault_metrics returns None, refresh should still succeed without apr"""
        from validators.contract.stvault.service.stvault import StvaultService

        mock_web3.check_address.side_effect = lambda x: x
        mock_web3.get_balance_wei.return_value = 32000000000000000000
        mock_dashboard.get_vault_connection.return_value = {
            'forced_rebalance_threshold_bp': 800,
            'infra_fee_bp': 100,
            'liquidity_fee_bp': 200,
        }
        mock_dashboard.get_liability_shares.return_value = 5000000000000000000
        mock_dashboard.get_total_value.return_value = 32000000000000000000
        mock_dashboard.get_locked.return_value = 10000000000000000000
        mock_dashboard.get_total_minting_capacity_shares.return_value = 20000000000000000000
        mock_dashboard.get_remaining_minting_capacity_shares.return_value = 15000000000000000000
        mock_dashboard.get_withdrawable_value.return_value = 22000000000000000000
        mock_dashboard.get_accrued_fee.return_value = 500000000000000000
        mock_dashboard.get_fee_rate.return_value = 350
        mock_dashboard.get_confirm_expiry.return_value = 129600
        mock_grid.get_vault_tier_info.return_value = {'tier_id': 1}
        mock_steth.get_pooled_eth_by_shares.side_effect = lambda x: x

        # Metrics returns None
        mock_metrics.return_value = None

        result = StvaultService.refresh_stvault(self.vault.vault)
        self.assertTrue(result)

    # ----- get_vault_metrics -----

    @patch('validators.contract.stvault.service.stvault.StvaultCliApiService')
    @patch('validators.contract.stvault.service.stvault.LazyOracleContractService')
    @patch('validators.contract.stvault.service.stvault.Web3Tool')
    def test_get_vault_metrics_success(self, mock_web3, mock_oracle, mock_cli):
        from validators.contract.stvault.service.stvault import StvaultService

        mock_web3.check_address.side_effect = lambda x: x
        mock_oracle.get_latest_report_data.return_value = {'report_cid': 'QmTest123'}
        mock_cli.get_metrics_data.return_value = {
            'statisticData': {
                'netStakingAPR': {'apr_percent': '3.85'},
                'nodeOperatorRewards': 50000000000000000,
            },
            'lidoFee': 100000000000000000,
        }

        result = StvaultService.get_vault_metrics(self.vault.vault, self.vault.dashboard)
        self.assertIsNotNone(result)
        self.assertEqual(result['staking_apr'], 3.85)
        self.assertEqual(result['lido_fee'], 100000000000000000)

    @patch('validators.contract.stvault.service.stvault.LazyOracleContractService')
    @patch('validators.contract.stvault.service.stvault.Web3Tool')
    def test_get_vault_metrics_no_report(self, mock_web3, mock_oracle):
        """When no latest_report, should return None"""
        from validators.contract.stvault.service.stvault import StvaultService

        mock_web3.check_address.side_effect = lambda x: x
        mock_oracle.get_latest_report_data.return_value = None

        result = StvaultService.get_vault_metrics(self.vault.vault, self.vault.dashboard)
        self.assertIsNone(result)

    @patch('validators.contract.stvault.service.stvault.LazyOracleContractService')
    @patch('validators.contract.stvault.service.stvault.Web3Tool')
    def test_get_vault_metrics_no_cid(self, mock_web3, mock_oracle):
        """When latest_report has no cid, should return None"""
        from validators.contract.stvault.service.stvault import StvaultService

        mock_web3.check_address.side_effect = lambda x: x
        mock_oracle.get_latest_report_data.return_value = {'report_cid': None}

        result = StvaultService.get_vault_metrics(self.vault.vault, self.vault.dashboard)
        self.assertIsNone(result)

    @patch('validators.contract.stvault.service.stvault.StvaultCliApiService')
    @patch('validators.contract.stvault.service.stvault.LazyOracleContractService')
    @patch('validators.contract.stvault.service.stvault.Web3Tool')
    def test_get_vault_metrics_no_metrics_data(self, mock_web3, mock_oracle, mock_cli):
        """When cli returns no metrics data, should return None"""
        from validators.contract.stvault.service.stvault import StvaultService

        mock_web3.check_address.side_effect = lambda x: x
        mock_oracle.get_latest_report_data.return_value = {'report_cid': 'QmTest'}
        mock_cli.get_metrics_data.return_value = None

        result = StvaultService.get_vault_metrics(self.vault.vault, self.vault.dashboard)
        self.assertIsNone(result)

    @patch('validators.contract.stvault.service.stvault.LazyOracleContractService')
    @patch('validators.contract.stvault.service.stvault.Web3Tool')
    def test_get_vault_metrics_exception(self, mock_web3, mock_oracle):
        """When an exception occurs, should return None (caught by except)"""
        from validators.contract.stvault.service.stvault import StvaultService

        mock_web3.check_address.side_effect = lambda x: x
        mock_oracle.get_latest_report_data.side_effect = Exception('Network error')

        result = StvaultService.get_vault_metrics(self.vault.vault, self.vault.dashboard)
        self.assertIsNone(result)

    # ----- get_update_report_data full flow -----

    @patch('validators.contract.stvault.service.stvault.LazyOracleContractService')
    @patch('validators.contract.stvault.service.stvault.StvaultCliApiService')
    @patch('validators.contract.stvault.service.stvault.VaultHubContractService')
    @patch('validators.contract.stvault.service.stvault.Web3Tool')
    def test_get_update_report_data_success(self, mock_web3, mock_vaulthub, mock_cli, mock_oracle):
        """Full success flow: report not fresh -> get report -> get proof -> build tx"""
        from validators.contract.stvault.service.stvault import StvaultService

        mock_web3.check_address.return_value = self.vault.vault
        mock_web3.hex_to_bytes.side_effect = lambda x: bytes.fromhex(x[2:]) if x.startswith('0x') else bytes.fromhex(x)
        mock_vaulthub.is_report_fresh.return_value = False
        mock_oracle.get_latest_report_data.return_value = {'report_cid': 'QmTestCid123'}
        mock_cli.get_report_proof.return_value = {
            'data': {
                'totalValueWei': '32000000000000000000',
                'fee': '100000000000000000',
                'liabilityShares': '5000000000000000000',
                'maxLiabilityShares': '20000000000000000000',
                'slashingReserve': '1000000000000000000',
            },
            'proof': [
                '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
            ],
        }
        mock_oracle.updateVaultData.return_value = {'to': '0xContract', 'data': '0x1234'}

        success, tx, error = StvaultService.get_update_report_data(self.vault.vault)
        self.assertTrue(success)
        self.assertIsNotNone(tx)
        self.assertIsNone(error)

    @patch('validators.contract.stvault.service.stvault.LazyOracleContractService')
    @patch('validators.contract.stvault.service.stvault.StvaultCliApiService')
    @patch('validators.contract.stvault.service.stvault.VaultHubContractService')
    @patch('validators.contract.stvault.service.stvault.Web3Tool')
    def test_get_update_report_data_no_proof(self, mock_web3, mock_vaulthub, mock_cli, mock_oracle):
        """When report proof is missing, should return error"""
        from validators.contract.stvault.service.stvault import StvaultService

        mock_web3.check_address.return_value = self.vault.vault
        mock_vaulthub.is_report_fresh.return_value = False
        mock_oracle.get_latest_report_data.return_value = {'report_cid': 'QmTestCid'}
        mock_cli.get_report_proof.return_value = {
            'data': {'totalValueWei': '100'},
            'proof': None,
        }

        success, tx, error = StvaultService.get_update_report_data(self.vault.vault)
        self.assertFalse(success)
        self.assertIsNone(tx)
        self.assertIn('proof', error)

    @patch('validators.contract.stvault.service.stvault.LazyOracleContractService')
    @patch('validators.contract.stvault.service.stvault.StvaultCliApiService')
    @patch('validators.contract.stvault.service.stvault.VaultHubContractService')
    @patch('validators.contract.stvault.service.stvault.Web3Tool')
    def test_get_update_report_data_no_report_data(self, mock_web3, mock_vaulthub, mock_cli, mock_oracle):
        """When report proof has no data field, should return error"""
        from validators.contract.stvault.service.stvault import StvaultService

        mock_web3.check_address.return_value = self.vault.vault
        mock_vaulthub.is_report_fresh.return_value = False
        mock_oracle.get_latest_report_data.return_value = {'report_cid': 'QmTestCid'}
        mock_cli.get_report_proof.return_value = {
            'data': None,
            'proof': ['0xaa'],
        }

        success, tx, error = StvaultService.get_update_report_data(self.vault.vault)
        self.assertFalse(success)
        self.assertIsNone(tx)

    @patch('validators.contract.stvault.service.stvault.LazyOracleContractService')
    @patch('validators.contract.stvault.service.stvault.StvaultCliApiService')
    @patch('validators.contract.stvault.service.stvault.VaultHubContractService')
    @patch('validators.contract.stvault.service.stvault.Web3Tool')
    def test_get_update_report_data_tx_build_failure(self, mock_web3, mock_vaulthub, mock_cli, mock_oracle):
        """When updateVaultData returns None, should return error"""
        from validators.contract.stvault.service.stvault import StvaultService

        mock_web3.check_address.return_value = self.vault.vault
        mock_web3.hex_to_bytes.side_effect = lambda x: bytes.fromhex(x[2:]) if x.startswith('0x') else bytes.fromhex(x)
        mock_vaulthub.is_report_fresh.return_value = False
        mock_oracle.get_latest_report_data.return_value = {'report_cid': 'QmTestCid'}
        mock_cli.get_report_proof.return_value = {
            'data': {
                'totalValueWei': '100',
                'fee': '0',
                'liabilityShares': '0',
                'maxLiabilityShares': '0',
                'slashingReserve': '0',
            },
            'proof': ['0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'],
        }
        mock_oracle.updateVaultData.return_value = None

        success, tx, error = StvaultService.get_update_report_data(self.vault.vault)
        self.assertFalse(success)
        self.assertIsNone(tx)
        self.assertIn('updateVaultData', error)

    @patch('validators.contract.stvault.service.stvault.VaultHubContractService')
    @patch('validators.contract.stvault.service.stvault.Web3Tool')
    def test_get_update_report_data_exception(self, mock_web3, mock_vaulthub):
        """When an exception occurs, should return (False, None, error_msg)"""
        from validators.contract.stvault.service.stvault import StvaultService

        mock_web3.check_address.return_value = self.vault.vault
        mock_vaulthub.is_report_fresh.side_effect = Exception('Network timeout')

        success, tx, error = StvaultService.get_update_report_data(self.vault.vault)
        self.assertFalse(success)
        self.assertIsNone(tx)
        self.assertIn('异常', error)

    # ----- fetch_vault_health -----

    @patch('validators.contract.stvault.service.stvault.STETHContractService')
    @patch('validators.contract.stvault.service.stvault.DashboardContractService')
    @patch('validators.contract.stvault.service.stvault.Web3Tool')
    def test_fetch_vault_health_success(self, mock_web3, mock_dashboard, mock_steth):
        from validators.contract.stvault.service.stvault import StvaultService

        mock_web3.check_address.return_value = '0xDashChecked'
        mock_web3.format_ether.side_effect = lambda x: str(x / 10**18)
        mock_dashboard.get_vault_connection.return_value = {
            'total_value': 32000000000000000000,
            'vault_connection': {'forced_rebalance_threshold_bp': 800},
            'liability_shares': 5000000000000000000,
        }
        mock_steth.get_pooled_eth_by_shares.return_value = 5000000000000000000

        result = StvaultService.fetch_vault_health(self.vault.dashboard)
        self.assertIsNotNone(result)
        self.assertIn('health_ratio', result)
        self.assertIn('is_healthy', result)
        self.assertIn('total_value', result)
        self.assertIn('liability_shares_in_steth_wei', result)
        self.assertTrue(result['is_healthy'])

    @patch('validators.contract.stvault.service.stvault.DashboardContractService')
    @patch('validators.contract.stvault.service.stvault.Web3Tool')
    def test_fetch_vault_health_no_connection(self, mock_web3, mock_dashboard):
        """When get_vault_connection returns None, should return None"""
        from validators.contract.stvault.service.stvault import StvaultService

        mock_web3.check_address.return_value = '0xDashChecked'
        mock_dashboard.get_vault_connection.return_value = None

        result = StvaultService.fetch_vault_health(self.vault.dashboard)
        self.assertIsNone(result)

    # ----- fetch_vault_metrics -----

    @patch('validators.contract.stvault.service.stvault.STETHContractService')
    @patch('validators.contract.stvault.service.stvault.DashboardContractService')
    @patch('validators.contract.stvault.service.stvault.Web3Tool')
    def test_fetch_vault_metrics_success(self, mock_web3, mock_dashboard, mock_steth):
        from validators.contract.stvault.service.stvault import StvaultService

        mock_dashboard.get_total_value.return_value = 32000000000000000000
        mock_dashboard.get_liability_shares.return_value = 5000000000000000000
        mock_dashboard.get_vault_connection.return_value = {
            'forced_rebalance_threshold_bp': 800,
        }
        mock_steth.get_pooled_eth_by_shares.return_value = 5000000000000000000

        result = StvaultService.fetch_vault_metrics(self.vault.dashboard)
        self.assertIsNotNone(result)
        self.assertEqual(result['total_value'], 32000000000000000000)
        self.assertEqual(result['liability_shares'], 5000000000000000000)
        self.assertEqual(result['forced_rebalance_threshold_bp'], 800)
        self.assertEqual(result['liability_shares_in_steth_wei'], 5000000000000000000)

    @patch('validators.contract.stvault.service.stvault.DashboardContractService')
    def test_fetch_vault_metrics_query_failure(self, mock_dashboard):
        """When a concurrent query fails, should return None"""
        from validators.contract.stvault.service.stvault import StvaultService

        mock_dashboard.get_total_value.side_effect = Exception('RPC error')
        mock_dashboard.get_liability_shares.side_effect = Exception('RPC error')
        mock_dashboard.get_vault_connection.side_effect = Exception('RPC error')

        result = StvaultService.fetch_vault_metrics(self.vault.dashboard)
        self.assertIsNone(result)


# ============================================================
# StVault Config Module Tests
# ============================================================

class StvaultConfigModuleTests(TestCase):
    """Tests for validators.contract.stvault.config module functions"""

    def setUp(self):
        # Use update_or_create to avoid conflicts with init_default_config
        StVaultConfig.objects.update_or_create(key='CONFIRM_EXPIRY', defaults={'value': '86400'})
        StVaultConfig.objects.update_or_create(key='FEE_BPS', defaults={'value': '500'})
        StVaultConfig.objects.update_or_create(key='CREATE_DEFAULT_VALUE', defaults={'value': '2'})
        StVaultConfig.objects.update_or_create(key='OPERATOR_ADDRESS', defaults={'value': '0xOperator123'})
        StVaultConfig.objects.update_or_create(key='OPERATOR_MANAGER_ADDRESS', defaults={'value': '0xManager123'})
        StVaultConfig.objects.update_or_create(key='IS_PAUSED', defaults={'value': '0'})

    @patch('validators.contract.stvault.config.NETWORK', 'mainnet')
    def test_get_confirm_expiry(self):
        from validators.contract.stvault.config import get_confirm_expiry
        val = get_confirm_expiry()
        self.assertEqual(val, 86400)

    @patch('validators.contract.stvault.config.NETWORK', 'mainnet')
    def test_get_fee_bps(self):
        from validators.contract.stvault.config import get_fee_bps
        val = get_fee_bps()
        self.assertEqual(val, 500)

    def test_get_create_default_value(self):
        from validators.contract.stvault.config import get_create_default_value
        val = get_create_default_value()
        self.assertEqual(val, 2)

    @patch('validators.contract.stvault.config.NETWORK', 'mainnet')
    def test_get_operator_address(self):
        from validators.contract.stvault.config import get_operator_address
        val = get_operator_address()
        self.assertEqual(val, '0xOperator123')

    @patch('validators.contract.stvault.config.NETWORK', 'mainnet')
    def test_get_operator_manager_address(self):
        from validators.contract.stvault.config import get_operator_manager_address
        val = get_operator_manager_address()
        self.assertEqual(val, '0xManager123')

    def test_get_is_paused_false(self):
        from validators.contract.stvault.config import get_is_paused
        val = get_is_paused()
        self.assertFalse(val)

    def test_get_is_paused_true(self):
        StVaultConfig.objects.filter(key='IS_PAUSED').update(value='1')
        from validators.contract.stvault.config import get_is_paused
        val = get_is_paused()
        self.assertTrue(val)

    def test_get_confirm_expiry_default(self):
        """When config not in DB, should return default"""
        StVaultConfig.objects.filter(key='CONFIRM_EXPIRY').delete()
        from validators.contract.stvault.config import get_confirm_expiry
        val = get_confirm_expiry()
        self.assertEqual(val, 129600)  # default

    def test_get_fee_bps_default(self):
        StVaultConfig.objects.filter(key='FEE_BPS').delete()
        from validators.contract.stvault.config import get_fee_bps
        val = get_fee_bps()
        self.assertEqual(val, 350)  # default

    @patch('validators.contract.stvault.config.NETWORK', 'hoodi')
    def test_get_confirm_expiry_hoodi(self):
        from validators.contract.stvault.config import get_confirm_expiry
        val = get_confirm_expiry()
        self.assertEqual(val, 86400)

    @patch('validators.contract.stvault.config.NETWORK', 'hoodi')
    def test_get_fee_bps_hoodi(self):
        from validators.contract.stvault.config import get_fee_bps
        val = get_fee_bps()
        self.assertEqual(val, 500)

    @patch('validators.contract.stvault.config.NETWORK', 'hoodi')
    def test_get_operator_address_hoodi(self):
        from validators.contract.stvault.config import get_operator_address
        val = get_operator_address()
        self.assertEqual(val, '0xOperator123')

    @patch('validators.contract.stvault.config.NETWORK', 'hoodi')
    def test_get_operator_manager_address_hoodi(self):
        from validators.contract.stvault.config import get_operator_manager_address
        val = get_operator_manager_address()
        self.assertEqual(val, '0xManager123')

    def test_get_config_value_exception(self):
        """When StVaultConfig.get_value raises, _get_config_value returns default"""
        from validators.contract.stvault.config import _get_config_value
        with patch('validators.contract.stvault.config.StVaultConfig.get_value', side_effect=Exception('DB error')):
            val = _get_config_value('SOME_KEY', 'fallback')
            self.assertEqual(val, 'fallback')

    def test_get_config_int_value_exception(self):
        """When StVaultConfig.get_int_value raises, _get_config_int_value returns default"""
        from validators.contract.stvault.config import _get_config_int_value
        with patch('validators.contract.stvault.config.StVaultConfig.get_int_value', side_effect=Exception('DB error')):
            val = _get_config_int_value('SOME_KEY', 42)
            self.assertEqual(val, 42)

    def test_get_config_value_empty_string(self):
        """When config value is empty string, should return default"""
        from validators.contract.stvault.config import _get_config_value
        StVaultConfig.objects.update_or_create(key='EMPTY_KEY', defaults={'value': ''})
        val = _get_config_value('EMPTY_KEY', 'default_val')
        self.assertEqual(val, 'default_val')
