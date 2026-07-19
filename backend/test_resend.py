#!/usr/bin/env python3
"""Test if resend is installed and working"""
import sys

try:
    import resend
    print(f"✅ Resend successfully imported")
    print(f"   Version: {resend.__version__ if hasattr(resend, '__version__') else 'unknown'}")
    print(f"   Module path: {resend.__file__}")
    sys.exit(0)
except ImportError as e:
    print(f"❌ Failed to import resend: {e}")
    sys.exit(1)
