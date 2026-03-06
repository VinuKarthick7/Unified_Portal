"""
Unified Faculty Portal - Comprehensive Demo Seed Command
=========================================================
Run:  python manage.py seed_demo
  or: python manage.py seed_demo --flush   (wipe data first)

Password for ALL demo accounts: Demo@1234

Departments : AI&DS  |  CSE  |  IT
Roles       : ADMIN (Balaji R — task creator)
              HOD   (Vinu Karthick, Sri Shanth, Santhosh Kumar)
              COORDINATOR / Domain Mentor (Anand Kumar, Lavanya M, Divya N)
              FACULTY (Samikssha R, Deepa Priya, Rajesh Kumar,
                       Harini M, Karthikeyan S, Meenakshi R,
                       Akilan P, Preethi N, Suresh B)
"""

from __future__ import annotations

import datetime
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone


DEMO_PASSWORD = "Demo@1234"
ACADEMIC_YEAR = "2025-2026"


# ─────────────────────────────────────────────────────────────────────────────
class Command(BaseCommand):
    help = "Seed comprehensive demo data for the Unified Faculty Portal"

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Delete ALL existing app data before seeding (keeps Django auth tables)",
        )

    # ─── Entry point ─────────────────────────────────────────────────────────
    def handle(self, *args, **options):
        if options["flush"]:
            self._flush()

        with transaction.atomic():
            periods     = self._seed_periods()
            depts       = self._seed_departments()
            users       = self._seed_users(depts)
            self._assign_hods(depts, users)
            domains     = self._seed_domains(users)
            courses     = self._seed_courses(depts, domains)
            syllabus    = self._seed_syllabus(courses)
            ca          = self._seed_course_assignments(users, courses)
            tt          = self._seed_timetables(ca, periods)
            self._seed_materials(syllabus, users)
            self._seed_daily_entries(tt, syllabus, users, ca)
            self._seed_appraisal(users, depts)
            self._seed_tasks(users, depts)
            self._seed_assignment_trackers(ca)
            self._seed_course_results(ca, users)

        self.stdout.write(self.style.SUCCESS("\n✔  Demo data seeded successfully!\n"))
        self.stdout.write("  Login credentials — email / password: Demo@1234")
        self.stdout.write("  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        self.stdout.write("  admin@college.edu       → ADMIN (principal/director)")
        self.stdout.write("  balaji@college.edu      → ADMIN (task creator)")
        self.stdout.write("  vinu@college.edu        → HOD, AI&DS")
        self.stdout.write("  srishanth@college.edu   → HOD, CSE")
        self.stdout.write("  santhosh@college.edu    → HOD, IT")
        self.stdout.write("  anand@college.edu       → COORDINATOR (AI/ML Domain)")
        self.stdout.write("  lavanya@college.edu     → COORDINATOR (Programming Domain)")
        self.stdout.write("  divya@college.edu       → COORDINATOR (Networks/Systems Domain)")
        self.stdout.write("  samikssha@college.edu   → FACULTY, AI&DS")
        self.stdout.write("  deepa@college.edu       → FACULTY, AI&DS")
        self.stdout.write("  rajesh@college.edu      → FACULTY, AI&DS")
        self.stdout.write("  harini@college.edu      → FACULTY, CSE")
        self.stdout.write("  karthikeyan@college.edu → FACULTY, CSE")
        self.stdout.write("  meenakshi@college.edu   → FACULTY, CSE")
        self.stdout.write("  akilan@college.edu      → FACULTY, IT")
        self.stdout.write("  preethi@college.edu     → FACULTY, IT")
        self.stdout.write("  suresh@college.edu      → FACULTY, IT\n")

    # ─── Flush ───────────────────────────────────────────────────────────────
    def _flush(self):
        self.stdout.write(self.style.WARNING("Flushing demo data…"))
        from scheduler.models          import DailyEntry, SwapRequest, ExtraClass, TimetableSlot, Timetable, Period
        from kgaps_handling.models     import TopicHandling, HandlingVerification, AssignmentTracker, CourseResult
        from kgaps_creation.models     import MaterialVerification, Material, Topic, Unit, Domain
        from faculty_appraisal.models  import CriteriaScore, AppraisalSubmission, AppraisalCriteria, AppraisalTemplate
        from task_management.models    import TaskHistory, TaskAttachment, TaskComment, SubTask, TaskAssignment, Task
        from courses.models            import CourseAssignment, Course
        from departments.models        import Department
        from accounts.models           import User

        for M in [
            DailyEntry, SwapRequest, ExtraClass, TimetableSlot, Timetable, Period,
            TopicHandling, HandlingVerification, AssignmentTracker, CourseResult,
            MaterialVerification, Material, Topic, Unit, Domain,
            CriteriaScore, AppraisalSubmission, AppraisalCriteria, AppraisalTemplate,
            TaskHistory, TaskAttachment, TaskComment, SubTask, TaskAssignment, Task,
            CourseAssignment, Course,
        ]:
            M.objects.all().delete()

        # Delete only demo users (not superusers created outside seed)
        User.objects.filter(email__endswith="@college.edu").exclude(
            email="admin@college.edu"
        ).delete()
        Department.objects.all().delete()
        self.stdout.write(self.style.WARNING("Flush complete.\n"))

    # =========================================================================
    # 1. PERIODS
    # =========================================================================
    def _seed_periods(self):
        from scheduler.models import Period

        slots = [
            (1, "Period 1",  "08:00", "08:55"),
            (2, "Period 2",  "08:55", "09:50"),
            (3, "Period 3",  "09:50", "10:45"),
            (4, "Period 4",  "10:55", "11:50"),
            (5, "Period 5",  "11:50", "12:45"),
            (6, "Period 6",  "14:00", "14:55"),
            (7, "Period 7",  "14:55", "15:50"),
            (8, "Period 8",  "15:50", "16:45"),
        ]
        objs = {}
        for order, name, start, end in slots:
            p, _ = Period.objects.update_or_create(
                order=order,
                defaults=dict(name=name, start_time=start, end_time=end),
            )
            objs[f"P{order}"] = p
        self.stdout.write(f"  Periods  : {len(objs)}")
        return objs

    # =========================================================================
    # 2. DEPARTMENTS
    # =========================================================================
    def _seed_departments(self):
        from departments.models import Department

        raw = [
            ("Artificial Intelligence and Data Science", "AI&DS"),
            ("Computer Science and Engineering",         "CSE"),
            ("Information Technology",                   "IT"),
        ]
        depts = {}
        for name, code in raw:
            d, _ = Department.objects.update_or_create(
                code=code, defaults=dict(name=name)
            )
            depts[code] = d
        self.stdout.write(f"  Departments: {len(depts)}")
        return depts

    # =========================================================================
    # 3. USERS
    # =========================================================================
    def _seed_users(self, depts):
        from accounts.models import User

        AIDS = depts["AI&DS"]
        CSE  = depts["CSE"]
        IT   = depts["IT"]

        # (email, username, first_name, last_name, role, department, phone)
        specs = [
            # ── ADMIN ──────────────────────────────────────────────────────
            ("admin@college.edu",       "admin",       "Admin",      "User",      "ADMIN", None, "9000000000"),
            ("balaji@college.edu",      "balaji",      "Balaji",     "R",         "ADMIN", None, "9000000001"),
            # ── HOD ────────────────────────────────────────────────────────
            ("vinu@college.edu",        "vinu",        "Vinu",       "Karthick",  "HOD",   AIDS, "9111100001"),
            ("srishanth@college.edu",   "srishanth",   "Sri",        "Shanth",    "HOD",   CSE,  "9111100002"),
            ("santhosh@college.edu",    "santhosh",    "Santhosh",   "Kumar",     "HOD",   IT,   "9111100003"),
            # ── COORDINATORS ───────────────────────────────────────────────
            ("anand@college.edu",       "anand",       "Anand",      "Kumar",     "COORDINATOR", AIDS, "9222200001"),
            ("lavanya@college.edu",     "lavanya",     "Lavanya",    "M",         "COORDINATOR", CSE,  "9222200002"),
            ("divya@college.edu",       "divya",       "Divya",      "N",         "COORDINATOR", IT,   "9222200003"),
            # ── FACULTY – AI&DS ────────────────────────────────────────────
            ("samikssha@college.edu",   "samikssha",   "Samikssha",  "R",         "FACULTY", AIDS, "9333300001"),
            ("deepa@college.edu",       "deepa",       "Deepa",      "Priya",     "FACULTY", AIDS, "9333300002"),
            ("rajesh@college.edu",      "rajesh",      "Rajesh",     "Kumar",     "FACULTY", AIDS, "9333300003"),
            # ── FACULTY – CSE ──────────────────────────────────────────────
            ("harini@college.edu",      "harini",      "Harini",     "M",         "FACULTY", CSE,  "9444400001"),
            ("karthikeyan@college.edu", "karthikeyan", "Karthikeyan","S",         "FACULTY", CSE,  "9444400002"),
            ("meenakshi@college.edu",   "meenakshi",   "Meenakshi",  "R",         "FACULTY", CSE,  "9444400003"),
            # ── FACULTY – IT ───────────────────────────────────────────────
            ("akilan@college.edu",      "akilan",      "Akilan",     "P",         "FACULTY", IT,   "9555500001"),
            ("preethi@college.edu",     "preethi",     "Preethi",    "N",         "FACULTY", IT,   "9555500002"),
            ("suresh@college.edu",      "suresh",      "Suresh",     "B",         "FACULTY", IT,   "9555500003"),
        ]

        users = {}
        for email, uname, fname, lname, role, dept, phone in specs:
            u, created = User.objects.update_or_create(
                email=email,
                defaults=dict(
                    username=uname,
                    first_name=fname,
                    last_name=lname,
                    role=role,
                    department=dept,
                    phone=phone,
                    is_staff=(role == "ADMIN"),
                    is_superuser=(email == "admin@college.edu"),
                ),
            )
            if created:
                u.set_password(DEMO_PASSWORD)
                u.save()
            users[uname] = u

        self.stdout.write(f"  Users    : {len(users)}")
        return users

    # =========================================================================
    # 3b. ASSIGN HODs to departments
    # =========================================================================
    def _assign_hods(self, depts, users):
        from departments.models import Department

        Department.objects.filter(code="AI&DS").update(hod=users["vinu"])
        Department.objects.filter(code="CSE").update(hod=users["srishanth"])
        Department.objects.filter(code="IT").update(hod=users["santhosh"])

    # =========================================================================
    # 4. DOMAINS
    # =========================================================================
    def _seed_domains(self, users):
        from kgaps_creation.models import Domain

        raw = [
            ("Programming & Software Development",    "PSD",   users["lavanya"],
             "Covers procedural, object-oriented and functional programming paradigms, "
             "data structures, algorithms and software engineering practices aligned with "
             "Anna University 2021 regulation curriculum."),
            ("Artificial Intelligence & Machine Learning", "AIML", users["anand"],
             "Encompasses supervised and unsupervised learning, neural networks, "
             "deep learning architectures, reinforcement learning and AI ethics as "
             "per Anna University AI&DS programme outcomes."),
            ("Data Science & Analytics",              "DSA",   users["anand"],
             "Statistical methods, data wrangling, visualisation, BI tools and big-data "
             "engineering mapped to the AI&DS and IT elective tracks."),
            ("Computer Networks & Cybersecurity",     "CNC",   users["divya"],
             "OSI/TCP-IP stack, routing, switching, network security, cryptography and "
             "cloud networking as per Anna University CS/IT core offerings."),
            ("Systems & Computer Architecture",       "SCA",   users["divya"],
             "Operating systems internals, computer organisation, compiler design and "
             "theory of computation forming the systems foundation of CS/IT programs."),
        ]
        domains = {}
        for name, code, mentor, desc in raw:
            d, _ = Domain.objects.update_or_create(
                name=name,
                defaults=dict(code=code, mentor=mentor, description=desc),
            )
            domains[code] = d
        self.stdout.write(f"  Domains  : {len(domains)}")
        return domains

    # =========================================================================
    # 5. COURSES
    # =========================================================================
    def _seed_courses(self, depts, domains):
        from courses.models import Course

        AIDS = depts["AI&DS"]
        CSE  = depts["CSE"]
        IT   = depts["IT"]

        PSD  = domains["PSD"]
        AIML = domains["AIML"]
        DSA  = domains["DSA"]
        CNC  = domains["CNC"]
        SCA  = domains["SCA"]

        # (code, name, sem, credits, domain, [depts])
        raw = [
            ("HS3151", "Professional English",              1, 4, PSD,  [AIDS, CSE, IT]),
            ("CS3251", "Programming in C",                  2, 4, PSD,  [AIDS, CSE, IT]),
            ("CS3391", "Object Oriented Programming",       3, 4, PSD,  [CSE, IT]),
            ("AD3301", "Machine Learning",                  3, 4, AIML, [AIDS]),
            ("CS3401", "Algorithms",                        4, 4, PSD,  [AIDS, CSE]),
            ("CS3402", "Database Management Systems",       4, 3, DSA,  [AIDS, CSE, IT]),
            ("IT3401", "Computer Networks",                 4, 3, CNC,  [CSE, IT]),
            ("AD3401", "Neural Networks and Deep Learning", 4, 4, AIML, [AIDS]),
            ("CS3501", "Theory of Computation",             5, 3, SCA,  [CSE]),
            ("AD3501", "Natural Language Processing",       5, 3, AIML, [AIDS]),
            ("CS3301", "Operating Systems",                 3, 3, SCA,  [CSE, IT]),
            ("IT3301", "Database Systems",                  3, 3, DSA,  [IT]),
        ]

        courses = {}
        for code, name, sem, credits, domain, dept_list in raw:
            c, _ = Course.objects.update_or_create(
                code=code,
                defaults=dict(name=name, semester=sem, credits=credits, domain=domain, is_active=True),
            )
            c.departments.set(dept_list)
            courses[code] = c

        self.stdout.write(f"  Courses  : {len(courses)}")
        return courses

    # =========================================================================
    # 6. UNITS + TOPICS (syllabus)
    # =========================================================================
    def _seed_syllabus(self, courses):
        """Returns dict: course_code → list of Topic objects (ordered)."""
        from kgaps_creation.models import Unit, Topic

        # Full Anna-University-style syllabi for the 4 actively-taught courses
        syllabus_data = {
            # ── C Programming ─────────────────────────────────────────────
            "CS3251": [
                ("Introduction to Problem Solving and C", [
                    ("Problem Solving Concepts and Algorithms",       2, "Understand stepwise problem-solving and algorithm design."),
                    ("Structure of a C Program and Data Types",       2, "Identify C tokens, keywords, data types and the compilation process."),
                    ("Operators, Expressions and Input/Output",       2, "Evaluate expressions using arithmetic, relational and logical operators."),
                    ("Control Structures: if, switch, loops",          3, "Implement decision and iteration constructs for program flow."),
                ]),
                ("Arrays and Strings", [
                    ("One-Dimensional and Two-Dimensional Arrays",    3, "Declare, initialise and process single/multi-dimensional arrays."),
                    ("String Handling and Built-in Functions",         2, "Manipulate C strings using standard library functions."),
                    ("Sorting and Searching Algorithms",              3, "Implement linear search, binary search, bubble sort and selection sort."),
                ]),
                ("Functions and Recursion", [
                    ("Function Definition, Declaration and Calling",  2, "Design modular programs using user-defined functions."),
                    ("Parameter Passing: Call by Value and Reference", 2, "Distinguish between call-by-value and call-by-reference mechanisms."),
                    ("Recursive Functions and their Applications",    3, "Apply recursion to solve factorial, Fibonacci and tower of Hanoi problems."),
                    ("Storage Classes: auto, register, static, extern",2, "Explain variable scope and lifetime using storage classes."),
                ]),
                ("Pointers and Structures", [
                    ("Pointer Concepts and Pointer Arithmetic",       3, "Manipulate memory using pointers and pointer arithmetic."),
                    ("Pointers and Arrays, Functions with Pointers",  2, "Implement arrays via pointers and pass arrays to functions."),
                    ("Structure and Union: Definition and Usage",     3, "Model real-world entities using structures and unions."),
                    ("Pointer to Structure, Self-Referential Structure",2,"Use pointer-to-struct and build linked lists with self-referential structs."),
                ]),
                ("File Handling and Preprocessor", [
                    ("File Operations: Open, Read, Write, Close",     3, "Perform sequential and random file I/O using C standard library."),
                    ("Command-Line Arguments",                         1, "Parse command-line arguments in main()."),
                    ("Preprocessor Directives: #define, #include, Macros", 2, "Use macros and conditional compilation for portable code."),
                    ("Dynamic Memory Allocation: malloc, calloc, realloc, free", 2, "Manage heap memory using dynamic allocation functions."),
                ]),
            ],

            # ── Neural Networks & Deep Learning ───────────────────────────
            "AD3401": [
                ("Foundations of Neural Networks", [
                    ("Biological Neuron to Artificial Neuron Model",   2, "Relate biological neural computation to the McCulloch-Pitts model."),
                    ("Perceptron: Architecture, Learning Rule",        3, "Train a single-layer perceptron and explain convergence."),
                    ("Multi-Layer Perceptron (MLP) and Backpropagation",3, "Implement backpropagation and analyse gradient descent."),
                    ("Activation Functions and Weight Initialisation", 2, "Compare sigmoid, ReLU, tanh and justify weight-initialisation strategies."),
                ]),
                ("Convolutional Neural Networks", [
                    ("Convolution Operation, Filters and Feature Maps", 3, "Describe convolution, pooling and receptive field in CNNs."),
                    ("CNN Architectures: LeNet, AlexNet, VGG, ResNet",  3, "Evaluate landmark CNN architectures and their design choices."),
                    ("Transfer Learning and Fine-Tuning",               2, "Apply pre-trained CNNs to domain-specific image classification tasks."),
                    ("Regularisation: Dropout, Batch Normalisation",    2, "Mitigate overfitting using dropout and batch normalisation."),
                ]),
                ("Recurrent Neural Networks", [
                    ("Sequence Modelling and Vanilla RNN",             2, "Model sequential data and explain vanishing gradient in RNNs."),
                    ("LSTM: Cell State, Gates and Equations",          3, "Explain LSTM gating mechanism and train on time-series data."),
                    ("GRU and Bidirectional RNNs",                     2, "Contrast GRU with LSTM and apply bidirectional processing."),
                    ("Applications: Sentiment Analysis, Text Generation",2,"Implement RNN-based NLP applications."),
                ]),
                ("Generative Models", [
                    ("Autoencoders: Vanilla and Variational",          3, "Build autoencoders for dimensionality reduction and generation."),
                    ("Generative Adversarial Networks (GAN)",          3, "Train GANs and analyse mode collapse and training instability."),
                    ("Diffusion Models: Concepts and Applications",    2, "Describe denoising diffusion probabilistic models at a conceptual level."),
                ]),
                ("Transformers and Advanced Topics", [
                    ("Attention Mechanism and Self-Attention",          3, "Derive the scaled dot-product attention formula."),
                    ("Transformer Architecture: Encoder–Decoder",       3, "Explain transformer components and positional encoding."),
                    ("BERT, GPT and Foundation Models",                 2, "Distinguish pre-training objectives of BERT and GPT family models."),
                    ("Ethical AI and Responsible Deployment",           2, "Analyse bias, fairness and explainability in deployed deep learning systems."),
                ]),
            ],

            # ── Algorithms ────────────────────────────────────────────────
            "CS3401": [
                ("Algorithmic Analysis", [
                    ("Performance Analysis: Time and Space Complexity",  2, "Compute time/space complexity using asymptotic notation."),
                    ("Asymptotic Notation: Big-O, Omega, Theta",         2, "Apply O/Ω/Θ to characterise algorithm efficiency."),
                    ("Recurrence Relations and Master Theorem",           3, "Solve recurrences using substitution and master theorem."),
                ]),
                ("Divide and Conquer", [
                    ("Binary Search and Merge Sort",                      2, "Implement and analyse binary search and merge sort."),
                    ("Quick Sort: Partitioning and Randomisation",        3, "Implement quick sort and analyse its average-case performance."),
                    ("Strassen's Matrix Multiplication",                  2, "Apply divide and conquer to matrix multiplication."),
                    ("Closest Pair of Points Problem",                    2, "Solve closest-pair problem using D&C paradigm."),
                ]),
                ("Dynamic Programming", [
                    ("Principle of Optimality and Memoisation",          2, "Explain overlapping subproblems and optimal substructure."),
                    ("Matrix Chain Multiplication",                       3, "Compute optimal parenthesisation using DP."),
                    ("Longest Common Subsequence and Edit Distance",      3, "Implement LCS and edit-distance DP solutions."),
                    ("0/1 Knapsack and Coin Change Problems",            2, "Solve 0/1 knapsack using DP table."),
                ]),
                ("Greedy Algorithms and Graph Algorithms", [
                    ("Greedy Strategy: Activity Selection, Huffman Coding",2,"Apply greedy technique to scheduling and compression problems."),
                    ("Minimum Spanning Tree: Kruskal's and Prim's",       3, "Implement Kruskal's and Prim's algorithms with proof of correctness."),
                    ("Shortest Paths: Dijkstra's and Bellman-Ford",       3, "Find single-source shortest paths in weighted graphs."),
                    ("All-Pairs Shortest Path: Floyd–Warshall",           2, "Apply Floyd–Warshall for all-pairs shortest paths."),
                ]),
                ("Backtracking, Branch & Bound and NP", [
                    ("Backtracking: N-Queens and Graph Colouring",        3, "Implement backtracking for constraint satisfaction problems."),
                    ("Branch and Bound: Travelling Salesman Problem",     3, "Apply branch-and-bound to the TSP."),
                    ("P, NP, NP-Hard and NP-Complete Classes",            2, "Classify computational problems into complexity classes."),
                    ("Approximation Algorithms",                           2, "Design 2-approximation for vertex cover and TSP."),
                ]),
            ],

            # ── Computer Networks ─────────────────────────────────────────
            "IT3401": [
                ("Network Architecture and Physical Layer", [
                    ("Network Models: OSI and TCP/IP Reference Models",  2, "Compare OSI and TCP/IP layers and their respective functions."),
                    ("Transmission Media: Guided and Unguided",           2, "Evaluate bandwidth and attenuation of various transmission media."),
                    ("Encoding and Modulation Techniques",                2, "Explain NRZ, Manchester encoding and frequency/amplitude modulation."),
                ]),
                ("Data Link Layer", [
                    ("Framing, Error Detection: CRC and Checksum",        3, "Implement CRC error detection and evaluate checksum."),
                    ("ARQ Protocols: Stop-and-Wait, Go-Back-N, SR",       3, "Contrast sliding window ARQ protocols and calculate throughput."),
                    ("Ethernet and IEEE 802.3: CSMA/CD",                  2, "Explain collision detection and backoff in Ethernet."),
                    ("Switching: Circuit, Packet, and Virtual Circuit",   2, "Compare switching paradigms and their use cases."),
                ]),
                ("Network Layer", [
                    ("IPv4 Addressing and Subnetting",                    3, "Design subnet schemes and calculate CIDR blocks."),
                    ("Routing Algorithms: RIP, OSPF, BGP",                3, "Explain DV and LS routing and configure basic routing protocols."),
                    ("IP Fragmentation, IPv6 and ICMPv6",                 2, "Describe IPv6 addressing and transition mechanisms."),
                ]),
                ("Transport and Application Layer", [
                    ("UDP: Connectionless Communication",                  2, "Explain UDP header fields and use cases."),
                    ("TCP: Connection Management, Flow and Congestion Control",3,"Analyse TCP three-way handshake and congestion avoidance."),
                    ("DNS, HTTP/HTTPS, SMTP and FTP",                     3, "Trace request-response cycles of key application-layer protocols."),
                ]),
                ("Network Security", [
                    ("Cryptography: Symmetric and Asymmetric",            3, "Implement encryption/decryption using AES and RSA concepts."),
                    ("TLS/SSL, Digital Signatures and Certificates",      2, "Describe the TLS handshake and PKI chain of trust."),
                    ("Firewalls, IDS/IPS and VPN",                        2, "Configure packet-filter firewall rules and explain VPN tunnelling."),
                    ("Network Attacks and Mitigation Strategies",         2, "Identify common network attacks and appropriate countermeasures."),
                ]),
            ],
        }

        topic_store = {}  # code → [Topic, ...]
        unit_count  = 0
        topic_count = 0

        for code, units in syllabus_data.items():
            course = courses[code]
            topic_store[code] = []
            for u_idx, (u_title, topics) in enumerate(units, start=1):
                unit, _ = Unit.objects.update_or_create(
                    course=course, unit_number=u_idx,
                    defaults=dict(title=u_title),
                )
                unit_count += 1
                for t_idx, (t_title, hours, outcome) in enumerate(topics, start=1):
                    t, _ = Topic.objects.update_or_create(
                        unit=unit, order=t_idx,
                        defaults=dict(
                            topic_title=t_title,
                            planned_hours=Decimal(str(hours)),
                            learning_outcome=outcome,
                        ),
                    )
                    topic_store[code].append(t)
                    topic_count += 1

        self.stdout.write(f"  Units    : {unit_count}  |  Topics : {topic_count}")
        return topic_store

    # =========================================================================
    # 7. COURSE ASSIGNMENTS
    # =========================================================================
    def _seed_course_assignments(self, users, courses):
        from courses.models import CourseAssignment

        # (faculty_key, course_code, section, semester)
        specs = [
            # AI&DS
            ("samikssha",   "CS3251", "A", 2),
            ("deepa",       "AD3401", "A", 4),
            ("rajesh",      "CS3401", "A", 4),
            # CSE
            ("harini",      "CS3401", "A", 4),
            ("karthikeyan", "IT3401", "A", 4),
            ("meenakshi",   "CS3402", "A", 4),
            # IT
            ("akilan",      "IT3401", "A", 4),
            ("preethi",     "CS3402", "A", 4),
            ("suresh",      "CS3251", "A", 2),
        ]

        ca_map = {}
        for fkey, ccode, sec, sem in specs:
            ca, _ = CourseAssignment.objects.update_or_create(
                faculty=users[fkey],
                course=courses[ccode],
                section=sec,
                academic_year=ACADEMIC_YEAR,
                defaults=dict(semester=sem),
            )
            ca_map[f"{fkey}_{ccode}"] = ca

        self.stdout.write(f"  CourseAssignments: {len(ca_map)}")
        return ca_map

    # =========================================================================
    # 8. TIMETABLES  (conflict-free schedule for all 9 faculty)
    # =========================================================================
    def _seed_timetables(self, ca_map, periods):
        from scheduler.models import Timetable, TimetableSlot

        # key: (faculty_key, course_code)  → list of (DAY, period_key)
        schedule = {
            ("samikssha",   "CS3251"): [("MON","P1"),("MON","P3"),("WED","P2"),("FRI","P4")],
            ("deepa",       "AD3401"): [("TUE","P1"),("TUE","P3"),("THU","P2"),("FRI","P5")],
            ("rajesh",      "CS3401"): [("MON","P4"),("WED","P3"),("THU","P4"),("FRI","P2")],
            ("harini",      "CS3401"): [("MON","P2"),("TUE","P5"),("WED","P1"),("FRI","P1")],
            ("karthikeyan", "IT3401"): [("MON","P5"),("THU","P1"),("FRI","P6")],
            ("meenakshi",   "CS3402"): [("TUE","P2"),("WED","P5"),("FRI","P7")],
            ("akilan",      "IT3401"): [("TUE","P6"),("WED","P7"),("FRI","P8")],
            ("preethi",     "CS3402"): [("MON","P7"),("THU","P3"),("THU","P7")],
            ("suresh",      "CS3251"): [("TUE","P8"),("WED","P8"),("THU","P8"),("FRI","P3")],
        }

        rooms = {
            "samikssha":   "AIDS-101", "deepa":       "AIDS-102",
            "rajesh":      "AIDS-103", "harini":      "CSE-201",
            "karthikeyan": "CSE-202",  "meenakshi":   "CSE-203",
            "akilan":      "IT-301",   "preethi":     "IT-302",
            "suresh":      "IT-303",
        }

        tt_map = {}
        for (fkey, ccode), slots in schedule.items():
            ca  = ca_map[f"{fkey}_{ccode}"]
            tt, _ = Timetable.objects.update_or_create(
                course_assignment=ca, defaults=dict(is_active=True)
            )
            tt_map[f"{fkey}_{ccode}"] = tt
            for day, pkey in slots:
                TimetableSlot.objects.update_or_create(
                    timetable=tt, day_of_week=day, period=periods[pkey],
                    defaults=dict(room=rooms[fkey]),
                )

        self.stdout.write(f"  Timetables: {len(tt_map)}  |  Slots: {sum(len(v) for v in schedule.values())}")
        return tt_map

    # =========================================================================
    # 9. MATERIALS
    # =========================================================================
    def _seed_materials(self, syllabus, users):
        from kgaps_creation.models import Material, MaterialVerification

        # For each of the 4 main courses add 2 materials per unit
        mat_specs = {
            "CS3251": (users["samikssha"], users["lavanya"]),
            "AD3401": (users["deepa"],     users["anand"]),
            "CS3401": (users["rajesh"],    users["lavanya"]),
            "IT3401": (users["karthikeyan"],users["divya"]),
        }

        mat_count  = 0
        ver_count  = 0
        unit_seen: dict = {}

        for code, (uploader, verifier) in mat_specs.items():
            for topic in syllabus.get(code, []):
                unit = topic.unit
                key  = (code, unit.id)
                if key in unit_seen:
                    continue            # one material set per unit
                unit_seen[key] = True

                # PPT for unit
                m_ppt, _ = Material.objects.update_or_create(
                    topic=topic,
                    title=f"Unit {unit.unit_number} Slides — {unit.title}",
                    defaults=dict(
                        uploaded_by=uploader,
                        material_type="PPT",
                        external_url="https://drive.google.com/demo-slides",
                    ),
                )
                # Notes for unit
                m_note, _ = Material.objects.update_or_create(
                    topic=topic,
                    title=f"Unit {unit.unit_number} Notes — {unit.title}",
                    defaults=dict(
                        uploaded_by=uploader,
                        material_type="NOTES",
                        external_url="https://drive.google.com/demo-notes",
                    ),
                )

                # Verification for PPT (approved) and Notes (pending)
                statuses = [("APPROVED", m_ppt), ("PENDING", m_note)]
                for status, mat in statuses:
                    MaterialVerification.objects.update_or_create(
                        material=mat,
                        defaults=dict(
                            verified_by=verifier if status == "APPROVED" else None,
                            status=status,
                            remarks="Looks comprehensive and well-structured." if status == "APPROVED" else "",
                        ),
                    )
                    ver_count += 1
                mat_count += 2

        self.stdout.write(f"  Materials: {mat_count}  |  Verifications: {ver_count}")

    # =========================================================================
    # 10. DAILY ENTRIES  (5 weeks of realistic entries for 3 faculty)
    # =========================================================================
    def _seed_daily_entries(self, tt_map, syllabus, users, ca_map):
        from scheduler.models import TimetableSlot, DailyEntry
        from kgaps_handling.models import TopicHandling

        # Map faculty→(ca_key, topics list)
        active = {
            "samikssha":   ("samikssha_CS3251", syllabus.get("CS3251", [])),
            "deepa":       ("deepa_AD3401",     syllabus.get("AD3401", [])),
            "harini":      ("harini_CS3401",     syllabus.get("CS3401", [])),
        }

        # Academic-year even-sem start: 2026-02-02 (Monday)
        start = datetime.date(2026, 2, 2)
        today = datetime.date(2026, 3, 6)   # current date (seed reference)

        # Build working days list between start and today (Mon-Fri only)
        working_days = []
        d = start
        while d <= today:
            if d.weekday() < 5:      # 0=Mon … 4=Fri
                working_days.append(d)
            d += datetime.timedelta(days=1)

        day_abbr = ["MON", "TUE", "WED", "THU", "FRI"]
        entry_count = 0

        for fkey, (ca_key, topics) in active.items():
            if not topics:
                continue
            ca  = ca_map.get(ca_key)
            tt  = tt_map.get(ca_key)
            if not ca or not tt:
                continue

            slots = list(tt.slots.select_related("period").all())
            topic_idx = 0  # walk through topics chronologically

            for date in working_days:
                dow = day_abbr[date.weekday()]
                day_slots = [s for s in slots if s.day_of_week == dow]
                for slot in day_slots:
                    if topic_idx >= len(topics):
                        break
                    topic = topics[topic_idx]
                    # Roughly one topic per 2 class sessions to simulate realistic pace
                    # Advance topic every 2 entries
                    if entry_count % 2 == 1:
                        topic_idx = min(topic_idx + 1, len(topics) - 1)

                    de, created = DailyEntry.objects.get_or_create(
                        timetable_slot=slot,
                        topic=topic,
                        faculty=users[fkey],
                        course_assignment=ca,
                        date=date,
                        defaults=dict(hours_conducted=Decimal("1.0"), is_extra_class=False),
                    )
                    if created:
                        # Create corresponding TopicHandling
                        TopicHandling.objects.get_or_create(
                            topic=topic,
                            faculty=users[fkey],
                            course_assignment=ca,
                            date=date,
                            defaults=dict(
                                hours_handled=Decimal("1.0"),
                                is_auto_generated=True,
                                notes="",
                            ),
                        )
                        entry_count += 1

        self.stdout.write(f"  DailyEntries: {entry_count}")

    # =========================================================================
    # 11. FACULTY APPRAISAL
    # =========================================================================
    def _seed_appraisal(self, users, depts):
        from faculty_appraisal.models import (
            AppraisalTemplate, AppraisalCriteria,
            AppraisalSubmission, CriteriaScore,
        )
        import datetime

        # ── Institution-wide template 2025-26 ──────────────────────────────
        tmpl, _ = AppraisalTemplate.objects.update_or_create(
            title="Annual Faculty Self-Appraisal 2025–26",
            academic_year="2025-26",
            defaults=dict(
                description=(
                    "End-of-year self-appraisal for all teaching staff as per "
                    "Anna University norms. Scored out of 100."
                ),
                department=None,   # institution-wide
                deadline=datetime.date(2026, 5, 31),
                is_active=True,
                created_by=users["balaji"],
            ),
        )

        criteria_raw = [
            (1,  "Teaching Quality & Student Feedback",     15, "Average student feedback score (scaled), peer review and quality of course delivery."),
            (2,  "Syllabus Coverage & Course Completion",   10, "Percentage of syllabus covered as per lesson plan and completion of prescribed topics."),
            (3,  "Research, Publications & Projects",       15, "Number of journal/conference publications, patents, funded projects and citations."),
            (4,  "Student Academic Outcomes",                10, "Pass percentage, average marks, number of distinctions in end-semester examinations."),
            (5,  "Student Mentoring & Career Guidance",     10, "Hours spent on mentoring, placement guidance, internship facilitation and counselling."),
            (6,  "Industry Interaction & Value-Added Courses",10,"Industry visits, guest lectures organised, certification courses conducted/completed."),
            (7,  "Professional Development",                10, "FDPs, workshops, online certifications and conference participation as attendee."),
            (8,  "Administrative & Department Activities",  10, "Contribution to IQAC, NBA/NAAC, committees and department development activities."),
            (9,  "Co-curricular & Extra-curricular",         5, "Student club mentoring, sports, cultural activities and institutional representation."),
            (10, "Attendance & Punctuality",                 5, "Faculty OD, leave record, class commencement punctuality."),
        ]

        criteria_objs = []
        for order, title, max_score, desc in criteria_raw:
            c, _ = AppraisalCriteria.objects.update_or_create(
                template=tmpl, order=order,
                defaults=dict(title=title, max_score=max_score, description=desc),
            )
            criteria_objs.append(c)

        # ── Dept-level template for AI&DS ──────────────────────────────────
        tmpl_aids, _ = AppraisalTemplate.objects.update_or_create(
            title="AI&DS Department Mini-Review 2025–26",
            academic_year="2025-26",
            defaults=dict(
                description="Supplementary appraisal focusing on AI/ML research and lab work.",
                department=depts["AI&DS"],
                deadline=datetime.date(2026, 4, 30),
                is_active=True,
                created_by=users["vinu"],
            ),
        )
        mini_criteria_raw = [
            (1, "AI/ML Research Contribution",     20, "Publications and ongoing research in AI/ML."),
            (2, "Lab Course Preparation",           20, "Lab manuals, experiment sheets and student project guidance."),
            (3, "Industry Certification & Tools",  20, "AWS, GCP, NVIDIA, Coursera certifications relevant to AI&DS."),
            (4, "Student Project Mentoring",        20, "Mini-projects, final-year projects and hackathon guidance."),
            (5, "Lesson Plan Adherence",            20, "Alignment between lesson plan and actual teaching records."),
        ]
        mini_criteria = []
        for order, title, max_score, desc in mini_criteria_raw:
            c, _ = AppraisalCriteria.objects.update_or_create(
                template=tmpl_aids, order=order,
                defaults=dict(title=title, max_score=max_score, description=desc),
            )
            mini_criteria.append(c)

        # ── Submissions ────────────────────────────────────────────────────
        # (faculty_key, status, template, self_scores[], hod_scores[])
        submissions = [
            # Institution template — completed (Samikssha reviewed by Vinu)
            ("samikssha", "COMPLETED", tmpl, criteria_objs,
             [13, 9, 7,  8, 9, 8, 9, 7, 4, 5],
             [12, 8, 6,  8, 8, 7, 9, 7, 4, 5]),
            # Deepa submitted, awaiting HOD review
            ("deepa", "HOD_REVIEW", tmpl, criteria_objs,
             [14, 9, 11, 9, 8, 9, 8, 8, 4, 5], None),
            # Rajesh — draft
            ("rajesh", "DRAFT", tmpl, criteria_objs,
             [12, 8, 9,  7, 7, 7, 8, 6, 3, 5], None),
            # AI&DS mini — Samikssha completed
            ("samikssha", "COMPLETED", tmpl_aids, mini_criteria,
             [17, 16, 14, 15, 18],
             [16, 15, 13, 14, 17]),
        ]

        sub_count   = 0
        score_count = 0

        for fkey, status, template, crit_list, self_scores, hod_scores in submissions:
            sub, _ = AppraisalSubmission.objects.update_or_create(
                template=template, faculty=users[fkey],
                defaults=dict(
                    status=status,
                    self_remarks="Dedicated efforts throughout the academic year with consistent student engagement.",
                    hod_remarks="Satisfactory performance. Encouraged to enhance research output." if status == "COMPLETED" else "",
                    reviewed_by=users["vinu"] if status == "COMPLETED" else None,
                    submitted_at=timezone.now() if status in ("SUBMITTED","HOD_REVIEW","COMPLETED") else None,
                    reviewed_at=timezone.now() if status == "COMPLETED" else None,
                ),
            )
            sub_count += 1
            for idx, crit in enumerate(crit_list):
                ss = self_scores[idx] if self_scores else None
                hs = (hod_scores[idx] if hod_scores else None) if status == "COMPLETED" else None
                CriteriaScore.objects.update_or_create(
                    submission=sub, criteria=crit,
                    defaults=dict(
                        self_score=ss,
                        hod_score=hs,
                        self_comment="Good progress this semester.",
                        hod_comment="Agreed." if hs else "",
                    ),
                )
                score_count += 1

        self.stdout.write(f"  AppraisalTemplates: 2  |  Submissions: {sub_count}  |  Scores: {score_count}")

    # =========================================================================
    # 12. TASKS
    # =========================================================================
    def _seed_tasks(self, users, depts):
        from task_management.models import Task, TaskAssignment, SubTask, TaskComment
        import datetime

        admin  = users["balaji"]
        today  = datetime.date(2026, 3, 6)

        task_specs = [
            # (title, desc, priority, status, due_delta_days, dept_code, assignees, subtasks)
            (
                "NAAC Self-Study Report 2026 Submission",
                "Compile all department-level criterion data for NAAC SSR submission. "
                "Faculty to provide supporting documents for teaching-learning quality.",
                "CRITICAL", "IN_PROGRESS", 30, None,
                ["vinu", "srishanth", "santhosh", "samikssha", "harini"],
                ["Collect faculty profiles and publications",
                 "Prepare student feedback analysis report",
                 "Compile infrastructural data",
                 "Final review and submission by principal"],
            ),
            (
                "Even Semester Lesson Plan Submission",
                "All faculty must submit detailed lesson plans for Even Semester 2025-26 "
                "courses by the stipulated deadline.",
                "HIGH", "IN_PROGRESS", 7, None,
                ["samikssha", "deepa", "rajesh", "harini", "karthikeyan",
                 "meenakshi", "akilan", "preethi", "suresh"],
                ["Download prescribed lesson plan format",
                 "Fill unit-wise topic plan with hours",
                 "Submit to respective HOD for approval"],
            ),
            (
                "NBA CO-PO Attainment Data Collection",
                "Collect course outcomes vs programme outcomes attainment data for all "
                "Even Semester courses for NBA accreditation preparation.",
                "HIGH", "OPEN", 45, None,
                ["vinu", "srishanth", "santhosh"],
                ["Prepare CO-PO mapping sheet",
                 "Collect CIA marks and map to COs",
                 "Calculate attainment levels",
                 "Review with HOD"],
            ),
            (
                "AI&DS Lab Software Environment Setup",
                "Ensure all AI&DS lab systems have Python 3.11, TensorFlow 2.x, "
                "PyTorch 2.x, Jupyter and required libraries installed.",
                "MEDIUM", "COMPLETED", -5, "AI&DS",
                ["samikssha", "deepa", "rajesh"],
                ["Audit existing lab software",
                 "Create requirements.txt for all courses",
                 "Test GPU drivers on DL workstations"],
            ),
            (
                "End-Semester Examination Duty Allocation",
                "Prepare and communicate invigilation duty rosters for the upcoming "
                "April 2026 end-semester examinations.",
                "HIGH", "OPEN", 25, None,
                ["vinu", "srishanth", "santhosh"],
                ["Collect faculty availability forms",
                 "Draft duty roster",
                 "Circulate and collect acknowledgements"],
            ),
            (
                "Faculty Development Programme — Deep Learning",
                "Organise a 3-day FDP on Deep Learning and Transformer Architectures "
                "for AI&DS and CSE faculty.",
                "MEDIUM", "OPEN", 60, "AI&DS",
                ["vinu", "anand", "deepa"],
                ["Identify resource persons",
                 "Book venue and fix dates",
                 "Send invitations and registrations",
                 "Prepare participant certificates"],
            ),
            (
                "Student Project Mid-Review Completion",
                "Conduct and record mid-semester project reviews for all final-year "
                "students before the mid-review deadline.",
                "MEDIUM", "IN_PROGRESS", 14, None,
                ["rajesh", "harini", "akilan"],
                ["Schedule review slots", "Conduct reviews", "Upload marks to portal"],
            ),
            (
                "Alumni Meet Coordination 2026",
                "Coordinate the annual alumni meet scheduled for April 2026. "
                "Faculty advisors to liaise with the alumni association.",
                "LOW", "OPEN", 55, None,
                ["meenakshi", "preethi", "suresh"],
                ["Send save-the-date to alumni", "Book venue", "Prepare event agenda"],
            ),
        ]

        task_count   = 0
        assign_count = 0
        sub_count    = 0

        for (title, desc, priority, status, due_delta, dept_code,
             assignees, subtasks) in task_specs:

            dept_obj = depts.get(dept_code) if dept_code else None
            due_date = today + datetime.timedelta(days=due_delta)

            task, _ = Task.objects.update_or_create(
                title=title,
                defaults=dict(
                    description=desc,
                    priority=priority,
                    status=status,
                    due_date=due_date,
                    department=dept_obj,
                    created_by=admin,
                ),
            )
            task_count += 1

            for akey in assignees:
                ta, _ = TaskAssignment.objects.update_or_create(
                    task=task, assignee=users[akey],
                    defaults=dict(
                        assigned_by=admin,
                        status="COMPLETED" if status == "COMPLETED" else "ACCEPTED",
                    ),
                )
                assign_count += 1

            for s_idx, s_title in enumerate(subtasks):
                done = status == "COMPLETED"
                SubTask.objects.update_or_create(
                    task=task, title=s_title,
                    defaults=dict(
                        is_done=done,
                        assigned_to=users[assignees[0]] if assignees else None,
                        created_by=admin,
                        order=s_idx,
                    ),
                )
                sub_count += 1

            # Add a comment from HOD on high/critical tasks
            if priority in ("CRITICAL", "HIGH") and assignees:
                TaskComment.objects.update_or_create(
                    task=task,
                    author=users[assignees[0]],
                    defaults=dict(
                        content="Acknowledged. Will coordinate with team and update status.",
                    ),
                )

        self.stdout.write(f"  Tasks: {task_count}  |  Assignments: {assign_count}  |  Subtasks: {sub_count}")

    # =========================================================================
    # 13. ASSIGNMENT TRACKERS
    # =========================================================================
    def _seed_assignment_trackers(self, ca_map):
        from kgaps_handling.models import AssignmentTracker

        tracker_specs = [
            # (ca_key, [(title, sheet_url, pct)])
            ("samikssha_CS3251", [
                ("Assignment 1 – C Basics & Operators",       "https://docs.google.com/spreadsheets/d/demo-samikssha-1", Decimal("82.50")),
                ("Assignment 2 – Arrays and Strings",         "https://docs.google.com/spreadsheets/d/demo-samikssha-2", Decimal("67.00")),
            ]),
            ("deepa_AD3401", [
                ("Assignment 1 – MLP Implementation",         "https://docs.google.com/spreadsheets/d/demo-deepa-1",     Decimal("91.00")),
                ("Assignment 2 – CNN Architecture Report",    "https://docs.google.com/spreadsheets/d/demo-deepa-2",     Decimal("54.50")),
            ]),
            ("rajesh_CS3401", [
                ("Assignment 1 – Complexity Analysis",        "https://docs.google.com/spreadsheets/d/demo-rajesh-1",    Decimal("76.00")),
            ]),
            ("harini_CS3401", [
                ("Assignment 1 – Divide and Conquer Problems","https://docs.google.com/spreadsheets/d/demo-harini-1",    Decimal("88.00")),
                ("Assignment 2 – DP Table Solutions",         "https://docs.google.com/spreadsheets/d/demo-harini-2",    Decimal("70.00")),
            ]),
            ("karthikeyan_IT3401", [
                ("Assignment 1 – OSI Layer Analysis",         "https://docs.google.com/spreadsheets/d/demo-karthik-1",   Decimal("79.50")),
            ]),
            ("akilan_IT3401", [
                ("Assignment 1 – Subnetting Worksheet",       "https://docs.google.com/spreadsheets/d/demo-akilan-1",    Decimal("65.00")),
            ]),
        ]

        count = 0
        for ca_key, entries in tracker_specs:
            ca = ca_map.get(ca_key)
            if not ca:
                continue
            for title, url, pct in entries:
                AssignmentTracker.objects.update_or_create(
                    course_assignment=ca, title=title,
                    defaults=dict(sheet_url=url, completion_pct=pct),
                )
                count += 1

        self.stdout.write(f"  AssignmentTrackers: {count}")

    # =========================================================================
    # 14. COURSE RESULTS
    # =========================================================================
    def _seed_course_results(self, ca_map, users):
        from kgaps_handling.models import CourseResult

        # Only previous semester / completed assignments have results
        result_specs = [
            # Odd sem 2024-25 results (historically seeded as reference)
            # Using same CA objects for even sem — mark as remarks "Previous semester reference"
            ("samikssha_CS3251", "https://drive.google.com/demo-result-samikssha", Decimal("86.40"), users["samikssha"],
             "Good pass rate. 5 students failed due to absenteeism."),
            ("harini_CS3401",    "https://drive.google.com/demo-result-harini",    Decimal("79.20"), users["harini"],
             "Above average. Two students with outstanding performance."),
            ("karthikeyan_IT3401","https://drive.google.com/demo-result-karthikeyan",Decimal("83.00"),users["karthikeyan"],
             "Satisfactory. Lab component scores improved overall pass percentage."),
        ]

        count = 0
        for ca_key, url, pct, uploader, remarks in result_specs:
            ca = ca_map.get(ca_key)
            if not ca:
                continue
            CourseResult.objects.update_or_create(
                course_assignment=ca,
                defaults=dict(
                    result_sheet_url=url,
                    pass_percentage=pct,
                    remarks=remarks,
                    uploaded_by=uploader,
                ),
            )
            count += 1

        self.stdout.write(f"  CourseResults: {count}")
