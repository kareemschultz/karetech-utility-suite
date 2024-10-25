# -*- encoding: utf-8 -*-
"""
Copyright (c) 2019 - present AppSeed.us
"""

from flask import render_template, request, jsonify
from apps.home import blueprint
from jinja2 import TemplateNotFound

@blueprint.route('/')
def index():
    return render_template('home/index.html', segment='index')

@blueprint.route('/salary-calculator', methods=['GET'])
def salary_calculator():
    return render_template('home/salary-calculator.html', segment='salary-calculator')

@blueprint.route('/calculate-salary', methods=['POST'])
def calculate_salary():
    try:
        # Get form data with proper default values
        basic_salary = float(request.form.get('basic_salary', 0))
        num_children = int(request.form.get('num_children', 0) or 0)
        loan_deduction = float(request.form.get('loan_deduction', 0) or 0)
        gpsu_deduction = float(request.form.get('gpsu_deduction', 0) or 0)
        insurance_type = request.form.get('insurance_type', '1')
        
        # Process taxable allowances
        taxable_allowances = []
        num_taxable = int(request.form.get('num_taxable', 0) or 0)
        for i in range(num_taxable):
            allowance = float(request.form.get(f'taxable_allowance_{i}', 0) or 0)
            taxable_allowances.append(allowance)
            
        # Process non-taxable allowances
        non_taxable_allowances = []
        num_non_taxable = int(request.form.get('num_non_taxable', 0) or 0)
        for i in range(num_non_taxable):
            allowance = float(request.form.get(f'non_taxable_allowance_{i}', 0) or 0)
            non_taxable_allowances.append(allowance)

        # Calculate totals
        total_taxable_allowances = sum(taxable_allowances)
        total_non_taxable_allowances = sum(non_taxable_allowances)

        # Basic calculations
        gross_pay = round(basic_salary + total_taxable_allowances + total_non_taxable_allowances)
        
        # Calculate tax threshold with child adjustments
        base_threshold = 100000  # Monthly base threshold
        tax_threshold = base_threshold + (num_children * 10000)  # Add child adjustments
        
        # NIS calculation (capped at $15,680)
        nis_contribution = round(min(0.056 * basic_salary, 15680))

        # Insurance calculation
        insurance_rates = {
            '1': 0,      # No coverage
            '2': 0.02,   # Employee Only
            '3': 0.03,   # Employee & One
            '4': 0.04    # Employee & Family
        }
        insurance_rate = insurance_rates.get(insurance_type, 0)
        insurance_deduction = min(round(gross_pay * insurance_rate), 50000)  # Cap at $50,000

        # Calculate chargeable income
        if basic_salary <= tax_threshold:
            chargeable_income = 0
            paye_tax = 0
        else:
            chargeable_income = round(basic_salary - tax_threshold - nis_contribution - insurance_deduction)
            if chargeable_income <= 2400000:  # First 2.4M at 28%
                paye_tax = round(chargeable_income * 0.28)
            else:  # Above 2.4M at 40%
                paye_tax = round((2400000 * 0.28) + ((chargeable_income - 2400000) * 0.40))

        # Calculate total deductions and net pay
        total_deductions = nis_contribution + paye_tax + loan_deduction + gpsu_deduction
        net_pay = gross_pay - total_deductions

        # Calculate gratuity
        monthly_gratuity = round(0.225 * basic_salary)
        semi_annual_gratuity = monthly_gratuity * 6
        annual_gratuity = monthly_gratuity * 12

        # Prepare and return results
        return jsonify({
            'gross_pay': gross_pay,
            'tax_threshold': tax_threshold,
            'nis_contribution': nis_contribution,
            'insurance_deduction': insurance_deduction,
            'child_deduction': num_children * 10000,
            'chargeable_income': chargeable_income,
            'paye_tax': paye_tax,
            'total_deductions': total_deductions,
            'net_pay': net_pay,
            'monthly_gratuity': monthly_gratuity,
            'semi_annual_gratuity': semi_annual_gratuity,
            'annual_gratuity': annual_gratuity,
            'total_compensation': net_pay + annual_gratuity + basic_salary
        })

    except Exception as e:
        print(f"Error in salary calculation: {str(e)}")
        return jsonify({'error': str(e)}), 400

