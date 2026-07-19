release: pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir resend && python -c "import resend; print('✅ RESEND INSTALLED')" && exit 0
web: cd backend && python -m uvicorn main:app --host 0.0.0.0 --port $PORT
