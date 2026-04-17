from django.contrib import admin

from .models import Customer, Captcha, Config, Observer
from .models import PoolId
from .models.stvault import StVault
from .models.stvault_config import StVaultConfig


class CustomerAdmin(admin.ModelAdmin):
    list_filter = ['reward_address', 'created_time', 'pool_id', 'is_login']
    search_fields = ['email', 'phone', 'name']
    list_display = ('id', 'name', 'email', 'phone', 'pool_id', 'reward_address', 'fee_commission',
                    'mev_commission', 'is_login', 'created_time')


class ConfigAdmin(admin.ModelAdmin):
    list_filter = ['key']
    list_display = ('key', 'value', 'value_type', 'remark')


class ObserverAdmin(admin.ModelAdmin):
    list_filter = ['customer']
    list_display = ('customer', 'code', 'created_time')
    search_fields = ['code']


class PoolIdAdmin(admin.ModelAdmin):
    list_filter = ['id', 'name']
    list_display = ('id', 'name', 'customer_fee_commission',
                    'customer_mev_commission', 'pool_fee_commission', 'pool_mev_commission')
    search_fields = ['id', 'name']


class StVaultAdmin(admin.ModelAdmin):
    list_display = ('id', 'vault', 'status', 'dashboard', 'vault_owner', 'node_operator', 'total_value', 'staking_apr', 'health_factor', 'liability_steth', 'operator_fee_rate', 'created_time', 'updated_time')
    search_fields = ['vault', 'dashboard', 'vault_owner', 'node_operator', 'create_hash']
    list_filter = ['status', 'vault_owner', 'node_operator']


class StVaultConfigAdmin(admin.ModelAdmin):
    list_display = ('id', 'key', 'value', 'remark', 'created_time', 'updated_time')
    search_fields = ['key', 'value']


admin.site.register(Customer, CustomerAdmin)
admin.site.register(Captcha)
admin.site.register(Config, ConfigAdmin)
admin.site.register(Observer, ObserverAdmin)
admin.site.register(PoolId, PoolIdAdmin)
admin.site.register(StVault, StVaultAdmin)
admin.site.register(StVaultConfig, StVaultConfigAdmin)
