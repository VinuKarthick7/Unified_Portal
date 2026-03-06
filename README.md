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
   - [Teaching Records](#teaching-records)
   - [Materials & Verifications](#materials--verifications)
   - [Appraisal Data](#appraisal-data)
   - [Tasks](#tasks)
   - [Assignment Trackers & Results](#assignment-trackers--results)
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

### Teaching Records

Daily entries are seeded for **5 weeks** (Feb 2 → Mar 6, 2026 — Even Semester 2025-26 start) for three faculty to demonstrate realistic teaching progress tracking.

| Faculty       | Course   | Entries | Coverage                          |
|---------------|----------|---------|-----------------------------------|
| Samikssha R   | CS3251   | ~20     | Units 1–2 in progress             |
| Deepa Priya   | AD3401   | ~20     | Unit 1 (Neural Network Basics)    |
| Harini M      | CS3401   | ~20     | Unit 1–2 (Complexity + D&C)       |

Each daily entry auto-creates a corresponding **TopicHandling** record (is_auto_generated=True), which feeds the KG-APS progress view.

---

### Materials & Verifications

For each of the 4 main courses, **2 materials per unit** are seeded:
- **PPT Slides** — status: `APPROVED` (verified by the domain coordinator)
- **Notes** — status: `PENDING` (awaiting coordinator review)

| Course   | Uploader      | Verified By   |
|----------|---------------|---------------|
| CS3251   | Samikssha R   | Lavanya M     |
| AD3401   | Deepa Priya   | Anand Kumar   |
| CS3401   | Rajesh Kumar  | Lavanya M     |
| IT3401   | Karthikeyan S | Divya N       |

Total: **40 materials**, **40 verification records**.

---

### Appraisal Data

Two appraisal templates are seeded:

#### 1. Annual Faculty Self-Appraisal 2025–26 *(Institution-Wide, 100 pts)*
Created by: Admin | Deadline: 31 May 2026

| Criteria | Max Score | Description |
|---|---|---|
| Teaching Quality & Student Feedback | 15 | Feedback score, peer review, delivery quality |
| Syllabus Coverage & Completion | 10 | Lesson plan adherence |
| Research, Publications & Projects | 15 | Papers, patents, funded projects |
| Student Academic Outcomes | 10 | Pass %, distinction count |
| Student Mentoring & Career Guidance | 10 | Mentoring hours, placement help |
| Industry Interaction & Value-Added Courses | 10 | Guest lectures, certifications |
| Professional Development | 10 | FDPs, workshops, online courses |
| Administrative & Department Activities | 10 | IQAC, NBA/NAAC, committees |
| Co-curricular & Extra-curricular | 5 | Clubs, sports, cultural |
| Attendance & Punctuality | 5 | Leave record, punctuality |

**Submissions:**

| Faculty       | Status      | Self Score | HOD Score | Reviewed By   |
|---------------|-------------|------------|-----------|---------------|
| Samikssha R   | COMPLETED   | 79 / 100   | 74 / 100  | Vinu Karthick |
| Deepa Priya   | HOD_REVIEW  | 86 / 100   | —         | Pending       |
| Rajesh Kumar  | DRAFT       | 72 / 100   | —         | Not submitted |

#### 2. AI&DS Department Mini-Review 2025–26 *(AI&DS only, 100 pts)*
Created by: Vinu Karthick (HOD AI&DS) | Deadline: 30 Apr 2026

| Criteria | Max Score |
|---|---|
| AI/ML Research Contribution | 20 |
| Lab Course Preparation | 20 |
| Industry Certification & Tools | 20 |
| Student Project Mentoring | 20 |
| Lesson Plan Adherence | 20 |

**Submission:** Samikssha — COMPLETED (Self: 80 / HOD: 75)

---

### Tasks

All tasks are created by **Admin** and assigned to relevant faculty/HODs.

| Task Title | Priority | Status | Due Date | Dept Scope | Assignees |
|---|---|---|---|---|---|
| NAAC Self-Study Report 2026 Submission | CRITICAL | IN_PROGRESS | Apr 5, 2026 | All | Vinu, Sri Shanth, Santhosh, Samikssha, Harini |
| Even Semester Lesson Plan Submission | HIGH | IN_PROGRESS | Mar 13, 2026 | All | All 9 Faculty |
| NBA CO-PO Attainment Data Collection | HIGH | OPEN | Apr 20, 2026 | All | All 3 HODs |
| AI&DS Lab Software Environment Setup | MEDIUM | COMPLETED | Mar 1, 2026 | AI&DS | Samikssha, Deepa, Rajesh |
| End-Semester Examination Duty Allocation | HIGH | OPEN | Mar 31, 2026 | All | All 3 HODs |
| Faculty Development Programme — Deep Learning | MEDIUM | OPEN | May 5, 2026 | AI&DS | Vinu, Anand, Deepa |
| Student Project Mid-Review Completion | MEDIUM | IN_PROGRESS | Mar 20, 2026 | All | Rajesh, Harini, Akilan |
| Alumni Meet Coordination 2026 | LOW | OPEN | May 1, 2026 | All | Meenakshi, Preethi, Suresh |

Each task has subtasks and a comment from the first assignee. Total: **27 subtasks**, **8 comments**.

---

### Assignment Trackers & Results

#### Assignment Trackers
Track student submission completion per course assignment (linked to a Google Sheet URL).

| Faculty       | Course   | Assignment Title                     | Completion % |
|---------------|----------|--------------------------------------|--------------|
| Samikssha     | CS3251   | Assignment 1 – C Basics & Operators  | 82.5 %       |
| Samikssha     | CS3251   | Assignment 2 – Arrays and Strings    | 67.0 %       |
| Deepa         | AD3401   | Assignment 1 – MLP Implementation    | 91.0 %       |
| Deepa         | AD3401   | Assignment 2 – CNN Architecture Report | 54.5 %     |
| Rajesh        | CS3401   | Assignment 1 – Complexity Analysis   | 76.0 %       |
| Harini        | CS3401   | Assignment 1 – Divide and Conquer    | 88.0 %       |
| Harini        | CS3401   | Assignment 2 – DP Table Solutions    | 70.0 %       |
| Karthikeyan   | IT3401   | Assignment 1 – OSI Layer Analysis    | 79.5 %       |
| Akilan        | IT3401   | Assignment 1 – Subnetting Worksheet  | 65.0 %       |

#### Course Results
End-semester result sheets (uploaded by faculty) for reference.

| Faculty       | Course   | Pass %  | Remarks                                          |
|---------------|----------|---------|--------------------------------------------------|
| Samikssha R   | CS3251   | 86.4 %  | Good pass rate. 5 failed due to absenteeism.     |
| Harini M      | CS3401   | 79.2 %  | Above average. Two students outstanding.         |
| Karthikeyan S | IT3401   | 83.0 %  | Lab component improved overall pass percentage.  |

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