@blueprint.route('/calculate-salary-increase', methods=['POST'])
def calculate_salary_increase():
    try:
        # Get increase parameters
        increase_percentage = float(request.form.get('increase_percentage', 0))
        increase_taxable = request.form.get('increase_taxable') == 'yes'
        
        # Get base salary and calculate increase
        basic_salary = float(request.form.get('basic_salary', 0))
        new_basic = basic_salary * (1 + increase_percentage / 100)
        
        # Process allowances
        taxable_allowances = []
        num_taxable = int(request.form.get('num_taxable', 0) or 0)
        for i in range(num_taxable):
            allowance = float(request.form.get(f'taxable_allowance_{i}', 0) or 0)
            taxable_allowances.append(allowance)
            
        non_taxable_allowances = []
        num_non_taxable = int(request.form.get('num_non_taxable', 0) or 0)
        for i in range(num_non_taxable):
            allowance = float(request.form.get(f'non_taxable_allowance_{i}', 0) or 0)
            non_taxable_allowances.append(allowance)

        total_taxable_allowances = sum(taxable_allowances)
        total_non_taxable_allowances = sum(non_taxable_allowances)
        
        # Calculate new gross pay
        new_gross = round(new_basic + total_taxable_allowances + total_non_taxable_allowances)
        
        # Calculate new NIS (capped at $15,680)
        new_nis = round(min(0.056 * new_basic, 15680))
        
        # Get number of children and calculate tax threshold
        num_children = int(request.form.get('num_children', 0) or 0)
        tax_threshold = 100000 + (num_children * 10000)
        
        # Calculate insurance deduction
        insurance_type = request.form.get('insurance_type', '1')
        insurance_rates = {
            '1': 0, '2': 0.02, '3': 0.03, '4': 0.04
        }
        insurance_rate = insurance_rates.get(insurance_type, 0)
        new_insurance = min(round(new_gross * insurance_rate), 50000)
        
        # Calculate new PAYE tax
        if new_basic <= tax_threshold:
            new_paye = 0
            new_chargeable = 0
        else:
            new_chargeable = round(new_basic - tax_threshold - new_nis - new_insurance)
            if new_chargeable <= 2400000:
                new_paye = round(new_chargeable * 0.28)
            else:
                new_paye = round(2400000 * 0.28 + (new_chargeable - 2400000) * 0.4)
        
        # Get other deductions
        loan_deduction = float(request.form.get('loan_deduction', 0) or 0)
        gpsu_deduction = float(request.form.get('gpsu_deduction', 0) or 0)
        
        # Calculate new totals
        new_deductions = new_nis + new_paye + loan_deduction + gpsu_deduction
        new_net_pay = new_gross - new_deductions
        
        # Calculate new gratuity
        new_monthly_gratuity = round(0.225 * new_basic)
        new_annual_gratuity = new_monthly_gratuity * 12
        
        return jsonify({
            'gross_pay': new_gross,
            'tax_threshold': tax_threshold,
            'nis_contribution': new_nis,
            'insurance_deduction': new_insurance,
            'child_deduction': num_children * 10000,
            'chargeable_income': new_chargeable,
            'paye_tax': new_paye,
            'total_deductions': new_deductions,
            'net_pay': new_net_pay,
            'monthly_gratuity': new_monthly_gratuity,
            'semi_annual_gratuity': new_monthly_gratuity * 6,
            'annual_gratuity': new_annual_gratuity,
            'total_compensation': new_net_pay + new_annual_gratuity + new_basic
        })
        
    except Exception as e:
        print(f"Error in salary increase calculation: {str(e)}")
        return jsonify({'error': str(e)}), 400

@blueprint.route('/<template>')
def route_template(template):
    try:
        if not template.endswith('.html'):
            template += '.html'

        # Detect the current page
        segment = get_segment(request)

        # Serve the file (if exists) from app/templates/home/FILE.html
        return render_template("home/" + template, segment=segment)

    except TemplateNotFound:
        return render_template('home/page-404.html'), 404
    except:
        return render_template('home/page-500.html'), 500

# Helper - Extract current page name from request
def get_segment(request):
    try:
        segment = request.path.split('/')[-1]
        if segment == '':
            segment = 'index'
        return segment
    except:
        return None