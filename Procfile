release: pip install --upgrade pip && pip install --no-cache-dir --force-reinstall resend && python -c "import resend; print('✅ RESEND INSTALLED AND VERIFIED')" || exit 1
web: cd backend && python -m uvicorn main:app --host 0.0.0.0 --port $PORT
