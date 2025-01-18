# -*- encoding: utf-8 -*-
"""
Routes file for Kareem's Tech Tools
"""

# Flask and Extensions
from flask import (
    render_template, request, jsonify, send_file, current_app,
    url_for, redirect, flash, Response, Blueprint, session
)
from flask_login import login_required, current_user
from flask_caching import Cache
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_socketio import SocketIO, emit
from werkzeug.utils import secure_filename
from jinja2 import TemplateNotFound

# Data Processing and Formatting
from decimal import Decimal, ROUND_HALF_UP
import pandas as pd
import numpy as np
from datetime import datetime, timedelta, timezone
import pytz
from babel.numbers import format_currency, format_decimal
from money import Money
import json
from forex_python.converter import CurrencyRates
import humanize
import io
import xlsxwriter
from weasyprint import HTML

# System and Performance Monitoring
import psutil
import cpuinfo
from prometheus_client import Counter, Histogram
import logging
from logging.handlers import RotatingFileHandler

# Network and API Related
import requests
import dns.resolver
import speedtest
import socket
from urllib.parse import urlparse, urljoin
import netifaces
from user_agents import parse as ua_parse
import whois

# File Processing and Media
import qrcode
from PIL import Image
import magic
import filetype
from io import BytesIO
import base64
from PyPDF2 import PdfReader, PdfWriter
import pdfkit

# Security and Authentication
import hashlib
import hmac
import secrets
import bcrypt
from cryptography.fernet import Fernet
import jwt

# Task Management and Scheduling
from celery import Celery
from apscheduler.schedulers.background import BackgroundScheduler
import redis

# Geographic and Time
from timezonefinder import TimezoneFinder
from geopy.geocoders import Nominatim
import pycountry
from iso3166 import countries

# Utility Imports
import os
import sys
import time
from functools import wraps
from collections import defaultdict
import phonenumbers
from slugify import slugify
import timeago
import uuid

# Initialize extensions
socketio = SocketIO()
cache = Cache()
limiter = Limiter(key_func=get_remote_address)
scheduler = BackgroundScheduler()
celery = Celery()
redis_client = redis.Redis()

