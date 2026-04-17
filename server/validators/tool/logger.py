import logging
from datetime import datetime, timedelta, timezone

def get_logger():
    # 设置北京时间的时区偏移量
    BJT_OFFSET = timedelta(hours=8)

    # 创建日志记录器
    logger = logging.getLogger(__name__)
    logger.setLevel(logging.INFO)

    # 创建控制台处理程序
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)

    # 创建文件处理程序
    file_handler = logging.FileHandler('app.log')
    file_handler.setLevel(logging.ERROR)

    # 创建格式化器
    # formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    # 创建格式化器
    class BeijingTimeFormatter(logging.Formatter):
        def formatTime(self, record, datefmt=None):
            current_time_utc = datetime.now(timezone.utc)
            current_time_bjt = current_time_utc + BJT_OFFSET
            return current_time_bjt.strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
    formatter = BeijingTimeFormatter('%(asctime)s - %(levelname)s - %(message)s\n------------------------------------------------------------------------------------------------------------------------------------')

    # 设置处理程序的格式化器
    console_handler.setFormatter(formatter)
    file_handler.setFormatter(formatter)

    # 将处理程序添加到日志记录器
    logger.addHandler(console_handler)
    logger.addHandler(file_handler)

    return logger

# 使用示例
logger = get_logger()
