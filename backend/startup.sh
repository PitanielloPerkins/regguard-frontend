#!/bin/bash
set -e
echo "🔨 Installing resend..."
pip install --no-cache-dir --force-reinstall resend>=0.8.0
python -c "import resend; print('✅ Resend OK')"
echo "✅ Startup verification complete"
exec "$@"
