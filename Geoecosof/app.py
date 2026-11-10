from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
import sqlite3
import os
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps

app = Flask(__name__)
app.secret_key = 'geoecosof_super_secret_key_123'
DB_FILE = 'database.db'

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS reports (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            desc TEXT NOT NULL,
            date TEXT NOT NULL,
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            address TEXT,
            severity TEXT NOT NULL,
            status TEXT NOT NULL,
            photo TEXT,
            name TEXT,
            email TEXT,
            notify BOOLEAN
        )
    ''')
    
    # Insert mock data if empty
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM reports")
    if cur.fetchone()[0] == 0:
        mock_data = [
            ('GEO-000101', 'Deforestación', 'Tala indiscriminada cerca del río.', '2026-09-10', 4.6097, -74.0817, 'Bosque Protector Sur', 'Alto', 'En seguimiento', 'https://images.unsplash.com/photo-1596328328220-418ebdf1972b?w=400&q=80', None, None, False),
            ('GEO-000102', 'Acumulación de basura', 'Basura acumulada en la esquina del parque.', '2026-09-12', 4.6110, -74.0830, 'Parque Central', 'Bajo', 'Solucionado', None, None, None, False),
            ('GEO-000103', 'Contaminación del agua', 'Vertimiento de líquidos extraños al canal.', '2026-09-14', 4.6080, -74.0800, 'Canal Norte', 'Crítico', 'Recibido', None, None, None, False)
        ]
        cur.executemany('''
            INSERT INTO reports (id, type, desc, date, lat, lng, address, severity, status, photo, name, email, notify)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', mock_data)
        conn.commit()

    # Create users table
    conn.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        )
    ''')
    
    # Insert default admin user if not exists
    cur.execute("SELECT COUNT(*) FROM users WHERE username = 'admin'")
    if cur.fetchone()[0] == 0:
        admin_pw_hash = generate_password_hash('admin123')
        cur.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)", ('admin', admin_pw_hash))
        conn.commit()

    conn.close()

# Initialize DB on startup
if not os.path.exists(DB_FILE):
    init_db()
else:
    # Always try to init table in case it was deleted but file exists
    init_db()

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            if request.path.startswith('/api/'):
                return jsonify({"error": "Unauthorized"}), 401
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        conn = get_db_connection()
        user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
        conn.close()
        
        if user and check_password_hash(user['password_hash'], password):
            session['user_id'] = user['id']
            session['username'] = user['username']
            if username == 'admin':
                return redirect(url_for('admin_dashboard'))
            return redirect(url_for('user_dashboard'))
        else:
            flash('Usuario o contraseña incorrectos', 'error')
            
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        conn = get_db_connection()
        user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
        
        if user:
            conn.close()
            flash('El usuario ya existe', 'error')
        else:
            pw_hash = generate_password_hash(password)
            conn.execute('INSERT INTO users (username, password_hash) VALUES (?, ?)', (username, pw_hash))
            conn.commit()
            conn.close()
            flash('Registro exitoso. Ahora puedes iniciar sesión.', 'success')
            return redirect(url_for('login'))
            
    return render_template('register.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('welcome'))

@app.route('/')
def welcome():
    if 'user_id' in session:
        if session.get('username') == 'admin':
            return redirect(url_for('admin_dashboard'))
        return redirect(url_for('user_dashboard'))
    return render_template('welcome.html')

@app.route('/usuario')
@login_required
def user_dashboard():
    if session.get('username') == 'admin':
        return redirect(url_for('admin_dashboard'))
    return render_template('index.html')

@app.route('/inicio')
@login_required
def index():
    return redirect(url_for('user_dashboard'))

@app.route('/admin/dashboard')
@login_required
def admin_dashboard():
    if session.get('username') != 'admin':
        return redirect(url_for('index'))
    return render_template('admin/dashboard.html')

@app.route('/admin/reportes')
@login_required
def admin_reportes():
    if session.get('username') != 'admin':
        return redirect(url_for('index'))
    return render_template('admin/reportes.html')

@app.route('/api/reports', methods=['GET'])
@login_required
def get_reports():
    conn = get_db_connection()
    reports = conn.execute('SELECT * FROM reports ORDER BY rowid DESC').fetchall()
    conn.close()
    
    # Convert rows to dict
    reports_list = [dict(row) for row in reports]
    return jsonify(reports_list)

@app.route('/api/reports', methods=['POST'])
def create_report():
    data = request.json
    conn = get_db_connection()
    conn.execute('''
        INSERT INTO reports (id, type, desc, date, lat, lng, address, severity, status, photo, name, email, notify)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data['id'], data['type'], data['desc'], data['date'], 
        data['lat'], data['lng'], data.get('address'), 
        data['severity'], data['status'], data.get('photo'), 
        data.get('name'), data.get('email'), data.get('notify', False)
    ))
    conn.commit()
    conn.close()
    
    # Enviar correo si el usuario lo solicitó
    if data.get('notify') and data.get('email'):
        import mailer
        # Thread to avoid blocking the response
        import threading
        threading.Thread(target=mailer.send_creation_notification, args=(data['email'], data)).start()

    return jsonify({"message": "Report created"}), 201

@app.route('/api/reports/<report_id>', methods=['PUT'])
@login_required
def update_report(report_id):
    data = request.json
    new_status = data['status']
    
    conn = get_db_connection()
    # Obtenemos datos actuales antes de actualizar
    report_row = conn.execute('SELECT * FROM reports WHERE id = ?', (report_id,)).fetchone()
    
    if not report_row:
        conn.close()
        return jsonify({"error": "Report not found"}), 404
        
    old_status = report_row['status']
    
    conn.execute('UPDATE reports SET status = ? WHERE id = ?', (new_status, report_id))
    conn.commit()
    conn.close()
    
    # Enviar notificación si el usuario lo solicitó y el estado realmente cambió
    if report_row['notify'] and report_row['email'] and old_status != new_status:
        report_data = dict(report_row)
        import mailer
        import threading
        threading.Thread(target=mailer.send_update_notification, args=(report_row['email'], report_data, old_status, new_status)).start()
        
    return jsonify({"message": "Report updated"})

@app.route('/api/reports/<report_id>', methods=['DELETE'])
@login_required
def delete_report(report_id):
    conn = get_db_connection()
    conn.execute('DELETE FROM reports WHERE id = ?', (report_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Report deleted"})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