# Prometheus metrics
REQUEST_COUNT = Counter(
    'request_count', 'App Request Count',
    ['method', 'endpoint', 'http_status']
)
REQUEST_LATENCY = Histogram(
    'request_latency_seconds', 'Request latency',
    ['method', 'endpoint']
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        RotatingFileHandler(
            'app.log', maxBytes=10000000, backupCount=5
        ),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Create blueprint
blueprint = Blueprint('home', __name__)

# Rate limiting decorators
def rate_limit(calls=100, period=timedelta(minutes=1)):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            key = f"{get_remote_address()}:{f.__name__}"
            current = redis_client.get(key)
            
            if current is None:
                redis_client.setex(
                    key, 
                    period.total_seconds(), 
                    1
                )
            elif int(current) >= calls:
                return jsonify({
                    'error': 'Rate limit exceeded'
                }), 429
            else:
                redis_client.incr(key)
            
            return f(*args, **kwargs)
        return wrapped
    return decorator

# Cache decorator
def cached(timeout=5 * 60):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            cache_key = f"{f.__name__}:{str(args)}:{str(kwargs)}"
            rv = cache.get(cache_key)
            if rv is None:
                rv = f(*args, **kwargs)
                cache.set(cache_key, rv, timeout=timeout)
            return rv
        return wrapped
    return decorator

# Request timing decorator
def timed_request():
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            start_time = time.time()
            result = f(*args, **kwargs)
            duration = time.time() - start_time
            
            REQUEST_LATENCY.labels(
                method=request.method,
                endpoint=request.endpoint
            ).observe(duration)
            
            return result
        return wrapped
    return decorator

# Error handler
@blueprint.errorhandler(Exception)
def handle_error(error):
    logger.error(f"Error occurred: {error}", exc_info=True)
    return jsonify({
        'success': False,
        'error': str(error)
    }), getattr(error, 'code', 500)


blueprint = Blueprint('dashboard', __name__)

# Main Dashboard Route
@blueprint.route('/')
def dashboard():
    try:
        # Collect system information
        system_info = {
            'os': platform.system(),
            'os_version': platform.version(),
            'platform': platform.platform(),
            'processor': platform.processor(),
            'python_version': sys.version,
            'hostname': socket.gethostname()
        }
        
        # Get usage statistics for tools
        tool_stats = get_tool_usage_stats()
        
        return render_template(
            'home/index.html',
            segment='index',
            system_info=system_info,
            tool_stats=tool_stats
        )
    except Exception as e:
        return render_template('home/index.html', segment='index', error=str(e))

# System Information Routes
@blueprint.route('/api/system-info')
def get_system_info():
    try:
        # Get CPU information
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_freq = psutil.cpu_freq()
        cpu_cores = psutil.cpu_count()
        
        # Get memory information
        memory = psutil.virtual_memory()
        
        # Get disk information
        disk = psutil.disk_usage('/')
        
        # Get network information
        network = psutil.net_io_counters()
        
        return jsonify({
            'success': True,
            'data': {
                'cpu': {
                    'usage_percent': cpu_percent,
                    'frequency': cpu_freq.current if cpu_freq else 'N/A',
                    'cores': cpu_cores
                },
                'memory': {
                    'total': memory.total,
                    'used': memory.used,
                    'percent': memory.percent
                },
                'disk': {
                    'total': disk.total,
                    'used': disk.used,
                    'free': disk.free,
                    'percent': disk.percent
                },
                'network': {
                    'bytes_sent': network.bytes_sent,
                    'bytes_recv': network.bytes_recv,
                    'packets_sent': network.packets_sent,
                    'packets_recv': network.packets_recv
                }
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Tool Usage Statistics
@blueprint.route('/api/tool-stats')
def get_tool_usage_stats():
    try:
        # In a real application, you would get this from a database
        # This is sample data for demonstration
        stats = {
            'calculators': {
                'salary_calculator': 150,
                'vehicle_import': 75,
                'currency_converter': 200
            },
            'network_tools': {
                'speed_test': 100,
                'public_ip': 180,
                'dns_lookup': 90
            },
            'utilities': {
                'qr_generator': 120,
                'hash_calculator': 80,
                'json_formatter': 95
            }
        }
        return jsonify({
            'success': True,
            'data': stats
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Network Status Route
@blueprint.route('/api/network-status')
def get_network_status():
    try:
        # Get basic network information
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)
        
        # Perform speed test
        st = speedtest.Speedtest()
        st.get_best_server()
        
        return jsonify({
            'success': True,
            'data': {
                'hostname': hostname,
                'local_ip': local_ip,
                'download_speed': st.download() / 1_000_000,  # Convert to Mbps
                'upload_speed': st.upload() / 1_000_000,      # Convert to Mbps
                'ping': st.results.ping
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# User Browser Information
@blueprint.route('/api/browser-info')
def get_browser_info():
    try:
        user_agent_string = request.headers.get('User-Agent')
        user_agent = parse(user_agent_string)
        
        return jsonify({
            'success': True,
            'data': {
                'browser': {
                    'family': user_agent.browser.family,
                    'version': user_agent.browser.version_string
                },
                'os': {
                    'family': user_agent.os.family,
                    'version': user_agent.os.version_string
                },
                'device': {
                    'family': user_agent.device.family,
                    'brand': user_agent.device.brand,
                    'model': user_agent.device.model
                }
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Recent Activity Routes
@blueprint.route('/api/recent-activity')
def get_recent_activity():
    try:
        # In a real application, this would come from a database
        # This is sample data for demonstration
        activities = [
            {
                'tool': 'Currency Converter',
                'action': 'Conversion performed',
                'timestamp': datetime.now().isoformat(),
                'details': 'USD to GYD conversion'
            },
            {
                'tool': 'Speed Test',
                'action': 'Test completed',
                'timestamp': (datetime.now() - timedelta(minutes=5)).isoformat(),
                'details': 'Download: 50Mbps, Upload: 25Mbps'
            }
            # Add more sample activities
        ]
        
        return jsonify({
            'success': True,
            'data': activities
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# System Health Check
@blueprint.route('/api/health-check')
def system_health_check():
    try:
        # Check system resources
        cpu_usage = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Define health status based on resource usage
        health_status = {
            'cpu': 'normal' if cpu_usage < 80 else 'high',
            'memory': 'normal' if memory.percent < 80 else 'high',
            'disk': 'normal' if disk.percent < 80 else 'high',
            'overall': 'healthy'
        }
        
        # Set overall status based on individual components
        if any(status == 'high' for status in health_status.values()):
            health_status['overall'] = 'warning'
        
        return jsonify({
            'success': True,
            'data': {
                'status': health_status,
                'metrics': {
                    'cpu_usage': cpu_usage,
                    'memory_usage': memory.percent,
                    'disk_usage': disk.percent
                },
                'timestamp': datetime.now().isoformat()
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Error Monitoring Route
@blueprint.route('/api/error-logs')
def get_error_logs():
    try:
        # In a real application, this would come from your logging system
        # This is sample data for demonstration
        error_logs = [
            {
                'timestamp': datetime.now().isoformat(),
                'level': 'ERROR',
                'message': 'Sample error message',
                'source': 'System'
            }
            # Add more sample logs
        ]
        
        return jsonify({
            'success': True,
            'data': error_logs
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Performance Metrics Route
@blueprint.route('/api/performance-metrics')
def get_performance_metrics():
    try:
        # Get system performance metrics
        metrics = {
            'cpu': {
                'usage': psutil.cpu_percent(interval=1),
                'frequency': psutil.cpu_freq().current if psutil.cpu_freq() else 'N/A',
                'cores': psutil.cpu_count()
            },
            'memory': {
                'total': psutil.virtual_memory().total,
                'used': psutil.virtual_memory().used,
                'percent': psutil.virtual_memory().percent
            },
            'disk': {
                'total': psutil.disk_usage('/').total,
                'used': psutil.disk_usage('/').used,
                'percent': psutil.disk_usage('/').percent
            },
            'network': {
                'bytes_sent': psutil.net_io_counters().bytes_sent,
                'bytes_recv': psutil.net_io_counters().bytes_recv
            },
            'timestamp': datetime.now().isoformat()
        }
        
        return jsonify({
            'success': True,
            'data': metrics
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Tool Analytics Route
@blueprint.route('/api/tool-analytics')
def get_tool_analytics():
    try:
        # In a real application, this would come from your analytics system
        # This is sample data for demonstration
        analytics = {
            'most_used_tools': [
                {'name': 'Currency Converter', 'usage_count': 500},
                {'name': 'Speed Test', 'usage_count': 300},
                {'name': 'QR Generator', 'usage_count': 200}
            ],
            'usage_by_category': {
                'calculators': 1000,
                'network_tools': 800,
                'utilities': 600
            },
            'usage_trends': [
                {
                    'date': (datetime.now() - timedelta(days=i)).strftime('%Y-%m-%d'),
                    'total_usage': 100 - i * 5
                } for i in range(7)
            ]
        }
        
        return jsonify({
            'success': True,
            'data': analytics
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Websocket route for real-time updates (if using websockets)
@blueprint.route('/ws/dashboard')
def dashboard_ws():
    return "WebSocket connection established", 200  # Placeholder for WebSocket implementation

# Helper function to format bytes to human readable format
def format_bytes(bytes):
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if bytes < 1024:
            return f"{bytes:.2f} {unit}"
        bytes /= 1024
    return f"{bytes:.2f} PB"

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
        
        # Get overtime details - NEW 2025
        overtime_amount = float(request.form.get('overtime_amount', 0))
        overtime_tax_free = min(overtime_amount, 50000)  # First $50,000 is tax-free
        taxable_overtime = max(0, overtime_amount - overtime_tax_free)
        
        # Get second job income - NEW 2025
        second_job_income = float(request.form.get('second_job_income', 0))
        second_job_tax_free = min(second_job_income, 50000)  # First $50,000 is tax-free
        taxable_second_job = max(0, second_job_income - second_job_tax_free)
        
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
                '4': 4970        # Employee & Family
            }
            insurance_premium = insurance_amounts.get(insurance_type, 0)

        # Get other deductions
        loan_deduction = float(request.form.get('loan_deduction', 0))
        gpsu_deduction = float(request.form.get('gpsu_deduction', 0))
        num_children = int(request.form.get('num_children', 0))
        
        # Calculate totals
        total_taxable_allowances = sum(taxable_allowances) + taxable_overtime + taxable_second_job
        total_non_taxable_allowances = (sum(non_taxable_allowances) + 
                                      overtime_tax_free + 
                                      second_job_tax_free)
        
        # Calculate gross pay
        gross_pay = basic_salary + total_taxable_allowances + total_non_taxable_allowances
        
        # Calculate personal allowance (2025)
        personal_allowance = 130000 + (num_children * 10000)
        
        # Calculate NIS (5.6% with cap of $15,680)
        nis_rate = 0.056
        nis_cap = 15680
        nis_contribution = min(basic_salary * nis_rate, nis_cap)
        
        # Calculate insurance deduction (max 10% of gross or $50,000)
        max_insurance = min(insurance_premium, gross_pay * 0.1, 50000)
        
        # Calculate chargeable income
        chargeable_income = max(0, basic_salary + total_taxable_allowances - 
                              personal_allowance - nis_contribution - max_insurance)
        
        # Calculate PAYE tax (2025 rate: 25%)
        paye_tax = chargeable_income * 0.25
        
        # Calculate total deductions and net pay
        total_deductions = (nis_contribution + paye_tax + loan_deduction + 
                          gpsu_deduction + max_insurance)
        net_pay = gross_pay - total_deductions
        
        # Calculate gratuity (22.5%)
        monthly_gratuity = basic_salary * 0.225
        semi_annual_gratuity = monthly_gratuity * 6
        annual_gratuity = monthly_gratuity * 12
        vacation_allowance = basic_salary  # One month basic salary for vacation

        # Calculate combined compensations
        monthly_net = net_pay
        semi_annual_net = net_pay * 6
        annual_net = net_pay * 12

        net_plus_monthly = monthly_net + monthly_gratuity
        net_plus_semi = semi_annual_net + semi_annual_gratuity
        net_plus_annual = annual_net + annual_gratuity
        total_annual_package = net_plus_annual + vacation_allowance

        return jsonify({
            'success': True,
            'data': {
                # Basic salary information
                'gross_pay': round(gross_pay, 2),
                'net_pay': round(net_pay, 2),
                'total_deductions': round(total_deductions, 2),
                
                # Allowances and deductions
                'personal_allowance': round(personal_allowance, 2),
                'nis_contribution': round(nis_contribution, 2),
                'insurance_deduction': round(max_insurance, 2),
                'chargeable_income': round(chargeable_income, 2),
                'paye_tax': round(paye_tax, 2),
                
                # New 2025 exemptions
                'overtime_tax_free': round(overtime_tax_free, 2),
                'overtime_taxable': round(taxable_overtime, 2),
                'second_job_tax_free': round(second_job_tax_free, 2),
                'second_job_taxable': round(taxable_second_job, 2),
                
                # Allowance totals
                'total_taxable_allowances': round(total_taxable_allowances, 2),
                'total_non_taxable_allowances': round(total_non_taxable_allowances, 2),
                
                # Base net pay periods
                'monthly_net': round(monthly_net, 2),
                'semi_annual_net': round(semi_annual_net, 2),
                'annual_net': round(annual_net, 2),
                
                # Gratuity information
                'monthly_gratuity': round(monthly_gratuity, 2),
                'semi_annual_gratuity': round(semi_annual_gratuity, 2),
                'annual_gratuity': round(annual_gratuity, 2),
                'vacation_allowance': round(vacation_allowance, 2),
                
                # Combined compensations
                'net_plus_monthly': round(net_plus_monthly, 2),
                'net_plus_semi': round(net_plus_semi, 2),
                'net_plus_annual': round(net_plus_annual, 2),
                'total_annual_package': round(total_annual_package, 2)
            }
        })

    except Exception as e:
        print(f"Error in calculate_salary: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@blueprint.route('/calculate-salary-increase', methods=['POST'])
def calculate_salary_increase():
    try:
        # Get the necessary data from the request
        current_salary = float(request.form.get('current_salary', 0))
        increase_percentage = float(request.form.get('increase_percentage', 0))
        is_increase_taxable = request.form.get('is_increase_taxable') == 'yes'
        num_children = int(request.form.get('num_children', 0))

        # Calculate the increase amount
        increase_amount = current_salary * (increase_percentage / 100)
        new_gross_pay = current_salary + increase_amount

        # Calculate new NIS contribution (5.6% capped at $15,680)
        new_nis_contribution = min(new_gross_pay * 0.056, 15680)

        # Calculate new PAYE tax with 2025 rules
        personal_allowance = 130000 + (num_children * 10000)  # 2025 threshold
        
        if is_increase_taxable:
            chargeable_income = max(0, new_gross_pay - personal_allowance - new_nis_contribution)
            new_paye_tax = chargeable_income * 0.25  # 2025 tax rate
        else:
            # Only calculate tax on the original salary
            chargeable_income = max(0, current_salary - personal_allowance - new_nis_contribution)
            new_paye_tax = chargeable_income * 0.25

        # Calculate new gratuity (22.5%)
        new_monthly_gratuity = new_gross_pay * 0.225
        new_semi_annual_gratuity = new_monthly_gratuity * 6
        new_annual_gratuity = new_monthly_gratuity * 12
        new_vacation_allowance = new_gross_pay  # One month basic salary

        # Calculate total deductions and net pay
        new_total_deductions = new_nis_contribution + new_paye_tax
        new_net_pay = new_gross_pay - new_total_deductions

        # Calculate monthly, semi-annual, and annual net pay
        new_monthly_net = new_net_pay
        new_semi_annual_net = new_net_pay * 6
        new_annual_net = new_net_pay * 12

        # Calculate combined compensations
        new_net_plus_monthly = new_monthly_net + new_monthly_gratuity
        new_net_plus_semi = new_semi_annual_net + new_semi_annual_gratuity
        new_net_plus_annual = new_annual_net + new_annual_gratuity
        new_total_annual_package = new_net_plus_annual + new_vacation_allowance

        # Calculate differences
        monthly_difference = new_net_pay - (current_salary / 12)
        annual_difference = monthly_difference * 12

        return jsonify({
            'success': True,
            'data': {
                # Basic salary information
                'new_gross_pay': round(new_gross_pay, 2),
                'new_net_pay': round(new_net_pay, 2),
                'new_nis': round(new_nis_contribution, 2),
                'new_paye': round(new_paye_tax, 2),
                'new_deductions': round(new_total_deductions, 2),
                
                # Increase details
                'increase_percentage': round(increase_percentage, 2),
                'increase_amount': round(increase_amount, 2),
                'monthly_difference': round(monthly_difference, 2),
                'annual_difference': round(annual_difference, 2),
                
                # Tax information
                'chargeable_income': round(chargeable_income, 2),
                'personal_allowance': round(personal_allowance, 2),
                
                # Net pay periods
                'new_monthly_net': round(new_monthly_net, 2),
                'new_semi_annual_net': round(new_semi_annual_net, 2),
                'new_annual_net': round(new_annual_net, 2),
                
                # New gratuity information
                'new_monthly_gratuity': round(new_monthly_gratuity, 2),
                'new_semi_annual_gratuity': round(new_semi_annual_gratuity, 2),
                'new_annual_gratuity': round(new_annual_gratuity, 2),
                'new_vacation_allowance': round(new_vacation_allowance, 2),
                
                # New combined compensations
                'new_net_plus_monthly': round(new_net_plus_monthly, 2),
                'new_net_plus_semi': round(new_net_plus_semi, 2),
                'new_net_plus_annual': round(new_net_plus_annual, 2),
                'new_total_annual_package': round(new_total_annual_package, 2)
            }
        })

    except Exception as e:
        print(f"Error in calculate_salary_increase: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

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



# Comprehensive currency database with regional grouping
CURRENCIES = {
    # North America
    'USD': {'name': 'US Dollar', 'symbol': '$', 'flag': '🇺🇸', 'region': 'North America'},
    'CAD': {'name': 'Canadian Dollar', 'symbol': 'C$', 'flag': '🇨🇦', 'region': 'North America'},
    'MXN': {'name': 'Mexican Peso', 'symbol': '$', 'flag': '🇲🇽', 'region': 'North America'},
    
    # Caribbean
    'GYD': {'name': 'Guyanese Dollar', 'symbol': 'G$', 'flag': '🇬🇾', 'region': 'Caribbean'},
    'BBD': {'name': 'Barbadian Dollar', 'symbol': 'Bds$', 'flag': '🇧🇧', 'region': 'Caribbean'},
    'TTD': {'name': 'Trinidad and Tobago Dollar', 'symbol': 'TT$', 'flag': '🇹🇹', 'region': 'Caribbean'},
    'JMD': {'name': 'Jamaican Dollar', 'symbol': 'J$', 'flag': '🇯🇲', 'region': 'Caribbean'},
    'BSD': {'name': 'Bahamian Dollar', 'symbol': 'B$', 'flag': '🇧🇸', 'region': 'Caribbean'},
    'KYD': {'name': 'Cayman Islands Dollar', 'symbol': 'CI$', 'flag': '🇰🇾', 'region': 'Caribbean'},
    'XCD': {'name': 'East Caribbean Dollar', 'symbol': 'EC$', 'flag': '🏳', 'region': 'Caribbean'},
    'HTG': {'name': 'Haitian Gourde', 'symbol': 'G', 'flag': '🇭🇹', 'region': 'Caribbean'},
    'CUP': {'name': 'Cuban Peso', 'symbol': '₱', 'flag': '🇨🇺', 'region': 'Caribbean'},
    'DOP': {'name': 'Dominican Peso', 'symbol': 'RD$', 'flag': '🇩🇴', 'region': 'Caribbean'},
    
    # South America
    'BRL': {'name': 'Brazilian Real', 'symbol': 'R$', 'flag': '🇧🇷', 'region': 'South America'},
    'ARS': {'name': 'Argentine Peso', 'symbol': '$', 'flag': '🇦🇷', 'region': 'South America'},
    'CLP': {'name': 'Chilean Peso', 'symbol': '$', 'flag': '🇨🇱', 'region': 'South America'},
    'COP': {'name': 'Colombian Peso', 'symbol': '$', 'flag': '🇨🇴', 'region': 'South America'},
    'PEN': {'name': 'Peruvian Sol', 'symbol': 'S/.', 'flag': '🇵🇪', 'region': 'South America'},
    'UYU': {'name': 'Uruguayan Peso', 'symbol': '$', 'flag': '🇺🇾', 'region': 'South America'},
    'VES': {'name': 'Venezuelan Bolívar', 'symbol': 'Bs.', 'flag': '🇻🇪', 'region': 'South America'},
    'BOB': {'name': 'Bolivian Boliviano', 'symbol': 'Bs.', 'flag': '🇧🇴', 'region': 'South America'},
    'PYG': {'name': 'Paraguayan Guaraní', 'symbol': '₲', 'flag': '🇵🇾', 'region': 'South America'},
    
    # Major World Currencies
    'EUR': {'name': 'Euro', 'symbol': '€', 'flag': '🇪🇺', 'region': 'World'},
    'GBP': {'name': 'British Pound', 'symbol': '£', 'flag': '🇬🇧', 'region': 'World'},
    'JPY': {'name': 'Japanese Yen', 'symbol': '¥', 'flag': '🇯🇵', 'region': 'World'},
    'CHF': {'name': 'Swiss Franc', 'symbol': 'Fr', 'flag': '🇨🇭', 'region': 'World'},
    'AUD': {'name': 'Australian Dollar', 'symbol': 'A$', 'flag': '🇦🇺', 'region': 'World'},
    'NZD': {'name': 'New Zealand Dollar', 'symbol': 'NZ$', 'flag': '🇳🇿', 'region': 'World'},
}

# Sample exchange rates (in production, these would come from an API)
SAMPLE_RATES = {
    'USD': 1.0,
    'EUR': 0.85,
    'GBP': 0.73,
    'GYD': 208.5,
    'BBD': 2.0,
    'TTD': 6.8,
    'JMD': 154.5,
    'BSD': 1.0,
    'KYD': 0.82,
    'XCD': 2.7,
    'HTG': 98.5,
    'CUP': 24.0,
    'DOP': 56.8,
    'BRL': 5.2,
    'ARS': 98.4,
    'CLP': 750.0,
    'COP': 3750.0,
    'PEN': 4.1,
    'UYU': 44.2,
    'VES': 4.1,
    'BOB': 6.9,
    'PYG': 6900.0,
    'CAD': 1.25,
    'MXN': 20.1,
    'JPY': 110.2,
    'CHF': 0.92,
    'AUD': 1.35,
    'NZD': 1.42,
}

@blueprint.route('/currency-converter')
def currency_converter():
    return render_template('home/currency-converter.html', segment='currency-converter')

@blueprint.route('/convert-currency', methods=['POST'])
def convert_currency():
    try:
        amount = float(request.form.get('amount', 0))
        from_currency = request.form.get('from_currency', 'USD')
        to_currency = request.form.get('to_currency', 'GYD')

        if amount <= 0:
            raise ValueError("Amount must be greater than 0")
            
        if from_currency not in SAMPLE_RATES or to_currency not in SAMPLE_RATES:
            raise ValueError("Invalid currency selected")

        # Calculate conversion
        from_rate = SAMPLE_RATES[from_currency]
        to_rate = SAMPLE_RATES[to_currency]
        conversion_rate = to_rate / from_rate
        converted_amount = amount * conversion_rate

        # Generate historical data
        historical_rates = []
        base_rate = conversion_rate
        for i in range(30):
            date = (datetime.now() - timedelta(days=i)).strftime('%Y-%m-%d')
            # Add some variation to create realistic looking data
            rate = base_rate * (1 + ((-1 if i % 2 else 1) * (i % 5) * 0.001))
            historical_rates.append({
                'date': date,
                'rate': rate
            })

        return jsonify({
            'success': True,
            'result': {
                'amount': amount,
                'from_currency': from_currency,
                'to_currency': to_currency,
                'converted_amount': converted_amount,
                'rate': conversion_rate,
                'last_updated': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'historical_rates': historical_rates,
                'from_currency_info': CURRENCIES[from_currency],
                'to_currency_info': CURRENCIES[to_currency]
            }
        })
            
    except ValueError as ve:
        return jsonify({
            'success': False,
            'error': str(ve)
        }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'An unexpected error occurred'
        }), 400

@blueprint.route('/get-exchange-rates', methods=['GET'])
def get_exchange_rates():
    try:
        return jsonify({
            'success': True,
            'rates': SAMPLE_RATES,
            'currencies_info': CURRENCIES,
            'last_updated': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400
@blueprint.route('/qr-generator')
def qr_generator_page():
    """Render the QR code generator page"""
    return render_template('home/qr-generator.html', segment='qr-generator')
    
@blueprint.route('/generate-qr', methods=['POST'])
def generate_qr():
    try:
        # Get form data
        text = request.form.get('text')
        size = request.form.get('size', '300')
        
        # Validate inputs
        if not text:
            return jsonify({
                'success': False,
                'error': 'No text provided'
            }), 400

        try:
            size = int(size)
            if size < 100 or size > 1000:
                size = 300
        except ValueError:
            size = 300

        print(f"Generating QR code for text: {text}, size: {size}")  # Debug log

        # Create QR code
        qr = qrcode.QRCode(
            version=None,  # Auto-determine version
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        
        # Add data and make QR code
        qr.add_data(text)
        qr.make(fit=True)

        # Create image
        qr_image = qr.make_image(fill_color="black", back_color="white")

        # Resize if needed
        if qr_image.size != (size, size):
            qr_image = qr_image.resize((size, size), Image.Resampling.LANCZOS)

        # Convert to base64
        buffered = BytesIO()
        qr_image.save(buffered, format="PNG")
        qr_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')

        print("QR code generated successfully")  # Debug log

        return jsonify({
            'success': True,
            'qr_code': qr_base64
        })

    except Exception as e:
        print(f"Error generating QR code: {str(e)}")  # Debug log
        return jsonify({
            'success': False,
            'error': f'Failed to generate QR code: {str(e)}'
        }), 400

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
