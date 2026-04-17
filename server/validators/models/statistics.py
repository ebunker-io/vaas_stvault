from django.db import models


class Statistics(models.Model):
    """
    统计数据表
    """
    def __str__(self):
        return f"{self.name}-{self.date}"

    name = models.CharField(max_length=100, help_text='业务名称')
    data = models.TextField(help_text='业务数据，JSON字符串')
    date = models.DateField(help_text='统计日期，精确到天')
    remark = models.CharField(max_length=500, null=True, blank=True, help_text='备注')
    created_time = models.DateTimeField(auto_now_add=True, blank=True)
    updated_time = models.DateTimeField(auto_now=True, blank=True)

    class Meta:
        db_table = 'statistics'
        indexes = [
            models.Index(fields=['name', 'date']),
            models.Index(fields=['date']),
            models.Index(fields=['name']),
        ]
        unique_together = [['name', 'date']]
        ordering = ['-date', '-created_time']
