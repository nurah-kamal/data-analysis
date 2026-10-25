import pandas as pd
import numpy as np
from faker import Faker
from datetime import datetime, timedelta
import random

# Initialize Faker with South African locale
fake = Faker('en_ZA')
Faker.seed(42)
np.random.seed(42)
random.seed(42)

# Configuration
num_records = 8950

# Provinces & Cities (South Africa)
provinces_cities = {
    'Gauteng': ['Johannesburg', 'Pretoria', 'Soweto'],
    'Western Cape': ['Cape Town', 'Stellenbosch', 'Paarl'],
    'KwaZulu-Natal': ['Durban', 'Pietermaritzburg', 'Richards Bay'],
    'Eastern Cape': ['Port Elizabeth', 'East London', 'Mthatha'],
    'Free State': ['Bloemfontein', 'Welkom', 'Bethlehem'],
    'Limpopo': ['Polokwane', 'Tzaneen', 'Thohoyandou'],
    'Mpumalanga': ['Nelspruit', 'Witbank', 'Secunda'],
    'North West': ['Rustenburg', 'Mahikeng', 'Klerksdorp'],
    'Northern Cape': ['Kimberley', 'Upington', 'Springbok']
}

provinces = list(provinces_cities.keys())
province_prob = [0.35, 0.15, 0.12, 0.10, 0.07, 0.06, 0.06, 0.05, 0.04]  # Adjust probabilities
assigned_provinces = np.random.choice(provinces, size=num_records, p=province_prob)
assigned_cities = [np.random.choice(provinces_cities[province]) for province in assigned_provinces]

# Departments & Job Titles
departments = ['HR', 'IT', 'Sales', 'Marketing', 'Finance', 'Operations', 'Customer Service']
departments_prob = [0.02, 0.18, 0.22, 0.08, 0.06, 0.25, 0.19]
jobtitles = {
    'HR': ['HR Manager', 'HR Officer', 'Recruitment Consultant', 'HR Assistant'],
    'IT': ['IT Manager', 'Software Engineer', 'System Administrator', 'IT Support Technician'],
    'Sales': ['Sales Executive', 'Business Development Manager', 'Sales Consultant', 'Account Manager'],
    'Marketing': ['Marketing Director', 'Social Media Manager', 'Content Strategist', 'Digital Marketer'],
    'Finance': ['Financial Manager', 'Accountant', 'Financial Analyst', 'Payroll Officer'],
    'Operations': ['Operations Manager', 'Supply Chain Analyst', 'Warehouse Supervisor', 'Logistics Coordinator'],
    'Customer Service': ['Customer Service Manager', 'Call Centre Agent', 'Support Specialist', 'Help Desk Assistant']
}

# South African Education Levels
education_mapping = {
    'HR Manager': ["Honours", "Master"],
    'HR Officer': ["Bachelor", "Honours"],
    'Recruitment Consultant': ["Diploma", "Bachelor"],
    'HR Assistant': ["Matric", "Diploma"],
    'IT Manager': ["Master", "PhD"],
    'Software Engineer': ["Bachelor", "Honours"],
    'System Administrator': ["Diploma", "Bachelor"],
    'IT Support Technician': ["Matric", "Diploma"],
    'Sales Executive': ["Bachelor", "Honours"],
    'Business Development Manager': ["Bachelor", "Honours"],
    'Sales Consultant': ["Diploma", "Bachelor"],
    'Account Manager': ["Bachelor", "Honours"],
    'Marketing Director': ["Master", "Honours"],
    'Social Media Manager': ["Diploma", "Bachelor"],
    'Content Strategist': ["Diploma", "Bachelor"],
    'Digital Marketer': ["Diploma", "Bachelor"],
    'Financial Manager': ["Honours", "Master"],
    'Accountant': ["Bachelor", "Honours"],
    'Financial Analyst': ["Bachelor", "Honours"],
    'Payroll Officer': ["Diploma", "Bachelor"],
    'Operations Manager': ["Bachelor", "Honours"],
    'Supply Chain Analyst': ["Bachelor", "Honours"],
    'Warehouse Supervisor': ["Diploma", "Bachelor"],
    'Logistics Coordinator': ["Diploma", "Bachelor"],
    'Customer Service Manager': ["Bachelor", "Honours"],
    'Call Centre Agent': ["Matric", "Diploma"],
    'Support Specialist': ["Matric", "Diploma"],
    'Help Desk Assistant': ["Matric", "Diploma"]
}

# Generate salary in South African Rand (ZAR)
def generate_salary(department, job_title):
    salary_dict = {
        'HR': {'HR Manager': (450000, 650000), 'HR Officer': (300000, 450000), 'Recruitment Consultant': (250000, 400000), 'HR Assistant': (200000, 300000)},
        'IT': {'IT Manager': (700000, 1200000), 'Software Engineer': (500000, 800000), 'System Administrator': (350000, 600000), 'IT Support Technician': (250000, 400000)},
        'Sales': {'Sales Executive': (600000, 1000000), 'Business Development Manager': (500000, 900000), 'Sales Consultant': (300000, 600000), 'Account Manager': (350000, 700000)},
        'Marketing': {'Marketing Director': (800000, 1200000), 'Social Media Manager': (400000, 700000), 'Content Strategist': (350000, 600000), 'Digital Marketer': (300000, 500000)},
        'Finance': {'Financial Manager': (800000, 1300000), 'Accountant': (450000, 800000), 'Financial Analyst': (500000, 900000), 'Payroll Officer': (350000, 600000)},
        'Operations': {'Operations Manager': (700000, 1100000), 'Supply Chain Analyst': (500000, 800000), 'Warehouse Supervisor': (300000, 600000), 'Logistics Coordinator': (250000, 500000)},
        'Customer Service': {'Customer Service Manager': (600000, 900000), 'Call Centre Agent': (200000, 400000), 'Support Specialist': (250000, 450000), 'Help Desk Assistant': (250000, 400000)}
    }
    return random.randint(*salary_dict[department][job_title])

# Generate dataset
data = []
for _ in range(num_records):
    employee_id = f"SA-{random.randint(100000, 999999)}"
    first_name = fake.first_name()
    last_name = fake.last_name()
    gender = np.random.choice(['Female', 'Male'], p=[0.48, 0.52])
    province = np.random.choice(provinces, p=province_prob)
    city = np.random.choice(provinces_cities[province])
    hiredate = fake.date_between(start_date="-10y", end_date="today")
    department = np.random.choice(departments, p=departments_prob)
    job_title = np.random.choice(jobtitles[department])
    education_level = np.random.choice(education_mapping[job_title])
    salary = generate_salary(department, job_title)
    performance_rating = np.random.choice(['Excellent', 'Good', 'Satisfactory', 'Needs Improvement'], p=[0.15, 0.50, 0.25, 0.10])

    data.append([employee_id, first_name, last_name, gender, province, city, hiredate, department, job_title, education_level, salary, performance_rating])

df = pd.DataFrame(data, columns=['employee_id', 'first_name', 'last_name', 'gender', 'province', 'city', 'hiredate', 'department', 'job_title', 'education_level', 'salary', 'performance_rating'])

# Save to CSV
df.to_csv('SouthAfrica_HumanResources.csv', index=False)
print(df.head())
