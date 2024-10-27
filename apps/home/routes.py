# -*- encoding: utf-8 -*-
# Flask imports
from flask import render_template, request, jsonify, send_file, current_app, url_for, redirect, flash, Response
from apps.home import blueprint
from jinja2 import TemplateNotFound

# Data handling and formatting
from decimal import Decimal, ROUND_HALF_UP
import json
from datetime import datetime, timedelta
import pytz

# Network and API related
import requests
import dns.resolver
import speedtest
import socket
from urllib.parse import urlparse

# Image processing
import qrcode
from PIL import Image
from io import BytesIO
import base64

# Hashing and security
import hashlib
import hmac
import secrets

# Utility imports
import os
import sys
import time
import logging
from functools import wraps


# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)



# Dashboard route
@blueprint.route('/')
def index():
    return render_template('home/index.html', segment='index')

# Salary Calculator routes
# Add to your routes.py file

@blueprint.route('/salary-calculator')
def salary_calculator():
    return render_template('home/salary-calculator.html', segment='salary-calculator')

@blueprint.route('/calculate-salary', methods=['POST'])
def calculate_salary():
    try:
        # Get basic salary
        basic_salary = float(request.form.get('basic_salary', 0))
        
        # Process taxable allowances
        num_taxable = int(request.form.get('num_taxable', 0))
        taxable_allowances = []
        for i in range(num_taxable):
            allowance = float(request.form.get(f'taxable_allowance_{i}', 0))
            taxable_allowances.append(allowance)
        
        # Process non-taxable allowances
        num_non_taxable = int(request.form.get('num_non_taxable', 0))
        non_taxable_allowances = []
        for i in range(num_non_taxable):
            allowance = float(request.form.get(f'non_taxable_allowance_{i}', 0))
            non_taxable_allowances.append(allowance)
        
        # Get insurance details
        insurance_type = request.form.get('insurance_type')
        if insurance_type == '5':  # 3rd Party Provider
            insurance_premium = float(request.form.get('insurance_premium', 0))
        else:
            # Predefined Assuria amounts
            insurance_amounts = {
                '1': 0,          # No Coverage
                '2': 1469,       # Employee Only
                '3': 3182,       # Employee & One
                '4': 4970       # Employee & Family
            }
            insurance_premium = insurance_amounts.get(insurance_type, 0)

        # Get other deductions
        loan_deduction = float(request.form.get('loan_deduction', 0))
        gpsu_deduction = float(request.form.get('gpsu_deduction', 0))
        num_children = int(request.form.get('num_children', 0))

        # Calculate totals
        total_taxable_allowances = sum(taxable_allowances)
        total_non_taxable_allowances = sum(non_taxable_allowances)
        
        # Calculate gross pay
        gross_pay = basic_salary + total_taxable_allowances + total_non_taxable_allowances
        
        # Calculate personal allowance with children
        personal_allowance = 100000 + (num_children * 10000)
        
        # Calculate NIS (5.6% with cap of $15,680)
        nis_rate = 0.056
        nis_cap = 15680
        nis_contribution = min(basic_salary * nis_rate, nis_cap)
        
        # Calculate insurance deduction (max 10% of gross or $50,000)
        max_insurance = min(insurance_premium, gross_pay * 0.1, 50000)
        
        # Calculate chargeable income
        if basic_salary < personal_allowance:
            chargeable_income = 0
            paye_tax = 0
        else:
            chargeable_income = (basic_salary - personal_allowance - nis_contribution - max_insurance)
            
            # Calculate PAYE tax
            if chargeable_income <= 2400000:
                paye_tax = chargeable_income * 0.28
            else:
                paye_tax = (2400000 * 0.28) + ((chargeable_income - 2400000) * 0.4)
        
        # Calculate total deductions and net pay
        total_deductions = nis_contribution + paye_tax + loan_deduction + gpsu_deduction + max_insurance
        net_pay = gross_pay - total_deductions
        
        # Calculate gratuity
        monthly_gratuity = basic_salary * 0.225
        semi_annual_gratuity = monthly_gratuity * 6
        annual_gratuity = monthly_gratuity * 12

        return jsonify({
            'success': True,
            'data': {
                'gross_pay': round(gross_pay, 2),
                'net_pay': round(net_pay, 2),
                'total_deductions': round(total_deductions, 2),
                'monthly_gratuity': round(monthly_gratuity, 2),
                'semi_annual_gratuity': round(semi_annual_gratuity, 2),
                'annual_gratuity': round(annual_gratuity, 2),
                'personal_allowance': round(personal_allowance, 2),
                'nis_contribution': round(nis_contribution, 2),
                'insurance_deduction': round(max_insurance, 2),
                'chargeable_income': round(chargeable_income, 2),
                'paye_tax': round(paye_tax, 2)
            }
        })

    except Exception as e:
        print(f"Error in calculate_salary: {str(e)}")  # For debugging
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@blueprint.route('/calculate-salary-increase', methods=['POST'])
def calculate_salary_increase():
    try:
        # Get the necessary data from the request
        current_salary = float(request.form.get('current_salary'))
        increase_percentage = float(request.form.get('increase_percentage'))
        is_increase_taxable = request.form.get('is_increase_taxable') == 'yes'

        # Calculate the new salary, deductions, and other values
        new_gross_pay = current_salary * (1 + increase_percentage / 100)
        new_nis_contribution = min(new_gross_pay * 0.056, 15680)
        new_paye_tax = calculate_paye_tax(new_gross_pay, current_salary, is_increase_taxable)
        new_total_deductions = new_nis_contribution + new_paye_tax
        new_net_pay = new_gross_pay - new_total_deductions
        new_total_compensation = new_gross_pay

        return jsonify({
            'success': True,
            'data': {
                'new_gross_pay': round(new_gross_pay, 2),
                'new_nis': round(new_nis_contribution, 2),
                'new_paye': round(new_paye_tax, 2),
                'new_deductions': round(new_total_deductions, 2),
                'new_net_pay': round(new_net_pay, 2),
                'new_total_compensation': round(new_total_compensation, 2)
            }
        })

    except Exception as e:
        print(f"Error in calculate_salary_increase: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

def calculate_paye_tax(new_gross_pay, current_salary, is_increase_taxable):
    """
    Calculate the PAYE tax for the new salary after the increase.

    Parameters:
    new_gross_pay (float): The new gross pay after the salary increase.
    current_salary (float): The current gross salary before the increase.
    is_increase_taxable (bool): Indicates whether the salary increase is taxable.

    Returns:
    float: The new PAYE tax amount.
    """
    try:
        # Calculate the chargeable income with the new gross pay
        personal_allowance = 100000
        nis_rate = 0.056
        nis_cap = 15680
        nis_contribution = min(new_gross_pay * nis_rate, nis_cap)

        if new_gross_pay < personal_allowance:
            chargeable_income = 0
            paye_tax = 0
        else:
            chargeable_income = new_gross_pay - personal_allowance - nis_contribution

            # Calculate the PAYE tax based on the chargeable income
            if chargeable_income <= 2400000:
                paye_tax = chargeable_income * 0.28
            else:
                paye_tax = (2400000 * 0.28) + ((chargeable_income - 2400000) * 0.4)

        # If the increase is not taxable, subtract the current PAYE tax from the new PAYE tax
        if not is_increase_taxable:
            current_chargeable_income = current_salary - personal_allowance - nis_contribution
            if current_chargeable_income <= 2400000:
                current_paye_tax = current_chargeable_income * 0.28
            else:
                current_paye_tax = (2400000 * 0.28) + ((current_chargeable_income - 2400000) * 0.4)
            paye_tax -= current_paye_tax

        return round(paye_tax, 2)
    except Exception as e:
        print(f"Error in calculate_paye_tax: {str(e)}")
        return 0

@blueprint.route('/vehicle-import')
def vehicle_import():
    return render_template('home/vehicle-import.html', segment='vehicle-import')

@blueprint.route('/calculate-import', methods=['POST'])
def calculate_import():
    try:
        # Get form data with validation
        if not request.form:
            return jsonify({
                'success': False,
                'error': 'No form data provided'
            }), 400

        # Extract and validate required fields
        try:
            cif_usd = float(request.form.get('cif', 0))
            exchange_rate = float(request.form.get('exchange_rate', 208.50))
            vehicle_age = request.form.get('vehicle_age')
            vehicle_type = request.form.get('vehicle_type')
            propulsion = request.form.get('propulsion')
            engine_cc = request.form.get('engine_cc')
        except (ValueError, TypeError) as e:
            return jsonify({
                'success': False,
                'error': 'Invalid numeric value provided'
            }), 400

        # Validate required fields
        if not all([cif_usd, vehicle_age, vehicle_type, propulsion, engine_cc]):
            return jsonify({
                'success': False,
                'error': 'All fields are required'
            }), 400

        # Convert CIF to GYD
        cif_gyd = round(cif_usd * exchange_rate, 2)

        # Initialize variables
        custom_duty = 0
        excise_tax = 0
        environmental_tax = 0
        vat = 0

        # Handle electric vehicles (zero taxes)
        if propulsion == 'electric':
            return jsonify({
                'success': True,
                'calculations': {
                    'cif_gyd': cif_gyd,
                    'custom_duty': 0,
                    'environmental_tax': 0,
                    'excise_tax': 0,
                    'vat': 0,
                    'total_cost': cif_gyd
                }
            })

        # Calculate taxes based on vehicle age
        if vehicle_age == 'old':  # 4 years and older
            # Old vehicles have different calculation method
            excise_tax = calculate_old_vehicle_excise(cif_gyd, engine_cc, propulsion, exchange_rate)
            
            # Environmental tax applies to all vehicles except motorcycles
            if vehicle_type != 'motorcycle':
                environmental_tax = 5000
            
            # No customs duty or VAT for old vehicles

        else:  # Under 4 years
            # Get tax rates for new vehicles
            rates = get_new_vehicle_rates(engine_cc, propulsion)
            
            # Calculate each tax component
            custom_duty = cif_gyd * rates['duty']
            excise_tax = (cif_gyd + custom_duty) * rates['excise']
            
            # VAT is calculated on the total of CIF + duty + excise
            vat = (cif_gyd + custom_duty + excise_tax) * rates['vat']
            
            # Environmental tax applies to all vehicles except motorcycles
            if vehicle_type != 'motorcycle':
                environmental_tax = 5000

        # Calculate total cost
        total_cost = cif_gyd + custom_duty + excise_tax + environmental_tax + vat

        # Return formatted response
        return jsonify({
            'success': True,
            'calculations': {
                'cif_gyd': round(cif_gyd, 2),
                'custom_duty': round(custom_duty, 2),
                'environmental_tax': round(environmental_tax, 2),
                'excise_tax': round(excise_tax, 2),
                'vat': round(vat, 2),
                'total_cost': round(total_cost, 2)
            }
        })

    except Exception as e:
        print(f"Error in calculate_import: {str(e)}")  # For debugging
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

def calculate_old_vehicle_excise(cif_gyd, engine_cc, propulsion, exchange_rate):
    """Calculate excise tax for vehicles 4 years and older"""
    if propulsion == 'gasoline':
        if engine_cc in ['0-1000', '1001-1500']:
            return 800000
        elif engine_cc == '1501-1800':
            return (cif_gyd + (6000 * exchange_rate)) * 0.3 + (6000 * exchange_rate)
        elif engine_cc == '1801-2000':
            return (cif_gyd + (6500 * exchange_rate)) * 0.3 + (6500 * exchange_rate)
        elif engine_cc == '2001-3000':
            return (cif_gyd + (13500 * exchange_rate)) * 0.7 + (13500 * exchange_rate)
        else:  # Over 3000cc
            return (cif_gyd + (14500 * exchange_rate)) * 1.0 + (14500 * exchange_rate)
    else:  # Diesel
        if engine_cc in ['0-1000', '1001-1500']:
            return 800000
        elif engine_cc in ['1501-1800', '1801-2000']:
            return (cif_gyd + (15400 * exchange_rate)) * 0.3 + (15400 * exchange_rate)
        elif engine_cc == '2001-3000':
            return (cif_gyd + (15400 * exchange_rate)) * 0.7 + (15400 * exchange_rate)
        else:  # Over 3000cc
            return (cif_gyd + (17200 * exchange_rate)) * 1.0 + (17200 * exchange_rate)

def get_new_vehicle_rates(engine_cc, propulsion):
    """Get tax rates for vehicles under 4 years old"""
    rates = {
        'gasoline': {
            '0-1000': {'duty': 0.35, 'excise': 0, 'vat': 0.14},
            '1001-1500': {'duty': 0.35, 'excise': 0, 'vat': 0.14},
            '1501-1800': {'duty': 0.45, 'excise': 0.10, 'vat': 0.14},
            '1801-2000': {'duty': 0.45, 'excise': 0.10, 'vat': 0.14},
            '2001-3000': {'duty': 0.45, 'excise': 1.10, 'vat': 0.14},
            '3000+': {'duty': 0.45, 'excise': 1.40, 'vat': 0.14}
        },
        'diesel': {
            '0-1000': {'duty': 0.35, 'excise': 0, 'vat': 0.14},
            '1001-1500': {'duty': 0.35, 'excise': 0, 'vat': 0.14},
            '1501-1800': {'duty': 0.45, 'excise': 0.10, 'vat': 0.14},
            '1801-2000': {'duty': 0.45, 'excise': 0.10, 'vat': 0.14},
            '2001-3000': {'duty': 0.45, 'excise': 1.10, 'vat': 0.14},
            '3000+': {'duty': 0.45, 'excise': 1.10, 'vat': 0.14}
        }
    }
    
    default_rates = {'duty': 0, 'excise': 0, 'vat': 0.14}
    return rates.get(propulsion, {}).get(engine_cc, default_rates)


        
# Public IP routes
@blueprint.route('/public-ip')
def public_ip():
    return render_template('home/public-ip.html', segment='public-ip')

@blueprint.route('/get-ip-info', methods=['GET'])
def get_ip_info():
    try:
        # Using ipapi.co for detailed IP information
        response = requests.get('https://ipapi.co/json/')
        if response.status_code == 200:
            data = response.json()
            # Add additional hostname lookup
            try:
                hostname = socket.gethostbyaddr(data['ip'])[0]
            except:
                hostname = None
            
            data['hostname'] = hostname
            return jsonify(data)
        else:
            return jsonify({'error': 'Failed to fetch IP information'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@blueprint.route('/dns-lookup')
def dns_lookup():
    return render_template('home/dns-lookup.html', segment='dns-lookup')

@blueprint.route('/lookup-dns', methods=['POST'])
def lookup_dns():
    try:
        domain = request.form.get('domain')
        if not domain:
            return jsonify({
                'success': False,
                'error': 'Domain name is required'
            }), 400

        record_types = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'SOA', 'CNAME', 'PTR']
        results = {}

        for record_type in record_types:
            try:
                answers = dns.resolver.resolve(domain, record_type)
                results[record_type] = {
                    'records': [str(rdata) for rdata in answers],
                    'ttl': answers.rrset.ttl
                }
            except Exception as e:
                results[record_type] = {
                    'records': [],
                    'error': str(e)
                }

        # Add WHOIS information if possible
        try:
            import whois
            whois_info = whois.whois(domain)
            results['WHOIS'] = whois_info
        except:
            results['WHOIS'] = None

        return jsonify({
            'success': True,
            'domain': domain,
            'results': results
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

# Speed Test routes
@blueprint.route('/speedtest')
def speedtest_page():
    return render_template('home/speedtest.html', segment='speedtest')

@blueprint.route('/run-speedtest', methods=['POST'])
def run_speedtest():
    try:
        st = speedtest.Speedtest()
        
        # Get server list and select best
        st.get_best_server()
        
        # Track progress
        progress = {
            'download': 0,
            'upload': 0,
            'ping': 0
        }
        
        # Download Speed
        download_speed = st.download() / 1_000_000  # Convert to Mbps
        progress['download'] = 100
        
        # Upload Speed
        upload_speed = st.upload() / 1_000_000  # Convert to Mbps
        progress['upload'] = 100
        
        # Ping
        ping = st.results.ping
        progress['ping'] = 100
        
        # Get server information
        server_info = st.get_best_server()
        
        return jsonify({
            'success': True,
            'results': {
                'download': round(download_speed, 2),
                'upload': round(upload_speed, 2),
                'ping': round(ping, 2),
                'server': {
                    'name': server_info['sponsor'],
                    'location': f"{server_info['city']}, {server_info['country']}",
                    'host': server_info['host']
                }
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400
        
# About & Contact Routes
@blueprint.route('/about')
def about():
    return render_template('home/about.html', segment='about')

@blueprint.route('/contact', methods=['GET', 'POST'])
def contact():
    if request.method == 'POST':
        try:
            # Get form data
            name = request.form.get('name')
            email = request.form.get('email')
            subject = request.form.get('subject')
            message = request.form.get('message')
            
            # Here you would typically send an email or store in database
            # For now, we'll just return success
            return jsonify({
                'success': True,
                'message': 'Message sent successfully!'
            })
        except Exception as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 400
            
    return render_template('home/contact.html', segment='contact')

# Currency Converter Routes
@blueprint.route('/currency-converter')
def currency_converter():
    return render_template('home/currency-converter.html', segment='currency-converter')

@blueprint.route('/convert-currency', methods=['POST'])
def convert_currency():
    try:
        amount = float(request.form.get('amount'))
        from_currency = request.form.get('from_currency')
        to_currency = request.form.get('to_currency')
        
        # You would typically use a currency API here
        # For example, using exchangerate-api.com
        API_KEY = os.getenv('EXCHANGE_RATE_API_KEY')
        
        # Make API request
        response = requests.get(
            f'https://v6.exchangerate-api.com/v6/{API_KEY}/pair/{from_currency}/{to_currency}/{amount}'
        )
        
        if response.status_code == 200:
            data = response.json()
            return jsonify({
                'success': True,
                'result': {
                    'amount': amount,
                    'from_currency': from_currency,
                    'to_currency': to_currency,
                    'converted_amount': data['conversion_result'],
                    'rate': data['conversion_rate'],
                    'last_updated': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                }
            })
        else:
            raise Exception('Failed to fetch exchange rate')
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@blueprint.route('/get-exchange-rates', methods=['GET'])
def get_exchange_rates():
    try:
        base_currency = request.args.get('base', 'USD')
        
        # Fetch latest rates
        API_KEY = os.getenv('EXCHANGE_RATE_API_KEY')
        response = requests.get(
            f'https://v6.exchangerate-api.com/v6/{API_KEY}/latest/{base_currency}'
        )
        
        if response.status_code == 200:
            return jsonify({
                'success': True,
                'rates': response.json()['conversion_rates']
            })
        else:
            raise Exception('Failed to fetch rates')
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

def validate_qr_input(text, size):
    """Validate QR code input parameters"""
    errors = []
    
    # Validate text
    if not text:
        errors.append("Text content is required")
    elif len(text) > 2000:  # Reasonable limit for QR code content
        errors.append("Text content is too long (maximum 2000 characters)")
        
    # Validate size
    try:
        size = int(size)
        if size < 100:
            errors.append("Size must be at least 100 pixels")
        elif size > 1000:
            errors.append("Size must be no more than 1000 pixels")
    except (ValueError, TypeError):
        errors.append("Invalid size value")
        
    return errors

@blueprint.route('/qr-generator')
def qr_generator():
    """Render the QR code generator page"""
    try:
        return render_template('home/qr-generator.html', segment='qr-generator')
    except TemplateNotFound:
        logger.error("QR generator template not found")
        return render_template('home/page-404.html'), 404
    except Exception as e:
        logger.error(f"Error rendering QR generator page: {str(e)}", exc_info=True)
        return render_template('home/page-500.html'), 500

@blueprint.route('/generate-qr', methods=['POST'])
def generate_qr():
    """Generate a QR code from the provided text"""
    start_time = time.time()
    logger.info("Starting QR code generation request")
    
    try:
        # Get form data
        text = request.form.get('text', '').strip()
        size = request.form.get('size', '300')
        
        logger.debug(f"Received request - text: {text}, size: {size}")
        
        # Validate inputs
        errors = validate_qr_input(text, size)
        if errors:
            logger.warning(f"Validation failed: {', '.join(errors)}")
            return jsonify({
                'success': False,
                'error': '. '.join(errors)
            }), 400
            
        # Convert size to integer after validation
        size = int(size)
        
        # Create QR code
        try:
            qr = qrcode.QRCode(
                version=None,  # Auto-determine version
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(text)
            qr.make(fit=True)
            
        except qrcode.exceptions.DataOverflowError:
            logger.error("Data overflow error while generating QR code")
            return jsonify({
                'success': False,
                'error': 'Text content is too large for QR code'
            }), 400
            
        # Generate QR image
        qr_image = qr.make_image(fill_color="black", back_color="white")
        
        # Resize image if needed
        if qr_image.size != (size, size):
            try:
                qr_image = qr_image.resize((size, size), Image.Resampling.LANCZOS)
            except Exception as e:
                logger.error(f"Error resizing QR image: {str(e)}")
                return jsonify({
                    'success': False,
                    'error': 'Failed to resize QR code image'
                }), 400

        # Convert to base64
        try:
            buffered = BytesIO()
            qr_image.save(buffered, format="PNG", optimize=True)
            qr_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
        except Exception as e:
            logger.error(f"Error encoding QR image: {str(e)}")
            return jsonify({
                'success': False,
                'error': 'Failed to encode QR code image'
            }), 400

        # Calculate processing time
        processing_time = round((time.time() - start_time) * 1000)  # Convert to milliseconds
        logger.info(f"QR code generated successfully in {processing_time}ms")

        return jsonify({
            'success': True,
            'qr_code': qr_base64,
            'metadata': {
                'size': size,
                'processing_time_ms': processing_time,
                'content_length': len(text)
            }
        })

    except Exception as e:
        logger.error(f"Unexpected error generating QR code: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'An unexpected error occurred while generating the QR code'
        }), 500

@blueprint.route('/download-qr', methods=['POST'])
def download_qr():
    """Download the generated QR code"""
    try:
        qr_base64 = request.form.get('qr_code')
        if not qr_base64:
            return jsonify({
                'success': False,
                'error': 'No QR code data provided'
            }), 400

        # Decode base64 image
        try:
            qr_data = base64.b64decode(qr_base64)
        except Exception as e:
            logger.error(f"Error decoding base64 data: {str(e)}")
            return jsonify({
                'success': False,
                'error': 'Invalid QR code data'
            }), 400

        # Create BytesIO object
        buffered = BytesIO(qr_data)
        buffered.seek(0)

        return send_file(
            buffered,
            mimetype='image/png',
            as_attachment=True,
            download_name='qr-code.png'
        )

    except Exception as e:
        logger.error(f"Error downloading QR code: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Failed to download QR code'
        }), 500

# Hash Calculator routes
@blueprint.route('/hash-calculator')
def hash_calculator():
    return render_template('home/hash-calculator.html', segment='hash-calculator')

@blueprint.route('/generate-hash', methods=['POST'])
def generate_hash():
    try:
        text = request.form.get('text')
        algorithm = request.form.get('algorithm', 'sha256').lower()
        
        if not text:
            return jsonify({'success': False, 'error': 'No text provided'})

        # Dictionary of supported hash algorithms
        hash_functions = {
            'md5': hashlib.md5,
            'sha1': hashlib.sha1,
            'sha256': hashlib.sha256,
            'sha512': hashlib.sha512
        }
        
        if algorithm not in hash_functions:
            return jsonify({'success': False, 'error': 'Unsupported hash algorithm'})
            
        # Generate hash
        hash_obj = hash_functions[algorithm]()
        hash_obj.update(text.encode('utf-8'))
        hash_value = hash_obj.hexdigest()

        return jsonify({
            'success': True,
            'hash': hash_value,
            'algorithm': algorithm
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

# JSON Formatter route
@blueprint.route('/json-formatter')
def json_formatter():
    return render_template('home/json-formatter.html', segment='json-formatter')

# Note: JSON formatting is handled client-side in JavaScript,
# so no additional backend route is needed for that functionality.