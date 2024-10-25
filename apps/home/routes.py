# -*- encoding: utf-8 -*-
from flask import render_template, request, jsonify
from apps.home import blueprint
from jinja2 import TemplateNotFound
import requests
import json
import dns.resolver
import speedtest
import qrcode
import hashlib
from io import BytesIO
import base64

# Dashboard route
@blueprint.route('/')
def index():
    return render_template('home/index.html', segment='index')

# Vehicle Import Calculator routes
@blueprint.route('/vehicle-import')
def vehicle_import():
    return render_template('home/vehicle-import.html', segment='vehicle-import')

@blueprint.route('/calculate-import', methods=['POST'])
def calculate_import():
    try:
        # Get form data
        cif_usd = float(request.form.get('cif'))
        exchange_rate = float(request.form.get('exchange_rate', 208.50))
        vehicle_age = request.form.get('vehicle_age')
        vehicle_type = request.form.get('vehicle_type')
        propulsion = request.form.get('propulsion')
        plate_type = request.form.get('plate_type', 'P')

        # Convert CIF to GYD
        cif_gyd = cif_usd * exchange_rate

        # Calculate duties based on vehicle type and age
        def calculate_excise_tax(cif_gyd, vehicle_age, vehicle_type, propulsion):
            base_rates = {
                'car': {'new': 0.25, 'old': 0.35},
                'suv': {'new': 0.25, 'old': 0.35},
                'van': {'new': 0.25, 'old': 0.35},
                'motorcycle': {'new': 0.10, 'old': 0.20},
                'single_cab': {'new': 0, 'old': 0},
                'double_cab': {'new': 0.10, 'old': 0.15}
            }

            # Adjust rates for electric vehicles
            if propulsion == 'electric':
                return 0  # Electric vehicles are exempt from excise tax

            base_rate = base_rates.get(vehicle_type, {}).get(vehicle_age, 0.35)
            return cif_gyd * base_rate

        def calculate_vat(cif_gyd, excise_tax):
            return (cif_gyd + excise_tax) * 0.14  # 14% VAT

        def calculate_environmental_tax(vehicle_age):
            return 15000 if vehicle_age == 'old' else 5000

        def calculate_custom_duty(cif_gyd, vehicle_type, plate_type):
            if plate_type == 'H':  # Hire cars
                return cif_gyd * 0.30
            base_rates = {
                'single_cab': 0.10,
                'double_cab': 0.15,
                'motorcycle': 0.30,
                'car': 0.45,
                'suv': 0.45,
                'van': 0.45
            }
            return cif_gyd * base_rates.get(vehicle_type, 0.45)

        # Calculate all components
        excise_tax = calculate_excise_tax(cif_gyd, vehicle_age, vehicle_type, propulsion)
        vat = calculate_vat(cif_gyd, excise_tax)
        environmental_tax = calculate_environmental_tax(vehicle_age)
        custom_duty = calculate_custom_duty(cif_gyd, vehicle_type, plate_type)

        # Calculate total cost
        total_cost = cif_gyd + excise_tax + vat + environmental_tax + custom_duty

        return jsonify({
            'success': True,
            'calculations': {
                'cif_gyd': round(cif_gyd, 2),
                'excise_tax': round(excise_tax, 2),
                'vat': round(vat, 2),
                'environmental_tax': round(environmental_tax, 2),
                'custom_duty': round(custom_duty, 2),
                'total_cost': round(total_cost, 2)
            }
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

# Speed Test routes
@blueprint.route('/speedtest')
def speedtest_page():
    return render_template('home/speedtest.html', segment='speedtest')

@blueprint.route('/run-speedtest', methods=['POST'])
def run_speedtest():
    try:
        st = speedtest.Speedtest()
        st.get_best_server()
        download_speed = st.download() / 1_000_000  # Convert to Mbps
        upload_speed = st.upload() / 1_000_000  # Convert to Mbps
        ping = st.results.ping
        
        return jsonify({
            'success': True,
            'results': {
                'download': round(download_speed, 2),
                'upload': round(upload_speed, 2),
                'ping': round(ping, 2)
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

# Public IP routes
@blueprint.route('/public-ip')
def public_ip():
    return render_template('home/public-ip.html', segment='public-ip')

@blueprint.route('/get-ip-info', methods=['GET'])
def get_ip_info():
    try:
        response = requests.get('https://ipapi.co/json/')
        return jsonify(response.json())
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# DNS Lookup routes
@blueprint.route('/dns-lookup')
def dns_lookup():
    return render_template('home/dns-lookup.html', segment='dns-lookup')

@blueprint.route('/lookup-dns', methods=['POST'])
def lookup_dns():
    try:
        domain = request.form.get('domain')
        record_types = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'SOA']
        results = {}

        for record_type in record_types:
            try:
                answers = dns.resolver.resolve(domain, record_type)
                results[record_type] = [str(rdata) for rdata in answers]
            except:
                results[record_type] = []

        return jsonify({'success': True, 'results': results})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

# QR Generator routes
@blueprint.route('/qr-generator')
def qr_generator():
    return render_template('home/qr-generator.html', segment='qr-generator')

@blueprint.route('/generate-qr', methods=['POST'])
def generate_qr():
    try:
        data = request.form.get('data')
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(data)
        qr.make(fit=True)
        
        img_buffer = BytesIO()
        img = qr.make_image(fill_color="black", back_color="white")
        img.save(img_buffer, format='PNG')
        img_str = base64.b64encode(img_buffer.getvalue()).decode()
        
        return jsonify({
            'success': True,
            'image': f'data:image/png;base64,{img_str}'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

# Other utility routes
@blueprint.route('/hash-calculator')
def hash_calculator():
    return render_template('home/hash-calculator.html', segment='hash-calculator')

@blueprint.route('/calculate-hash', methods=['POST'])
def calculate_hash():
    try:
        text = request.form.get('text')
        hash_type = request.form.get('type', 'md5')
        
        hash_functions = {
            'md5': hashlib.md5,
            'sha1': hashlib.sha1,
            'sha256': hashlib.sha256,
            'sha512': hashlib.sha512
        }
        
        hash_func = hash_functions.get(hash_type)
        if not hash_func:
            raise ValueError('Invalid hash type')
            
        result = hash_func(text.encode()).hexdigest()
        return jsonify({
            'success': True,
            'hash': result
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@blueprint.route('/json-formatter')
def json_formatter():
    return render_template('home/json-formatter.html', segment='json-formatter')

@blueprint.route('/format-json', methods=['POST'])
def format_json():
    try:
        data = request.get_json()
        formatted = json.dumps(data, indent=4)
        return jsonify({
            'success': True,
            'formatted': formatted
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

# Helper routes
@blueprint.route('/<template>')
def route_template(template):
    try:
        if not template.endswith('.html'):
            template += '.html'
        segment = get_segment(request)
        return render_template("home/" + template, segment=segment)
    except TemplateNotFound:
        return render_template('home/page-404.html'), 404
    except:
        return render_template('home/page-500.html'), 500

def get_segment(request):
    try:
        segment = request.path.split('/')[-1]
        if segment == '':
            segment = 'index'
        return segment
    except:
        return None