#!/usr/bin/env python3

import subprocess
import sys
import os
import platform
from typing import List, Dict
import json
import shutil

class DependencyInstaller:
    def __init__(self):
        self.os_type = platform.system().lower()
        self.is_root = os.geteuid() == 0
        self.cache_dir = os.path.expanduser('~/.pip/cache')
        
        # System packages needed for different OS types
        self.system_dependencies = {
            'ubuntu': [
                'python3-dev',
                'python3-pip',
                'build-essential',
                'libssl-dev',
                'libffi-dev',
                'libmagic1',
                'redis-server',
                'wkhtmltopdf',
                'libpq-dev',
                'git',
                'curl',
                'nginx',
                'postgresql',
                'postgresql-contrib'
            ],
            'debian': [
                'python3-dev',
                'python3-pip',
                'build-essential',
                'libssl-dev',
                'libffi-dev',
                'libmagic1',
                'redis-server',
                'wkhtmltopdf',
                'libpq-dev',
                'git',
                'curl',
                'nginx',
                'postgresql',
                'postgresql-contrib'
            ],
            'centos': [
                'python3-devel',
                'python3-pip',
                'gcc',
                'openssl-devel',
                'libffi-devel',
                'file-devel',
                'redis',
                'wkhtmltopdf',
                'postgresql-devel',
                'git',
                'curl',
                'nginx',
                'postgresql-server',
                'postgresql-contrib'
            ]
        }
        
        # Python packages grouped by functionality
        self.python_packages = {
            'core': [
                'Flask==2.0.1',
                'flask_login==0.5.0',
                'flask_migrate==3.1.0',
                'WTForms==2.3.3',
                'flask_wtf==0.15.1',
                'flask_sqlalchemy==2.5.1',
                'sqlalchemy==1.4.23',
                'email_validator==1.1.3',
                'python-decouple==3.4',
                'gunicorn==20.1.0',
                'jinja2==3.0.1'
            ],
            'network': [
                'requests==2.25.1',
                'dnspython==2.1.0',
                'speedtest-cli==2.1.3',
                'netifaces==0.11.0'
            ],
            'data_processing': [
                'numpy>=1.21.6,<1.28.0',
                'pandas>=1.3.3,<1.5.0',
                'scipy>=1.11.2'
            ],
            'media': [
                'qrcode==7.4.2',
                'pillow==9.5.0',
                'python-magic==0.4.27'
            ],
            'monitoring': [
                'psutil==5.9.5',
                'py-cpuinfo==9.0.0'
            ],
            'utilities': [
                'python-dateutil==2.8.2',
                'pytz==2023.3',
                'pyyaml==6.0.1',
                'humanize==4.7.0'
            ]
        }

    def check_os_support(self) -> bool:
        """Check if the OS is supported."""
        if self.os_type not in ['linux']:
            print(f"OS {self.os_type} is not supported")
            return False
        return True

    def get_linux_distribution(self) -> str:
        """Get the Linux distribution name."""
        try:
            with open('/etc/os-release') as f:
                lines = f.readlines()
                for line in lines:
                    if line.startswith('ID='):
                        return line.split('=')[1].strip().strip('"').lower()
        except Exception as e:
            print(f"Error determining Linux distribution: {e}")
        return None

    def install_system_package(self, package: str) -> bool:
        """Install a system package using the appropriate package manager."""
        distro = self.get_linux_distribution()
        
        if distro in ['ubuntu', 'debian']:
            cmd = ['apt-get', 'install', '-y', package]
        elif distro in ['centos', 'rhel', 'fedora']:
            cmd = ['yum', 'install', '-y', package]
        else:
            print(f"Unsupported distribution: {distro}")
            return False

        try:
            subprocess.run(cmd, check=True)
            return True
        except subprocess.CalledProcessError as e:
            print(f"Error installing {package}: {e}")
            return False

    def install_system_dependencies(self):
        """Install required system packages."""
        if not self.is_root:
            print("Need root privileges to install system dependencies")
            print("Please run with sudo")
            sys.exit(1)

        distro = self.get_linux_distribution()
        if distro not in self.system_dependencies:
            print(f"No system dependencies defined for {distro}")
            return

        print(f"\nInstalling system dependencies for {distro}...")
        
        if distro in ['ubuntu', 'debian']:
            subprocess.run(['apt-get', 'update'], check=True)
        elif distro in ['centos', 'rhel', 'fedora']:
            subprocess.run(['yum', 'update', '-y'], check=True)

        for package in self.system_dependencies[distro]:
            print(f"Installing {package}...")
            self.install_system_package(package)

    def setup_pip_cache(self):
        """Create and setup pip cache directory."""
        os.makedirs(self.cache_dir, exist_ok=True)
        print(f"Pip cache directory: {self.cache_dir}")

    def install_python_package(self, package: str) -> bool:
        """Install a Python package using pip."""
        try:
            cmd = [
                sys.executable, '-m', 'pip', 'install',
                '--cache-dir', self.cache_dir,
                '--ignore-installed',
                package
            ]
            subprocess.run(cmd, check=True)
            return True
        except subprocess.CalledProcessError as e:
            print(f"Error installing {package}: {e}")
            return False

    def install_python_packages(self):
        """Install Python packages by group."""
        print("\nInstalling Python packages...")
        
        failed_packages = []
        
        for group, packages in self.python_packages.items():
            print(f"\nInstalling {group} packages...")
            for package in packages:
                print(f"Installing {package}...")
                if not self.install_python_package(package):
                    failed_packages.append(package)

        if failed_packages:
            print("\nFailed to install the following packages:")
            for package in failed_packages:
                print(f"  - {package}")

    def run(self):
        """Run the installation process."""
        if not self.check_os_support():
            sys.exit(1)

        print("Starting installation process...")
        
        # Setup pip cache
        self.setup_pip_cache()
        
        # Install system dependencies if root
        if self.is_root:
            self.install_system_dependencies()
        else:
            print("\nSkipping system dependencies (not running as root)")
        
        # Install Python packages
        self.install_python_packages()
        
        print("\nInstallation process completed!")

if __name__ == "__main__":
    installer = DependencyInstaller()
    installer.run()
