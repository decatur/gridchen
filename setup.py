# -*- coding: utf-8 -*-
from setuptools import setup

setup_kwargs = {
    'name': 'gridchen',
    'version': '0.3.0',
    'description': 'A client/server web framework based an Python and modern JavaScript.',
    'long_description': '# app-chen\n\nThis is a client/server web framework based an Python and modern JavaScript.\n* Wraps the superb client side components codemirror and grid-chen as a Python package.\n* Supports real time streaming via Server Send Events\n* Supports single page applications and in-app navigation\n* Supports on-the-fly web parts\n* Depends on Flask and MongoDB only\n* Uses es6 modules and plain vanilla JavaScript\n\n# Setup\n \n## Option A: Clone app-chen\n\n````shell script\ngit clone https://github.com/decatur/app-chen.git\ncd app-chen/\npython -m venv ./venv\nsource venv/Scripts/activate\npip install -r requirements.txt\n ````\n\n## Option B: Install into Existing Project\n\n````shell script\npip install git+https://github.com/decatur/app-chen.git\npip install appchen\n ````\n\n# Run Demo Web Server\n\n````shell script\n/c/tools/mongodb/bin/mongod --port 27017 --dbpath /c/data/db\npython -m appchen.web_demo.run_server --mongoport=27017 --httpport=8080\n ````\n\nYou may now navigate to http://localhost:8080 with Chrome or Firefox.\n\n\n# Run Demo Python Client\n\n````shell script\npython -m appchen.web_demo.client --httpport=8080\n````\n\n# Build\n\n````shell script\npoetry build\n````\n\n# Publishing to PyPI\n\n````shell script\npoetry config repositories.test_pypi https://test.pypi.org/legacy/\npoetry config http-basic.test_pypi user password\npoetry config http-basic.pypi user password\n\npoetry publish -r test_pypi\n````\n',
    'author': 'Wolfgang Kühn',
    'author_email': None,
    'maintainer': None,
    'maintainer_email': None,
    'url': 'https://github.com/decatur/app-chen',
    'packages': ['gridchen'],
    # 'package_data': package_data,
    'install_requires': [],
    'python_requires': '>=3.6,<4.0',
}


setup(**setup_kwargs)
