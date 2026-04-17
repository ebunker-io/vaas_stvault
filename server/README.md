
## Directory Structure
1. mysite: main project
2. validators: validators project, responsible for models and the validator query platform
3. apis: API project, provides data interfaces for the Dapp frontend
4. scheduler: job project, scheduled tasks

## dev

1. Set up Python environment (3.10)
```
python3 -m venv tutorial-env
source tutorial-env/bin/activate
```
2. Install Django and dependencies
```
python3 -m pip install -r requirements.txt
```

3. Initialize the database and admin user

```
python manage.py migrate
python manage.py createsuperuser
```

4. Set an initial token for a user to use on first login
```
python3 manage.py addstatictoken [username]
```

5. Start the server
```
python manage.py runserver
```

6. Open the admin site to add customers and their nodes: http://127.0.0.1:8000/admin
7. Open the client to look up node info by the customer's reward address: http://127.0.0.1:8000/validators

## test
```shell
# Run all tests
python manage.py test
# Test the validators project
python manage.py test validators
# Test the scheduler project
python manage.py test scheduler
# Run ValidatorUtilTests in the scheduler project
python manage.py test scheduler.tests.ValidateUtilTests
```


## production

1. Install python3 and pip

```
sudo apt install python3.9
sudo apt install python3-pip
sudo apt install python3.8-venv

source venv/bin/activite
python -m pip install uwsgi
sudo apt-get install libmysqlclient-dev
```

2. Install dependencies
```
python3 -m pip install -r requirements.txt
```

3. Update settings.py
```
# Specify allowed hostnames, or '*' to allow all
ALLOWED_HOSTS = ['*']

# Update the database configuration

# Update STATIC_ROOT for generating static files
```
Generate static files and point nginx's static route to this path
```
python manage.py collectstatic
```


4. Initialize the database and admin user

```
python3 manage.py migrate
python3 manage.py createsuperuser
```
