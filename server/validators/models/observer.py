from django.db import models
from .customer import Customer


class Observer(models.Model):
    def __str__(self):
        return self.code

    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, null=True)
    code = models.CharField(max_length=32, unique=True)
    created_time = models.DateTimeField(auto_now_add=True, blank=True)
    updated_time = models.DateTimeField(auto_now=True, blank=True)
