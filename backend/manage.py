#!/usr/bin/env python3
"""Django's command-line utility for administrative tasks."""
import os
import sys

def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    # Agar virtual muhit aktivlashtirilmagan bo'lsa, yonidagi venv ni avtomatik ulash
    base_dir = os.path.dirname(os.path.abspath(__file__))
    venv_site_packages = os.path.join(base_dir, 'venv', 'lib', f'python{sys.version_info.major}.{sys.version_info.minor}', 'site-packages')
    if os.path.isdir(venv_site_packages) and venv_site_packages not in sys.path:
        sys.path.insert(0, venv_site_packages)

    try:
        from django.core.management import execute_from_command_line  # type: ignore
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)

if __name__ == '__main__':
    main()
