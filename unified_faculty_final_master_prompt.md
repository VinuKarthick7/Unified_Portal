
# Unified Faculty Academic Operations Platform
## Final Master Prompt for AI Implementation

This document explains the **complete functional specification and integration design** for building a **Unified Faculty Academic Operations Platform** for a college.

The platform integrates four academic systems into a **single modular application**:

1. KG Academic Progress System (KG‑APS)
2. Academic Scheduler
3. Task Scheduler
4. Faculty Appraisal System

The goal is to create a **single faculty operations dashboard** that manages teaching, progress tracking, institutional tasks, and faculty performance evaluation.

The system must prioritize:
- Best **faculty user experience**
- **Operational efficiency** for departments
- **Data consistency**
- **Scalability** for future academic tools

---

# Core System Vision

The unified system acts as a **Faculty Operations ERP**.

It manages:

- Teaching activities
- Timetable execution
- Syllabus progress
- Faculty workload
- Administrative tasks
- Faculty performance evaluation

All modules revolve around the following **core entities**:

Faculty  
Department  
Course  
Course Assignment  
Topic  
Academic Activity

---

# Technology Stack

Frontend
- React (Vite)
- TailwindCSS
- Axios

Backend
- Django
- Django REST Framework

Database
- PostgreSQL

Infrastructure
- Docker
- Nginx Reverse Proxy
- JWT Authentication

Architecture Style
- Modular Monolith

Backend modules (Django apps):

```
accounts
departments
courses
scheduler
kgaps_creation
kgaps_handling
task_management
faculty_appraisal
notifications
analytics
```

---

# Module 1 — KG Academic Progress System (KG‑APS)

KG‑APS is the **academic backbone of the entire platform**.

It tracks:

- syllabus structure
- topic materials
- teaching progress
- hours handled by faculty
- academic approvals

KG‑APS has two major subsystems:

1. Creation
2. Handling

---

# KG‑APS Creation Module

Purpose:

Define the official syllabus structure and teaching materials for each course.

Hierarchy:

```
Course
  → Unit
      → Topic
          → Materials
```

Example:

Course: Programming in C

Unit 1
- Introduction to C
- Variables
- Data Types

Unit 2
- Control Structures
- Functions

Each topic may include:

- PPT slides
- notes
- lab instructions
- video links
- reference material

Workflow:

Admin / Coordinator defines course structure.

```
Admin creates Course
→ Admin creates Units
→ Admin creates Topics
→ Faculty uploads materials
→ Coordinator verifies materials
```

Entities:

Course  
Unit  
Topic  
Material  
MaterialVerification

Example schema:

```
Course
- id
- name
- code
- department_id

Unit
- id
- course_id
- unit_number
- title

Topic
- id
- unit_id
- topic_title
- description

Material
- id
- topic_id
- uploaded_by
- file_url
- material_type

MaterialVerification
- id
- material_id
- verified_by
- status
```

---

# KG‑APS Handling Module

Purpose:

Track **actual teaching activity** of faculty.

Handling records represent **what was actually taught in class**.

Handling is derived from the Creation module topics.

Example:

Faculty teaches:

Topic: Data Types  
Course: C Programming

Handling log:

```
Faculty: Ravi
Topic: Data Types
Hours handled: 2
Date: 2026‑03‑04
```

Workflow:

```
Faculty opens dashboard
→ sees assigned course topics
→ selects topic handled
→ enters hours handled
→ submits entry
→ HOD verifies
```

Entities:

CourseAssignment  
TopicHandling  
HandlingVerification

Example schema:

```
CourseAssignment
- faculty_id
- course_id
- section
- semester

TopicHandling
- id
- topic_id
- faculty_id
- hours_handled
- date

HandlingVerification
- id
- handling_id
- verified_by
- status
```

Important rule:

Handling entries must reference existing topics from Creation.

```
TopicHandling.topic_id → Topic.id
```

This prevents invalid topic entries.

---

# Module 2 — Academic Scheduler

Purpose:

Track **daily class execution** based on timetable.

It answers:

- Which faculty taught which class
- What was taught in each period
- Whether faculty were absent
- Whether classes were swapped

Core functions:

- timetable management
- daily teaching entry logging
- absence tracking
- swap classes
- extra classes

Example:

