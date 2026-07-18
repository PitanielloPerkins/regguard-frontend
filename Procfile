release: cd backend && pip install --no-cache-dir --force-reinstall "resend>=0.8.0" && python -c "import resend; print('✅ Resend verified')" && echo "✅ Release phase complete"
web: cd backend && bash startup.sh python -m uvicorn main:app --host 0.0.0.0 --port $PORT --workers 4
