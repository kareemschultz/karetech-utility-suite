# -*- encoding: utf-8 -*-
from flask import render_template, request, jsonify
from apps.home import blueprint
from jinja2 import TemplateNotFound
from decimal import Decimal, ROUND_HALF_UP
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
        
        
# Vehicle Import Calculator route
@blueprint.route('/vehicle-import')
def vehicle_import():
    return render_template('home/vehicle-import.html', segment='vehicle-import')

@blueprint.route('/calculate-vehicle-import', methods=['POST'])
def calculate_vehicle_import():
    try:
        # Get inputs from the form
        cif = float(request.form.get('cif', 0))
        exchange_rate = float(request.form.get('exchange_rate', 208.5))
        vehicle_age = request.form.get('vehicle_age')
        vehicle_type = request.form.get('vehicle_type')
        engine_cc = request.form.get('engine_cc')
        propulsion = request.form.get('propulsion')
        plate_type = request.form.get('plate_type')

        # Convert CIF to GYD
        cif_gyd = cif * exchange_rate

        # Determine base tax rates (simplified for example purposes)
        if vehicle_age == 'new':
            tax_rate = 0.35  # 35% for new vehicles
        else:
            tax_rate = 0.45  # 45% for older vehicles

        # Adjust tax rate based on engine size
        if engine_cc == '0-1000':
            engine_tax = 0.10  # 10%
        elif engine_cc == '1001-1500':
            engine_tax = 0.15
        elif engine_cc == '1501-1800':
            engine_tax = 0.20
        elif engine_cc == '1801-2000':
            engine_tax = 0.25
        elif engine_cc == '2001-3000':
            engine_tax = 0.30
        else:
            engine_tax = 0.35  # Over 3000cc

        # Additional tax for propulsion type
        if propulsion == 'electric':
            propulsion_tax = 0.05  # Reduced for electric vehicles
        else:
            propulsion_tax = 0.10

        # Calculate total tax
        total_tax = cif_gyd * (tax_rate + engine_tax + propulsion_tax)
        total_cost = cif_gyd + total_tax

        return jsonify({
            'success': True,
            'data': {
                'cif_gyd': round(cif_gyd, 2),
                'total_tax': round(total_tax, 2),
                'total_cost': round(total_cost, 2)
            }
        })

    except Exception as e:
        print(f"Error in calculate_vehicle_import: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400