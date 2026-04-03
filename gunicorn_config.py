import multiprocessing

bind = "0.0.0.0:5002"
workers = multiprocessing.cpu_count() * 2 + 1
threads = 2
timeout = 120
accesslog = "logs/access.log"
errorlog = "logs/error.log"
loglevel = "info"