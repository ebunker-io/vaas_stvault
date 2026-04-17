from logging import Handler
from google.cloud import logging


class GCPHandler(Handler):
    """
    A class which sends records to a gpc logging
    """

    def __init__(self, logger_name: str):
        Handler.__init__(self)
        self.logger_name = logger_name
        self.logging_client = logging.Client()

    def emit(self, record):
        try:
            msg = self.format(record)
            logger = self.logging_client.logger(self.logger_name)
            # levelname: INFO WARNING ERROR DEBUG CRITICAL
            logger.log_text(msg, severity=record.levelname)
        except Exception:
            self.handleError(record)

class EmptyHandler(Handler):
    def __init__(self, logger_name: str):
        Handler.__init__(self)
        self.logger_name = logger_name

    def emit(self, record):
        # no impl
        self.format(record)
