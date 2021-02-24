# -*- coding: utf-8 -*-
from setuptools import setup


with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()
    
packages = ['gridchen']

package_data = {'': ['*'], 'gridchen': ['testing/*', 'tests/*']}


setup(    
    name='gridchen',
    version='0.1.5',
    description='Very lightweight and fast editable web grid with strict MS-Excel adherence to user experience.',
    long_description_content_type="text/markdown",
    long_description=long_description,
    author='Wolfgang Kühn',
    author_email=None,
    maintainer=None,
    maintainer_email=None,
    url='https://github.com/decatur/grid-chen',
    packages=packages,
    package_data=package_data,
    python_requires='>=3.6,<4.0'
)
