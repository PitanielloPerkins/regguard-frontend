"""
Email Service: Sends research memos to trial users
Supports SendGrid, Resend, or simple email backend
"""

import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class EmailService:
    """Base email service"""

    async def send_research_memo(
        self,
        to_email: str,
        address: str,
        research_memo: str,
        trial_id: str,
    ) -> bool:
        """Send research memo to trial user"""
        raise NotImplementedError


class SendGridEmailService(EmailService):
    """SendGrid email service"""

    def __init__(self, api_key: str):
        self.api_key = api_key
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail
            self.sg = SendGridAPIClient(api_key)
            self.Mail = Mail
        except ImportError:
            logger.error("sendgrid package not installed")
            self.sg = None
            self.Mail = None

    async def send_research_memo(
        self,
        to_email: str,
        address: str,
        research_memo: str,
        trial_id: str,
    ) -> bool:
        """Send research memo via SendGrid"""
        if not self.sg or not self.Mail:
            logger.error("SendGrid not configured")
            return False

        try:
            message = self.Mail(
                from_email="hello@regguard.com",
                to_emails=to_email,
                subject="Your RegGuard Free Research Memo is Ready",
                html_content=self._build_html_email(address, research_memo, trial_id),
                plain_text_content=self._build_text_email(address, research_memo, trial_id),
            )

            response = self.sg.send(message)
            success = 200 <= response.status_code < 300

            if success:
                logger.info(f"Research memo sent to {to_email}")
            else:
                logger.error(f"SendGrid error: {response.status_code} {response.body}")

            return success

        except Exception as e:
            logger.error(f"Error sending email via SendGrid: {e}")
            return False

    def _build_html_email(self, address: str, research_memo: str, trial_id: str) -> str:
        """Build HTML email with research memo"""
        memo_html = research_memo.replace("\n", "<br>")
        return f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <h2>Your RegGuard Free Research Memo</h2>
                <p>Hi there,</p>
                <p>Your free research memo for <strong>{address}</strong> is ready. See what RegGuard delivers:</p>
                
                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <pre style="white-space: pre-wrap; font-family: monospace;">{memo_html}</pre>
                </div>
                
                <h3>What's Next?</h3>
                <p>Like what you see? Upgrade to the full package and get:</p>
                <ul>
                    <li>Contractor punch list (actionable items)</li>
                    <li>Permit package (forms ready to file)</li>
                    <li>Professional PDF formatting</li>
                </ul>
                
                <p><a href="https://app.regguardagent.com/order?trial={trial_id}" style="background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">
                    Upgrade to Full Package ($15,000)
                </a></p>
                
                <p style="color: #999; font-size: 12px; margin-top: 30px;">
                    RegGuard © 2026 • Questions? Email hello@regguard.com
                </p>
            </body>
        </html>
        """

    def _build_text_email(self, address: str, research_memo: str, trial_id: str) -> str:
        """Build plain text email"""
        return f"""Your RegGuard Free Research Memo

Site: {address}

{research_memo}

---

What's Next?

Like what you see? Upgrade to the full package and get:
- Contractor punch list (actionable items)
- Permit package (forms ready to file)
- Professional PDF formatting

Upgrade to Full Package ($15,000):
https://app.regguardagent.com/order?trial={trial_id}

Questions? Email hello@regguard.com
RegGuard © 2026
"""


class ResendEmailService(EmailService):
    """Resend email service (alternative to SendGrid)"""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.resend = None
        
        try:
            import resend as resend_lib
            logger.info("📦 resend module imported successfully")
            
            # Configure Resend with API key
            resend_lib.api_key = api_key
            self.resend = resend_lib
            logger.info(f"✅ Resend initialized with API key: {api_key[:20]}...")
        except ImportError as e:
            logger.error(f"❌ resend package not installed. Install with: pip install resend")
            logger.error(f"   ImportError: {e}")
            self.resend = None
        except AttributeError as e:
            logger.error(f"❌ Error setting resend.api_key: {e}")
            self.resend = None
        except Exception as e:
            logger.error(f"❌ Unexpected error initializing Resend: {type(e).__name__}: {e}")
            self.resend = None

    async def send_research_memo(
        self,
        to_email: str,
        address: str,
        research_memo: str,
        trial_id: str,
    ) -> bool:
        """Send research memo via Resend"""
        if not self.resend:
            logger.error("Resend not configured")
            return False

        try:
            memo_html = research_memo.replace("\n", "<br>")
            html_content = f"""
            <html>
                <body style="font-family: Arial, sans-serif; color: #333;">
                    <h2>Your RegGuard Free Research Memo</h2>
                    <p>Hi there,</p>
                    <p>Your free research memo for <strong>{address}</strong> is ready:</p>
                    
                    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <pre style="white-space: pre-wrap; font-family: monospace;">{memo_html}</pre>
                    </div>
                    
                    <h3>What's Next?</h3>
                    <p>Upgrade to the full package: punch list + permits + professional formatting</p>
                    <p><a href="https://app.regguardagent.com/order?trial={trial_id}">Upgrade to Full Package ($15,000)</a></p>
                    
                    <p style="color: #999; font-size: 12px;">RegGuard © 2026</p>
                </body>
            </html>
            """

            # Resend API call with configured api_key
            try:
                response = self.resend.Emails.send({
                    "from": "hello@regguard.com",
                    "to": to_email,
                    "subject": "Your RegGuard Free Research Memo is Ready",
                    "html": html_content,
                })
            except Exception as e:
                logger.error(f"❌ Resend API error: {e}")
                return False

            success = response.get("id") is not None

            if success:
                logger.info(f"Research memo sent to {to_email} via Resend")
            else:
                logger.error(f"Resend error: {response}")

            return success

        except Exception as e:
            logger.error(f"Error sending email via Resend: {e}")
            return False


def get_email_service() -> Optional[EmailService]:
    """Get configured email service (SendGrid or Resend)"""
    sendgrid_key = os.getenv("SENDGRID_API_KEY")
    resend_key = os.getenv("RESEND_API_KEY")

    if sendgrid_key:
        logger.info("Using SendGrid email service")
        return SendGridEmailService(sendgrid_key)
    elif resend_key:
        logger.info("Using Resend email service")
        return ResendEmailService(resend_key)
    else:
        logger.warning("No email service configured (SENDGRID_API_KEY or RESEND_API_KEY not set)")
        return None
