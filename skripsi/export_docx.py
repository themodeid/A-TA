import sys
import os

try:
    import docx
    print("python-docx is installed")
except ImportError:
    print("python-docx is NOT installed")
