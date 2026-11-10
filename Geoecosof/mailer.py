import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

MAIL_HOST = os.getenv('MAIL_HOST')
MAIL_PORT = int(os.getenv('MAIL_PORT', 587))
MAIL_USER = os.getenv('MAIL_USER')
MAIL_PASSWORD = os.getenv('MAIL_PASSWORD')
MAIL_FROM = os.getenv('MAIL_FROM', MAIL_USER)

def send_email(to_email, subject, html_content):
    if not MAIL_HOST or not MAIL_USER or not MAIL_PASSWORD:
        print("SMTP no configurado. Se omite el envío de correo a:", to_email)
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"Geoecosof <{MAIL_FROM}>"
        msg["To"] = to_email

        html_part = MIMEText(html_content, "html")
        msg.attach(html_part)

        # Usar SSL/TLS explícito (STARTTLS)
        with smtplib.SMTP(MAIL_HOST, MAIL_PORT) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(MAIL_USER, MAIL_PASSWORD)
            server.sendmail(MAIL_FROM, to_email, msg.as_string())
        
        print(f"Correo enviado exitosamente a {to_email}")
        return True
    except Exception as e:
        print(f"Error enviando correo a {to_email}: {e}")
        return False

def get_base_html(content):
    return f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; }}
            .container {{ max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }}
            .header {{ background-color: #1A4D2E; color: #fff; padding: 20px; text-align: center; }}
            .content {{ padding: 20px; }}
            .footer {{ background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #777; }}
            .data-table {{ width: 100%; border-collapse: collapse; margin-top: 15px; }}
            .data-table th, .data-table td {{ padding: 10px; border-bottom: 1px solid #eee; text-align: left; }}
            .data-table th {{ width: 35%; color: #555; }}
            .badge {{ display: inline-block; padding: 4px 10px; border-radius: 20px; font-weight: bold; font-size: 12px; background: #eee; color: #333; }}
            .badge.Recibido {{ background: #e5e7eb; color: #4b5563; }}
            .badge.seguimiento {{ background: #fef3c7; color: #d97706; }}
            .badge.Solucionado {{ background: #d1fae5; color: #059669; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>Geoecosof</h2>
            </div>
            <div class="content">
                {content}
            </div>
            <div class="footer">
                Gracias por contribuir al cuidado del medio ambiente.<br>
                Geoecosof - Protección de ecosistemas
            </div>
        </div>
    </body>
    </html>
    """

def send_creation_notification(email, report_data):
    subject = f"Reporte ambiental recibido - {report_data['id']}"
    
    badge_class = "Recibido"
    
    content = f"""
    <p>Hola,</p>
    <p>Hemos recibido correctamente tu reporte ambiental.</p>
    
    <table class="data-table">
        <tr><th>Código del reporte:</th><td><strong>{report_data['id']}</strong></td></tr>
        <tr><th>Tipo:</th><td>{report_data['type']}</td></tr>
        <tr><th>Estado actual:</th><td><span class="badge {badge_class}">{report_data['status']}</span></td></tr>
        <tr><th>Fecha:</th><td>{report_data['date']}</td></tr>
    </table>
    
    <p>Te enviaremos una notificación cuando el estado de tu reporte cambie.</p>
    """
    
    html = get_base_html(content)
    send_email(email, subject, html)

def send_update_notification(email, report_data, old_status, new_status):
    # Si es el mismo estado, no enviar
    if old_status == new_status:
        return
        
    if new_status.lower() == 'solucionado':
        subject = f"Tu reporte ambiental ha sido solucionado - {report_data['id']}"
        intro = "Te informamos que tu reporte ambiental ha sido marcado como <strong>solucionado</strong>."
    else:
        subject = f"Actualización de tu reporte ambiental - {report_data['id']}"
        intro = "Tenemos una actualización sobre tu reporte ambiental."

    badge_class = "Solucionado" if new_status.lower() == 'solucionado' else ("seguimiento" if "seguimiento" in new_status.lower() else "Recibido")
    
    content = f"""
    <p>Hola,</p>
    <p>{intro}</p>
    
    <table class="data-table">
        <tr><th>Código:</th><td><strong>{report_data['id']}</strong></td></tr>
        <tr><th>Tipo:</th><td>{report_data['type']}</td></tr>
        <tr><th>Estado anterior:</th><td>{old_status}</td></tr>
        <tr><th>Nuevo estado:</th><td><span class="badge {badge_class}">{new_status}</span></td></tr>
    </table>
    """
    
    html = get_base_html(content)
    send_email(email, subject, html)
