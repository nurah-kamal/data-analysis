# South African HR Dataset Generator

A Python script that makes an invented South African workforce for practising HR analytics: 8,950 employees with departments, job titles, provinces, cities, education levels, salaries in rands and performance ratings. Nobody in it is real; names come from Faker's South African locale.

I used it to build the [HR dashboard](https://github.com/nurah-kamal/business-intelligence/tree/main/tableau/HR%20Data) in Tableau.

## How it generates each column

| Column | How it is made |
| --- | --- |
| `employee_id` | `SA-` and a random six-digit number |
| `first_name`, `last_name` | Faker, South African locale |
| `gender` | Female 48%, male 52% |
| `province`, `city` | A province by weighted probability, then one of that province's cities |
| `hiredate` | A random date in the last ten years |
| `department` | Weighted, from 2% HR to 25% Operations |
| `job_title` | One of four titles in that department |
| `education_level` | One of two levels that fit the job title (from matric to PhD) |
| `salary` | A whole number in a fixed rand range for that job title, for example R200,000 to R400,000 for a call centre agent |
| `performance_rating` | Excellent 15%, good 50%, satisfactory 25%, needs improvement 10% |

The seed is fixed (42), so the script makes the same file every time.

## What the data can and cannot show

Pay depends only on job title, so differences by gender or province in the output are chance, not a pattern. Education follows job title, so it will line up with pay. That makes this a dataset for practising dashboards, not for drawing conclusions. Employee IDs are drawn at random, so a duplicate ID is possible; checking for it is a good first cleaning step.

## Run it

```bash
pip install pandas numpy faker
python generate.py
```

It writes `SouthAfrica_HumanResources.csv` to the current folder.
