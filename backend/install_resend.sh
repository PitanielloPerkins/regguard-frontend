#!/bin/bash
set -e
echo "=========================================="
echo "🔧 INSTALLING RESEND PACKAGE"
echo "=========================================="
pip install --upgrade pip
pip install --no-cache-dir resend
python -c "import resend; print('✅ RESEND SUCCESSFULLY INSTALLED'); print(f'Resend version: {resend.__version__}')"
echo "=========================================="