Timetable:

Monday  
Period 1  
Course: C Programming  
Faculty: Ravi  

Daily Entry:

Date: 2026‑03‑04  
Topic: Data Types  
Type: Theory

Entities:

Period  
Timetable  
DailyEntry  
SwapRequest  
ExtraClass

Example schema:

```
Timetable
- faculty_id
- course_id
- department_id
- day_of_week
- period_id

DailyEntry
- timetable_id
- date
- entry_type
- topic_id
- status
```

---

# Module 3 — Task Scheduler

Purpose:

Manage institutional tasks assigned to faculty or departments.

Examples:

- Submit NAAC report
- Upload course materials
- Prepare lab equipment list
- Organize seminar

Workflow:

```
Admin creates task
→ assigns to faculty
→ faculty updates status
→ system tracks completion
```

Features:

- task creation
- task assignment
- priority levels
- due dates
- reminders
- subtasks
- audit history
- file attachments

Entities:

Task  
SubTask  
TaskHistory  
TaskAttachment

Example schema:

```
Task
- id
- title
- description
- created_by
- assigned_to
- priority
- due_date
- status

SubTask
- parent_task
- assigned_to
- status
```

Statuses:

Pending  
Ongoing  
Completed  
Overdue

---

# Module 4 — Faculty Appraisal System

Purpose:

Evaluate faculty performance annually.

Evaluation categories:

- Teaching performance
- Research contribution
- Mentoring activities
- Administrative responsibilities
- Self‑assessment

Workflow:

```
Faculty submits self data
→ HOD uploads evaluation metrics
→ system calculates score
→ system generates reports
```

Output formats:

PDF  
DOCX  
XLSX

Entities:

AppraisalCycle  
FacultyAppraisal  
PerformanceMetric  
AppraisalReport

Example schema:

```
FacultyAppraisal
- faculty_id
- academic_year
- teaching_score
- research_score
- mentoring_score
- final_score
```

---

# Integration Strategy (Best College Workflow)

The best user experience is achieved when modules **share data automatically**.

Key integrations:

---

## Integration 1 — Scheduler → KGAPS Handling

When faculty submit a **daily class entry**, the system automatically generates a **TopicHandling record**.

```
DailyEntry created
→ TopicHandling automatically generated
```

Faculty does not need to enter teaching hours separately.

---

## Integration 2 — KGAPS Creation → Scheduler

Topics created in the Creation module automatically appear in scheduler dropdowns.

Faculty simply selects the topic taught.

---

## Integration 3 — Scheduler → Task Manager

If a faculty misses a daily entry:

```
System automatically creates task:
"Submit missing class entry"
```

---

## Integration 4 — Scheduler → Faculty Appraisal

Teaching activity metrics automatically contribute to appraisal scores:

- classes handled
- attendance
- extra classes taken

---

## Integration 5 — KGAPS Progress → Appraisal

Topic completion rate contributes to performance score.

```
completed_topics / total_topics
```

---

## Integration 6 — Unified Notification System

Single notification module handles:

- task reminders
- approval requests
- material verification alerts
- appraisal cycle reminders

---

# Final System Workflow

```
Course Creation
    ↓
Topic Creation
    ↓
Timetable Assignment
    ↓
Daily Class Entry
    ↓
Topic Handling Logged
    ↓
Progress Tracking Updated
    ↓
Tasks Generated (if needed)
    ↓
Performance Metrics Calculated
    ↓
Faculty Appraisal Reports Generated
```

---

# Final Architecture

```
React Dashboard
      │
Django REST API
      │
PostgreSQL Database
      │
Modules
 ├ Scheduler
 ├ KGAPS Creation
 ├ KGAPS Handling
 ├ Task Manager
 └ Faculty Appraisal
```

---

# Design Principles

The system must prioritize:

- clean architecture
- modular design
- minimal duplicate data entry
- centralized database
- efficient faculty workflow

Avoid:

- unnecessary microservices
- duplicate data storage
- overly complex infrastructure

---

# AI Implementation Guidance

When generating code for this system, AI should:

- follow modular Django architecture
- create normalized PostgreSQL schema
- generate REST APIs per module
- implement JWT authentication
- maintain RBAC permissions
- keep modules loosely coupled but data‑connected

---

# End of Master Prompt
