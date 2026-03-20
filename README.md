# Unified Faculty Portal

A full-stack academic staff management platform built with **Django 5 + DRF** (backend) and **React + Vite 6 + TailwindCSS v4** (frontend).

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Demo Data](#demo-data)
   - [How to Seed](#how-to-seed)
   - [Departments](#departments)
   - [User Accounts & Roles](#user-accounts--roles)
   - [Domains](#domains)
   - [Courses](#courses)
   - [Timetable / Schedule](#timetable--schedule)
   - [Syllabus (Units & Topics)](#syllabus-units--topics)
3. [Role Capabilities](#role-capabilities)

---


## Quick Start

```bash
# Backend
cd backend
python -m venv ../venv
../venv/Scripts/activate          # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo        # load all demo data
python manage.py runserver

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

---

## Demo Data

All demo data is loaded by a single management command:

### How to Seed

```bash
# Seed (safe — uses update_or_create, can be run multiple times)
python manage.py seed_demo

# Wipe everything and re-seed from scratch
python manage.py seed_demo --flush
```

> **Universal demo password for ALL accounts: `Demo@1234`**

---

### Departments

| Code  | Full Name                                    | HOD           |
|-------|----------------------------------------------|---------------|
| AI&DS | Artificial Intelligence and Data Science     | Vinu Karthick |
| CSE   | Computer Science and Engineering             | Sri Shanth    |
| IT    | Information Technology                       | Santhosh Kumar|

---

### User Accounts & Roles

#### ADMIN
> Both the principal and director use the same admin credentials.
> The admin sees the visual dashboard, can create tasks, and oversees all data — but cannot modify data from the frontend (read-only dashboard).

| Name        | Email                  | Password   | Notes                                  |
|-------------|------------------------|------------|----------------------------------------|
| Admin User  | admin@college.edu      | Demo@1234  | Principal / Director — Django superuser |

---

#### HOD (Head of Department)
> HODs see only their own department's data. They review faculty appraisals, approve swap/extra-class requests, and monitor teaching progress.

| Name           | Email                  | Password   | Department |
|----------------|------------------------|------------|------------|
| Vinu Karthick  | vinu@college.edu       | Demo@1234  | AI&DS      |
| Sri Shanth     | srishanth@college.edu  | Demo@1234  | CSE        |
| Santhosh Kumar | santhosh@college.edu   | Demo@1234  | IT         |

---

#### COORDINATOR (Domain Mentor)
> Coordinators are responsible for verifying teaching materials uploaded by faculty for courses in their assigned domain. Each coordinator manages one or more academic domains.

| Name        | Email                | Password   | Department | Domain(s) Managed                          |
|-------------|----------------------|------------|------------|--------------------------------------------|
| Anand Kumar | anand@college.edu    | Demo@1234  | AI&DS      | AI & Machine Learning · Data Science       |
| Lavanya M   | lavanya@college.edu  | Demo@1234  | CSE        | Programming & Software Development         |
| Divya N     | divya@college.edu    | Demo@1234  | IT         | Computer Networks & Cybersecurity · Systems|

---

#### FACULTY
> Faculty log daily entries (topics taught), upload materials, track assignments, submit appraisals, and request swaps or extra classes.

**AI&DS Faculty**

| Name        | Email                    | Password   | Course Assigned              | Section | Semester |
|-------------|--------------------------|------------|------------------------------|---------|----------|
| Samikssha R | samikssha@college.edu    | Demo@1234  | CS3251 — Programming in C    | A       | 2        |
| Deepa Priya | deepa@college.edu        | Demo@1234  | AD3401 — Neural Networks & DL| A       | 4        |
| Rajesh Kumar| rajesh@college.edu       | Demo@1234  | CS3401 — Algorithms          | A       | 4        |

**CSE Faculty**

| Name          | Email                      | Password   | Course Assigned              | Section | Semester |
|---------------|----------------------------|------------|------------------------------|---------|----------|
| Harini M      | harini@college.edu         | Demo@1234  | CS3401 — Algorithms          | A       | 4        |
| Karthikeyan S | karthikeyan@college.edu    | Demo@1234  | IT3401 — Computer Networks   | A       | 4        |
| Meenakshi R   | meenakshi@college.edu      | Demo@1234  | CS3402 — Database Mgmt Sys   | A       | 4        |

**IT Faculty**

| Name       | Email                 | Password   | Course Assigned              | Section | Semester |
|------------|-----------------------|------------|------------------------------|---------|----------|
| Akilan P   | akilan@college.edu    | Demo@1234  | IT3401 — Computer Networks   | A       | 4        |
| Preethi N  | preethi@college.edu   | Demo@1234  | CS3402 — Database Mgmt Sys   | A       | 4        |
| Suresh B   | suresh@college.edu    | Demo@1234  | CS3251 — Programming in C    | A       | 2        |

---

### Domains

Domains are academic groupings that courses belong to. Each domain has a **Domain Mentor** (COORDINATOR role) who verifies teaching materials.

| Code | Domain Name                              | Mentor        | Description Summary                                              |
|------|------------------------------------------|---------------|------------------------------------------------------------------|
| PSD  | Programming & Software Development      | Lavanya M     | C, OOP, Algorithms, English — procedural to functional paradigms |
| AIML | Artificial Intelligence & Machine Learning | Anand Kumar | ML, Neural Networks, NLP — Anna University AI&DS outcomes       |
| DSA  | Data Science & Analytics                 | Anand Kumar   | DBMS, DB Systems, BI tools, big-data engineering                |
| CNC  | Computer Networks & Cybersecurity        | Divya N       | OSI/TCP-IP, routing, network security, cloud networking          |
| SCA  | Systems & Computer Architecture          | Divya N       | OS, TOC, compiler design, computer organisation                 |

---

### Courses

All courses follow Anna University 2021 regulation nomenclature.

| Code   | Course Name                        | Sem | Credits | Domain | Departments        |
|--------|------------------------------------|-----|---------|--------|--------------------|
| HS3151 | Professional English               | 1   | 4       | PSD    | AI&DS, CSE, IT     |
| CS3251 | Programming in C                   | 2   | 4       | PSD    | AI&DS, CSE, IT     |
| CS3301 | Operating Systems                  | 3   | 3       | SCA    | CSE, IT            |
| CS3391 | Object Oriented Programming        | 3   | 4       | PSD    | CSE, IT            |
| AD3301 | Machine Learning                   | 3   | 4       | AIML   | AI&DS              |
| IT3301 | Database Systems                   | 3   | 3       | DSA    | IT                 |
| CS3401 | Algorithms                         | 4   | 4       | PSD    | AI&DS, CSE         |
| CS3402 | Database Management Systems        | 4   | 3       | DSA    | AI&DS, CSE, IT     |
| IT3401 | Computer Networks                  | 4   | 3       | CNC    | CSE, IT            |
| AD3401 | Neural Networks and Deep Learning  | 4   | 4       | AIML   | AI&DS              |
| CS3501 | Theory of Computation              | 5   | 3       | SCA    | CSE                |
| AD3501 | Natural Language Processing        | 5   | 3       | AIML   | AI&DS              |

> Courses with multiple departments are **shared courses** — they appear in each listed department's view.

---

### Timetable / Schedule

8 periods per day, Monday–Friday. All schedules are **conflict-free** (no two faculty share the same period/day slot).

**Period Timings**

| Period | Time           |
|--------|----------------|
| P1     | 08:00 – 08:55  |
| P2     | 08:55 – 09:50  |
| P3     | 09:50 – 10:45  |
| P4     | 10:55 – 11:50  |
| P5     | 11:50 – 12:45  |
| —      | 12:45 – 14:00 *(Lunch Break)* |
| P6     | 14:00 – 14:55  |
| P7     | 14:55 – 15:50  |
| P8     | 15:50 – 16:45  |

**Faculty Weekly Schedule**

| Faculty       | Course   | Room     | MON        | TUE        | WED        | THU        | FRI        |
|---------------|----------|----------|------------|------------|------------|------------|------------|
| Samikssha     | CS3251   | AIDS-101 | P1, P3     | —          | P2         | —          | P4         |
| Deepa         | AD3401   | AIDS-102 | —          | P1, P3     | —          | P2         | P5         |
| Rajesh        | CS3401   | AIDS-103 | P4         | —          | P3         | P4         | P2         |
| Harini        | CS3401   | CSE-201  | P2         | P5         | P1         | —          | P1         |
| Karthikeyan   | IT3401   | CSE-202  | P5         | —          | —          | P1         | P6         |
| Meenakshi     | CS3402   | CSE-203  | —          | P2         | P5         | —          | P7         |
| Akilan        | IT3401   | IT-301   | —          | P6         | P7         | —          | P8         |
| Preethi       | CS3402   | IT-302   | P7         | —          | —          | P3, P7     | —          |
| Suresh        | CS3251   | IT-303   | —          | P8         | P8         | P8         | P3         |

---

### Syllabus (Units & Topics)

Full 5-unit Anna University syllabus is seeded for the **4 actively-taught courses**. Each topic includes `planned_hours` and a `learning_outcome`.

| Course              | Units | Topics | Total Planned Hours |
|---------------------|-------|--------|---------------------|
| CS3251 — C Program  | 5     | 18     | ~42 hrs             |
| AD3401 — Neural Net | 5     | 18     | ~50 hrs             |
| CS3401 — Algorithms | 5     | 19     | ~52 hrs             |
| IT3401 — Comp Net   | 5     | 19     | ~47 hrs             |

**Example topics (CS3251 — Programming in C):**
- Unit 1: Problem Solving Concepts, C Data Types, Operators, Control Structures
- Unit 2: Arrays, Strings, Sorting & Searching
- Unit 3: Functions, Recursion, Storage Classes
- Unit 4: Pointers, Structures, Unions
- Unit 5: File Handling, Preprocessor, Dynamic Memory Allocation

---

## Role Capabilities

| Feature | ADMIN | HOD | COORDINATOR | FACULTY |
|---|:---:|:---:|:---:|:---:|
| Admin visual dashboard | ✅ | — | — | — |
| Create & assign tasks | ✅ | — | — | — |
| View all dept data | ✅ | own dept | own domain | own courses |
| Approve appraisals | — | ✅ | — | — |
| Submit appraisal | — | — | — | ✅ |
| Verify materials | — | — | ✅ | — |
| Upload materials | — | — | — | ✅ |
| Log daily teaching entry | — | — | — | ✅ |
| View teaching progress | ✅ | ✅ | — | own |
| Approve swap / extra class | — | ✅ | — | — |
| Request swap / extra class | — | — | — | ✅ |
| Course assignment trackers | — | — | — | ✅ |
| Upload course results | — | — | — | ✅ |
