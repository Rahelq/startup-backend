### Addis Ababa Science and Technology University
College of Engineering
Department of Software Engineering
Capstone Project Documentation
```
Title: StartupConnect Ethiopia – A Platform Linking
```
Startups and Investors
Group Members
No Name SEC ID
1. Blien Moges B ETS0398/14
2. Etsub Girma B ETS0563/14
3. Eyerusalem Rufael B ETS0572/14
4. Eyerusalem Kidane B ETS0574/14
5. Rahel Belay D ETS1330/14
```
Advisor: Abdurehman D.
```
```
Signature:__________________
```
Acknowledgement
First and foremost, we would like to express our sincere gratitude to Mr. Abdurehman Dawud for
his constructive criticism and continuous guidance throughout the development of this document.
We also extend our appreciation to Minab Technologies, Kuraz Technologies, and IE Networks
for their cooperation and willingness to share their expertise. The insights provided through
interviews with these organizations were invaluable
1
Table of Content
Acknowledgement 1
List of Abbreviations, Symbols, and Specialized Nomenclature 5
List of Tables and Figures 5
List of Figures 5
List of Tables 7
Abstract 11
Chapter One: Introduction 12
1.1 Introduction 12
1.2 Statement of the Problem 12
1.2.1 Existing System 12
1.2.2 Major Problems of the Existing System 13
1.2.3 Proposed System 14
1.2.4 Advantages of the Proposed System 14
1.3 Motivation 15
1.4 Scope and Limitation of the Project 15
1.4.1 Scope of the Project 15
1.4.2 Limitation of the Project 16
1.5 Objective 16
1.5.1 General Objective 16
1.5.2 Specific Objectives 17
1.6 Methodology 17
1.6.1 Data Collection Methodology 17
1.6.2 System Design and Analysis Tools 17
1.6.3 Data Modeling 17
1.6.4 System Development Tools 17
1.6.5 Testing 18
1.7 Significance of the Project 18
1.8 Project Schedule 18
```
Phase 1: Project Initiation and Research (Month 1) 18
```
```
Phase 2: Requirement Analysis (Month 2) 19
```
```
Phase 3: System Design (Month 3) 19
```
```
Phase 4: System Development (Months 4–6) 19
```
```
Phase 5: Testing and Evaluation (Month 7) 20
```
```
Phase 6: Documentation and Final Presentation (Month 8) 20
```
CHAPTER TWO: LITERATURE REVIEW 22
2.1 Introduction 22
2.2 Digital Startup Ecosystems and Key Actors 22
2.3 Empirical Studies on the Ethiopian Ecosystem 22
```
2.3.1 JICA & MInT Startup Ecosystem Report (2023) 22
```
2.3.2 Cenfri’s Guidance on Startup Support in Ethiopia 23
```
2.3.3 BIC Africa’s ESO Ecosystem Mapping (2022/23) 23
```
2.3.4 Dealroom / RISA / GrowthAfrica Report State of Startup Innovation in Ethiopia 23
2
```
2.3.5 EdTech Financing Challenges (Shega) 24
```
2.4 International and Technological Models for Platform Design 24
2.4.1 Global Platform Examples 24
2.4.2 AI, Matching, and Mentorship Research 25
2.5 Digital Finance Integration and the Evolving Ethiopian Context 27
2.5.1. Infrastructure and Access Constraints 27
2.5.2. Regulatory Transformation and the Pathway to Compliance 27
2.6 Gaps in Literature and Implications for StartupConnect Ethiopia 28
2.7 Strategic Synthesis and Operationalizing Startup Connect Ethiopia 29
2.8 Conceptual Framework 30
2.9 Summary 30
CHAPTER THREE: SYSTEM ANALYSIS AND MODELING 31
3.1 Overview 31
3.2 Scenario-Based Modeling 31
3.2.1 Use Case Identification 31
3.2.2 Actor Identification 38
3.3 use case diagram 40
3.3.2 Use Case Description 42
3.4 Activity Diagram 74
3.5 Behavioral/Dynamic Modeling 80
3.5.1 sequence diagram 80
3.6 Class Based Modeling 102
3.6.1 Identifying Classes 102
Table 3.61: List of Classes and Identifiers 103
3.6.2 Class Diagram 103
Chapter Four - System Design 104
4.1 Overview 104
4.2 System Design 104
4.2.1 Design Goal 105
4.3 System Decomposition 106
4.3.1 Overview of System Decomposition 106
4.3.2 High-Level System Decomposition 106
4.3.3 User Management Subsystem 108
4.3.3.1 User Registration Module 109
4.3.3.2 Profile Management Module 109
4.3.3.3 Role and Permission Management Module 109
4.3.4 Authentication and Authorization Subsystem 109
4.3.4.1 Authentication Module 110
4.3.4.2 Authorization and Access Control Module 110
4.3.5 Core Business Logic Subsystem 110
4.3.5.1 Request Processing Module 111
4.3.5.2 Workflow and Rule Management Module 111
4.3.5.3 Decision-Making Module 111
4.3.6 Data Management Subsystem 112
3
4.3.6.1 Database Access Module 112
4.3.6.2 Data Validation Module 112
4.3.6.3 Backup and Recovery Module 112
4.3.7 Communication and Integration Subsystem 113
4.3.7.1 API Management Module 113
4.3.7.2 External Service Integration Module 113
4.3.7.3 Error Handling and Logging Module 114
4.3.8 Reporting and Administration Subsystem 114
4.3.8.1 System Reporting Module 114
4.3.8.2 Monitoring and Audit Module 114
4.3.8.3 Administrative Control Module 115
4.4 Architecture of the System 115
4.4.1 Architectural Style 115
4.4.2 Architectural Pattern 116
4.5 Component Diagram 117
4.6 Deployment Diagram 118
4.7 Database Design 118
4.8 User Interface Design 120
References 121
4
List of Abbreviations, Symbols, and Specialized
Nomenclature
```
● ECMA (Ethiopian Capital Market Authority): The regulatory authority responsible for
```
overseeing capital market activities in Ethiopia.
```
● NBE (National Bank of Ethiopia): Ethiopia’s central bank, responsible for financial regulation,
```
including mobile money and digital finance directives.
```
● ESO (Entrepreneur Support Organization): Organizations such as incubators, accelerators,
```
and mentorship programs that support startups.
```
● DFS (Digital Financial Services): Financial services delivered through digital channels such as
```
mobile money platforms.
```
● SPV (Special Purpose Vehicle): A legal entity created to pool investments, referenced as a
```
benchmark model for capital aggregation.
●
```
● KPI (Key Performance Indicator): Metrics used to measure system usage, performance, and
```
ecosystem impact.
```
● SDG (Sustainable Development Goal): United Nations development goals.
```
List of Tables and Figures
List of Figures
```
Fig 1.1: StartupConnect Ethiopia: Project Schedule (Sep 2025–Apr 2026): Gantt chart of project
```
tasks and timeline. 21
Fig 3.1: Admin and Investor Use Case Diagram 40
Fig 3.2: Startup and Mentor Use Case Diagram 41
Fig 3.3: Activity Diagram for User Registration 75
Fig 3.4: Activity Diagram for Create and Publish Project 76
Fig 3.5: Activity Diagram for Apply to Investor 76
Fig 3.6: Activity Diagram for Review Investment Proposal 77
Fig 3.7: Activity Diagram for Process Investment Funding 78
Fig 3.8: Activity Diagram for Schedule Mentorship Session 79
5
Fig 3.9: Sequence Diagram for User Registration and Verification Process 83
Fig 3.10: Sequence Diagram for User Login 84
Fig 3.11: Sequence Diagram for Admin Login and Authentication 85
Fig 3.12: Sequence Diagram for Remove or Disable User Account 85
Fig 3.13: Sequence Diagram for Create Startup Project 86
Fig 3.14: Sequence Diagram for Update Startup Project 87
Fig 3.15: Sequence Diagram for Search Investors and Mentors 88
Fig 3.16: Sequence Diagram for Create Investment Portfolio 88
Fig 3.17: Sequence Diagram for AI Recommendation System 89
Fig 3.18: Sequence Diagram for Startup Owners Apply for Investment 90
Fig 3.19: Sequence Diagram for Investor Startup Discovery 91
Fig 3.20: Sequence Diagram for Chat & Negotiation Between Startup and Investor 92
Fig 3.21: Sequence Diagram for Investment Acceptance & Decision 93
Fig 3.22: Sequence Diagram for Investment Payment Processing 94
Fig 3.23: Sequence Diagram for Mentor Discovery 95
Fig 3.24: Sequence Diagram for Mentorship Request 95
Fig 3.25: Sequence Diagram for Mentor Approval / Rejection 96
Fig 3.26: Sequence Diagram for Mentorship Scheduling & Calendar Sync 97
Fig 3.27: Sequence Diagram for Provide Learning Resources 98
Fig 3.28: Sequence Diagram for Mentor Session Payment 99
Fig 3.29: Sequence Diagram for Notification & Real Time Updates 99
Fig 3.30: Sequence Diagram for Reports & Analytics Module 100
Fig 3.31: Sequence Diagram for Compliance, Audits & Security Logs 101
Fig 3.32: Sequence Diagram for Admin Monitoring & Management Process 102
Fig 3.33: Class Diagram of the Platform Entities 104
6
Fig 4.1: High-Level System Decomposition Diagram 108
```
Fig 4.2: Model-View-Controller (MVC) Architecture Diagram 117
```
Fig 4.3: Component Diagram 117
Fig 4.4: Deployment Diagram 118
Fig 4.5: Entity Relationship Diagram of the StartupConnect Ethiopia System 119
List of Tables
Table 3.1: Admin Use Case Identification List 34
Table 3.2: Investor Use Case Identification List 35
Table 3.3: Startup Use Case Identification List 36
Table 3.4: Mentor Use Case Identification List 37
Table 3.5: Use Case description for Admin Login & Authentication 38
Table 3.6: Use Case description for Reject User Accounts 44
Table 3.7: Use Case description for Approve User Accounts 45
Table 3.8: Use Case description for Remove User Accounts 45
Table 3.9: Use Case description for Search Users & Review Profiles 46
Table 3.10: Use Case description for Monitor System Activities 46
Table 3.11: Use Case description for Moderate Content & Posts 47
Table 3.12: Use Case description for Approve or Remove Startup Listing 47
Table 3.13: Use Case description for Oversee All Investments 48
Table 3.14: Use Case description for Review Payment Transactions 48
Table 3.15: Use Case description for Generate System Reports 49
Table 3.16: Use Case description for Perform System Maintenance 50
7
Table 3.17: Use Case description for Investor Registration & Login 50
Table 3.18: Use Case description for View Startup List 51
Table 3.19: Use Case description for Search and Filter Startups 51
Table 3.20: Use Case description for Receive AI Startup Recommendations 52
Table 3.21: Use Case description for Receive View Detailed Startup Profile 53
Table 3.22: Use Case description for Receive Send Funding Offer to Startup 53
Table 3.23 : Use Case description for Accept/Reject Funding Requests 54
Table 3.24 : Use Case description for Create Investment Portfolio 54
Table 3.25 : Use Case description for Cancel Investment Offer 55
Table 3.26: Use Case description for Payment Handling for Investments 56
Table 3.27 : Use Case description for Direct Chat With Startup 56
Table 3.28 : Use Case description for Join Video Meetings With Startup 57
Table 3.29: Use Case description for Provide Feedback to Startup 57
Table 3.30: Use Case description for View Investment Reports 58
Table 3.31: Use Case description for Startup Registration & Login 58
Table 3.32: Use Case description for Create Startup Project 59
Table 3.33: Use Case description for Upload Project Documents 60
Table 3.34: Use Case description for Update Project Progress 60
Table 3.35: Use Case description for Search Investors and Mentors 61
Table 3.36: Use Case description for AI Investor/Mentor Recommendations 61
Table 3.37: Use Case description for Apply for Investment 62
8
Table 3.38: Use Case description for Chat With Investors 62
Table 3.39: Use Case description for Participate in Video Meetings 63
Table 3.40: Use Case description for Track Investment Payments 64
Table 3.41: Use Case description for View Investor Feedback 64
Table 3.42: Use Case description for Request Mentorship 65
Table 3.43: Use Case description for Accept Mentor Offer 65
Table 3.44: Use Case description for Remove Mentor 66
Table 3.45: Use Case description for Chat With Mentor 66
Table 3.46: Use Case description for Join Mentor Video Sessions 67
Table 3.47: Use Case description for View Startup Status 67
Table 3.48: Use Case description for Mentor Registration & Login 68
Table 3.49: Use Case description for Accept or Reject Mentorship Request 68
Table 3.50: Use Case description for Send Mentorship Proposal 69
Table 3.51: Use Case description for View Startup Profiles 70
Table 3.52: Use Case description for Provide Learning Resources 70
Table 3.53: Use Case description for Schedule Mentorship Sessions 71
Table 3.54: Use Case description for Host Live Mentorship Video Session 71
Table 3.55: Use Case description for Chat With Startup 72
Table 3.56: Use Case description for Share Materials During Session 72
Table 3.57: Use Case description for Submit Mentorship Reports 73
Table 3.58: Use Case description for View Mentorship History 74
Table 3.59: Use Case description for Receive Mentorship Payments 75
9
Table 3.60: Use Case description for End Mentorship Engagement 76
Table 3.61: List of Classes and Identifiers 105
1011
Abstract
StartupConnect Ethiopia addresses the fragmented, informal, and trust-constrained startup
ecosystem in Ethiopia, where innovators face limited access to funding and mentorship while
investors lack a centralized and reliable mechanism for identifying credible startups. Many
youth- and university-led innovations stagnate at the idea or prototype stage due to low visibility,
weak support structures, and the absence of a context-aware digital ecosystem. To address this
challenge, the project adopts a mixed methodology involving a review of relevant literature and
platforms, stakeholder-driven requirement elicitation through surveys and interviews, and
systematic system modeling, followed by iterative development and user acceptance testing. The
resulting solution is a web- and mobile-based platform that supports verified user registration,
startup listing, investor and mentor discovery, structured communication, and reporting, with
integration of local digital payment systems and basic AI-assisted recommendation features.
Evaluation of the system design and prototype demonstrates that StartupConnect Ethiopia
effectively centralizes startup information, formalizes interactions among startups, investors, and
mentors, and reduces information asymmetry within the ecosystem. The platform provides a
scalable and locally relevant digital infrastructure that aligns with national digital transformation
initiatives and has the potential to enhance innovation-driven socio-economic development in
Ethiopia.
1213
Chapter One: Introduction
1.1 Introduction
Ethiopia is experiencing a period of rapid digital transformation, characterized by the emergence
of innovative young entrepreneurs who are developing creative solutions in diverse sectors such
as agriculture, finance, renewable energy, education, and health technology. Despite this
remarkable potential, a significant number of these startups fail to grow or sustain themselves.
The problem is not a lack of innovation or ambition but rather the absence of access, visibility,
and connection to the necessary support systems particularly investors and mentors.[5][7]
Simultaneously, both local and international investors are actively seeking viable startups across
Africa. However, they often encounter challenges in identifying credible and verified ventures in
Ethiopia due to the absence of a centralized database or digital ecosystem. The startup ecosystem
in Ethiopia is thus fragmented, informal, and underdeveloped, limiting the opportunities for
collaboration and growth. Mentors and professionals who are willing to guide and support
emerging entrepreneurs also struggle to find reliable platforms to connect with them.[7]
In response to these gaps, StartupConnect Ethiopia is proposed as a digital platform designed
to serve as a unifying ecosystem for startups, investors, and mentors. The platform goes beyond
simple networking it provides an organized, transparent, and trustworthy environment for
engagement, investment, and mentorship. Through this system:
● Startups can gain visibility, access funding, and obtain expert mentorship. [7].
● Investors can explore verified and data-backed startups for credible investment
opportunities.[5][4]
● Mentors can contribute to the development of new innovators and strengthen Ethiopia’s
digital economy.[5]
Ultimately, the platform aims to empower Ethiopian innovators, bridge the gap between
creativity and opportunity, and promote sustainable economic growth through entrepreneurship
and technology.
1.2 Statement of the Problem
1.2.1 Existing System
Currently, the startup ecosystem in Ethiopia functions largely through informal and fragmented
networks. Startups rely heavily on personal contacts, occasional pitch events, or social media
14
exposure to connect with investors and mentors. This approach is inefficient and excludes many
talented innovators who lack the necessary connections or resources.[5][7].
While global platforms such as AngelList, Gust, and SeedInvest have successfully linked
startups and investors in developed markets, these platforms are not well-suited for the Ethiopian
context. They often require complex regulatory compliance, are designed for mature markets,
and lack integration with local financial systems and languages. Consequently, Ethiopian startups
are left underserved and disconnected from global opportunities. [5][4]
1.2.2 Major Problems of the Existing System
Ethiopia is currently witnessing a strong wave of youth-driven innovation, particularly in the
technology and digital entrepreneurship sectors. Each year, hundreds of startups and
university-based projects emerge with creative solutions in education, agriculture, health, and
fintech. However, despite this growing enthusiasm and potential, many of these startups fail to
progress beyond the idea or prototype stage. The primary issue is not a shortage of innovation,
but rather the absence of structured support systems that provide funding, mentorship, visibility,
and legal clarity. [5][6]
The existing Ethiopian startup ecosystem functions mainly through informal networks. Access to
investors, mentors, or resources often depends on personal connections, referrals, or word of
mouth. This leaves many capable innovators unseen, especially those without social or
institutional links to established networks. Consequently, information asymmetry arises startups
struggle to find investors who understand their vision, while investors lack reliable means to
verify credible, investable startups. [5][4].
To understand these challenges more deeply, interviews were conducted with Minab
```
Technologies (a veteran software company with 11 years in operation), Kuraz Technologies (a
```
```
six-year-old early-stage digital startup), and IE Networks (a leading technology infrastructure
```
```
company with extensive experience in digital transformation projects). Their insights revealed a
```
consistent set of challenges that span across experience levels from newly formed startups to
established firms. [5][6].
Barriers to Growth in Ethiopia’s Startup Ecosystem
The Ethiopian startup ecosystem faces significant structural and cultural challenges that hinder
innovation and growth. Established companies like Minab Technologies highlight a pervasive
self-funding culture, limited mentorship, short-term profit focus, and weak policy and legal
support, making investment risky. Early-stage startups, exemplified by Kuraz Technologies,
struggle with restricted access to investors due to reliance on personal networks, low visibility,
trust gaps, inadequate mentorship structures, and legal uncertainties. Similarly, experienced firms
like IE Networks report bureaucratic, inconsistent legal and policy frameworks, investor
hesitation, and fragmented ecosystem integration. Collectively, these issues create an
environment where startups lack visibility, mentorship, funding, and regulatory clarity, and
15
investors face difficulty in identifying credible opportunities, emphasizing the need for a
centralized, verifiable, and supportive digital platform to bridge these gaps.
1.2.3 Proposed System
StartupConnect Ethiopia is a centralized digital platform designed to bridge the gaps within
Ethiopia’s entrepreneurial ecosystem by connecting startups, investors, and mentors in a secure
and verified environment. The system aims to enhance visibility, streamline investment
processes, and provide structured mentorship to support the growth of innovative ventures.
The platform accommodates four main types of users:
● Admin: Oversees the entire system, manages user verification, monitors activities,
generates reports, maintains platform settings, and ensures integrity and compliance
within the ecosystem.
● Investor: Enables investors to discover and evaluate startups, receive AI-assisted
recommendations, communicate directly with founders, manage funding processes, and
track portfolio performance.
● Startup: Allows entrepreneurs to create verified profiles, showcase projects, apply for
investment, request mentorship, manage documents, provide progress updates, and
communicate with investors and mentors.
● Mentor: Provides structured guidance to startups by accepting mentorship requests,
sharing resources, scheduling and hosting mentorship sessions, tracking progress, and
communicating with startups.
By integrating these functionalities, StartupConnect Ethiopia fosters collaboration, builds trust,
and ensures that startups can efficiently progress from ideas to scalable businesses. Features such
as local payment integration, mentorship tracking, and AI-assisted recommendations enhance
usability, transparency, and decision-making for all stakeholders, establishing a comprehensive
digital ecosystem tailored to the Ethiopian context.
1.2.4 Advantages of the Proposed System
The proposed platform provides a verified and trustworthy environment for startup–investor
interactions within Ethiopia, reducing information asymmetry and enhancing confidence. It
increases the visibility of startups to investors, improving access to funding opportunities. By
connecting entrepreneurs with experienced mentors, the system supports structured guidance and
professional development. Verification mechanisms reduce the risk of misinformation or
fraudulent ventures, while regional inclusivity enables startups from outside major cities to
16
participate. Accessible via both web and mobile applications, the platform advances Ethiopia’s
national objectives for digital transformation and innovation-driven growth, fostering a more
connected, credible, and sustainable entrepreneurial ecosystem..
1.3 Motivation
The primary motivation for developing StartupConnect Ethiopia stems from the recognition
that many innovative student and youth-led projects in Ethiopia end prematurely after
competitions or academic presentations. These projects possess the potential for
commercialization and societal impact but often lack the exposure and mentorship necessary to
progress beyond the prototype stage.
As software engineering students, the project team identified an opportunity to create a
sustainable bridge between innovation and investment. The motivation is driven by the desire to
empower young innovators, promote digital inclusivity, and strengthen the culture of
entrepreneurship in Ethiopia.
StartupConnect Ethiopia represents a step toward building a nationally integrated startup
ecosystem, one that recognizes talent, provides visibility, and connects innovators with the
financial and professional resources they need to grow.
1.4 Scope and Limitation of the Project
1.4.1 Scope of the Project
The scope of this project includes the design and development of a web-based and
mobile-based platform that connects startups, investors, and mentors in Ethiopia. The platform
aims to improve visibility, access to investment, and structured mentorship within the national
innovation ecosystem. Specifically, the system will include:
● User registration and authentication mechanisms for all user types.
● Startup and investor profile management, enabling the upload of business ideas, pitch
decks, financial summaries, and project details.
● Mentorship matching and communication tools to support structured guidance and
progress tracking.
● Integration of local digital payment systems such as Telebirr and CBE Birr for subscription
and service-related payments.
● Administrative dashboard for managing user accounts, verifying startups, and monitoring
system activity.
● Multilingual interface, currently supporting English and Amharic only to ensure inclusivity
17
and accessibility.
● Development of both web and mobile applications to maximize usability and reach across
different devices and regions.
● Initial focus on AASTU-based startups, with planned expansion to other universities and
innovation centers nationwide.
```
Additional Scope Point (new):
```
● Basic AI-assisted modules, including document summarization and startup–investor
recommendation features, designed as extensible components for future enhancement.
This scope provides a realistic yet scalable foundation, ensuring that the platform can grow as
user adoption increases.
1.4.2 Limitation of the Project
While the system aims to deliver comprehensive functionality, several constraints shape the
project’s initial phase. The main limitations include:
● No direct financial transaction processing.
```
The platform only integrates with payment gateways; actual fund transfers are handled by
```
existing financial institutions.
● No in-house legal or financial consulting services.
The system facilitates connections to verified professionals but does not provide these services
internally.
● Language support is limited to English and Amharic.
Additional Ethiopian languages may be added in future development phases based on user
demand and resources.
● The system will initially operate only within Ethiopia, with the potential for regional
```
expansion (e.g., to East African innovation hubs) in later stages.
```
● Advanced AI features are limited in the initial version.
Predictive analytics, automated verification, and investment scoring systems will be introduced
gradually as the platform evolves.
1.4.3 Registration Requirements and User Information
To make the registration process clear and operational, the platform should specify the
information required from each user type during sign-up. In this project, registration is divided
into two parts: account creation and profile completion/verification.

Implementation note for this project:
● One core users table stores identity, login credentials, role, and verification status.
● Startup, mentor, and investor profile tables are linked to users through user_id.
● Uploaded files are stored in the file system or external object storage, while PostgreSQL stores
	only the file URL/path and metadata.
● Discovery endpoints should return only approved profiles.

For all users, the system should collect the basic account information shown below:
● Full name
● Email address
● Phone number
● Password and confirm password
● Preferred language
● Acceptance of terms and privacy policy

For startup users, the registration form should also collect the following profile information:
● Startup name
● Sector or industry
● Startup stage
● Region and city
● Funding goal
● Startup type, year founded, team size, founder role, website, social links, and short description

For investor users, the registration form should collect:
● Company or investor name
● Investment range
● Areas of interest or preferred sectors

For mentor users, the registration form should collect:
● Area of expertise
● Years of experience

In addition to the form data, some supporting documents may be requested during onboarding or
admin verification, especially for startups. These may include identity proof, business
registration proof, pitch decks, business plans, and financial summaries. This means users do
not necessarily need to upload every document at the first sign-up step, but they should provide
the required core information before the account can be reviewed and approved.
1.5 Objective
1.5.1 General Objective
18
The general objective of this project is to develop a web- and mobile-based platform that
connects startups, investors, and mentors in Ethiopia.
1.5.2 Specific Objectives
● Plan, collect, and analyze system requirements related to the needs of startups,
investors, and mentors.
● Design the platform’s web and mobile interfaces, system architecture, and
database models based on the elicited requirements.
● Implement the web interface, mobile interface, backend server, and database.
● Perform manual integration and acceptance testing for quality assurance.
● Deploy the system.
1.6 Methodology
1.6.1 Data Collection Methodology
The research phase involves qualitative and quantitative data collection methods. Surveys and
semi-structured interviews will be conducted with local startups, investors, and mentors to
identify key challenges and expectations. Additionally, comparative analysis of existing
international platforms such as AngelList, Gust, and SeedInvest will be performed to adopt
relevant best practices.
1.6.2 System Design and Analysis Tools
```
System design will employ Use Case Diagrams, Data Flow Diagrams (DFD), and Entity
```
```
Relationship Diagrams (ERD) to model user interactions and data flow. The architecture will
```
emphasize scalability, security, and modularity to accommodate future updates.
1.6.3 Data Modeling
The database will be structured using PostgreSQL, chosen for its reliability and support for
relational data management. The data model will define relationships among startups, investors,
mentors, and administrators to ensure data consistency and efficient query performance.
1.6.4 System Development Tools
● Frontend: React.js for building a responsive and user-friendly interface.
● Backend: Node.js with Express.js for efficient API management and logic control.
● Database: PostgreSQL for structured data storage.
19
● Hosting: Cloud-based environment for scalability and accessibility.
1.6.5 Testing
The system will undergo rigorous testing procedures:
● Unit testing to validate individual components.
● Integration testing to ensure smooth interaction among modules.
```
● User Acceptance Testing (UAT) involving real startups and investors to evaluate
```
usability and functionality.
Feedback from testing will be used to refine and improve system performance.
1.7 Significance of the Project
StartupConnect Ethiopia addresses critical gaps in Ethiopia’s entrepreneurial ecosystem by
providing a structured, transparent, and inclusive platform for startups and investors. The
system’s impact extends beyond technology, it supports socio-economic development,
encourages youth innovation, and contributes to job creation.
The project aligns with Ethiopia’s national digital transformation agenda and global
```
frameworks such as the United Nations Sustainable Development Goals (SDG 8 and SDG 9),
```
which emphasize decent work, economic growth, and innovation-driven industrialization.
By connecting innovators with investors and mentors, StartupConnect Ethiopia will serve as a
catalyst for transforming creative ideas into scalable businesses, strengthening the foundation of
Ethiopia’s knowledge-based economy.
1.8 Project Schedule
```
Project Scheduling Plan (8-Month Duration)
```
The StartupConnect Ethiopia project is planned to be completed over a total duration of eight
months, divided into six major phases:
Project Initiation & Research, Requirement Analysis, System Design, System Development,
Testing & Evaluation, and Documentation & Final Presentation.
Each phase is structured with clear objectives, timelines, and deliverables to ensure systematic
progress and successful implementation.
```
Phase 1: Project Initiation and Research (Month 1)
```
20
During the first month, the project team will conduct a detailed literature review of both global
and local startup–investor platforms. The purpose of this phase is to identify gaps, opportunities,
and lessons relevant to the Ethiopian context. Additionally, the team will prepare the project
proposal, define objectives, and select appropriate tools and technologies for implementation.
```
Deliverables:
```
● Project proposal
● Research summary report
● Technology stack selection
```
Phase 2: Requirement Analysis (Month 2)
```
This phase focuses on identifying the functional and non-functional requirements of the
system. Surveys and interviews will be conducted with key stakeholders - startups, investors, and
mentors - to understand user expectations and technical needs. The main system modules such as
user registration, startup listing, investor matching, and mentorship tracking will be clearly
defined.
```
Deliverables:
```
```
● Software Requirements Specification (SRS) document
```
● Use Case Diagrams
```
Phase 3: System Design (Month 3)
```
In this phase, the project team will translate requirements into detailed technical designs. This
includes database schema creation, UI/UX wireframes, and data flow diagrams. The front-end
layout and API structure will also be planned to ensure seamless integration between the client
and server sides.
```
Deliverables:
```
```
● System Design Document (SDD)
```
● Architecture and data flow diagrams
● Prototype interfaces
21
```
Phase 4: System Development (Months 4–6)
```
This phase represents the implementation stage, during which all major coding and system
integration activities take place.
● Month 4: Frontend development using React.js and Next.js frameworks.
● Month 5: Backend development using Node.js, Express.js, and PostgreSQL or
MongoDB integration.
● Month 6: Integration of authentication, startup–investor matching, mentorship modules,
and initial internal testing of core functionalities.
```
Deliverables:
```
● Fully functional platform prototype
```
Phase 5: Testing and Evaluation (Month 7)
```
This phase focuses on assessing the quality and performance of the developed system.
Comprehensive testing, including unit testing, integration testing, and User Acceptance Testing
```
(UAT), will be carried out. Real users (startups, investors, and mentors) will test the platform to
```
ensure usability and reliability.
```
Deliverables:
```
● Test report
● Performance evaluation document
● Identified bug list and corrections
```
Phase 6: Documentation and Final Presentation (Month 8)
```
In the final phase, the team will complete all project documentation and prepare for deployment
and defense. The documentation will include a detailed project report, user manual, and
deployment guide. A live system demonstration and presentation will be conducted for
evaluators and stakeholders.
```
Deliverables:
```
● Final project report
22
● PowerPoint presentation slides
● Project defense presentation
```
Fig 1.1: StartupConnect Ethiopia: Project Schedule (Sep 2025–Apr 2026): Gantt chart of project tasks
```
and timeline.
23
CHAPTER TWO: LITERATURE REVIEW
2.1 Introduction
The global landscape of early-stage venture capital has been fundamentally reshaped by digital
platforms that democratize access to funding. Platforms such as AngelList, Gust, and
SeedInvest serve as digital marketplaces that match startups with investors and mentors while
ensuring legal compliance, standardized documentation, and transparent due diligence. These
systems provide useful models for emerging markets.[14][16].
This chapter reviews existing literature on digital startup ecosystems, investment
matchmaking platforms, and regulatory frameworks, with a particular emphasis on how
global best practices can be localized to Ethiopia. It addresses the nature of digital startup
ecosystems, matchmaking platforms, the role of AI, and the specific challenges and opportunities
within the Ethiopian context.[19]
2.2 Digital Startup Ecosystems and Key Actors
Digital startup ecosystems consist of multiple interrelated actors, entrepreneurs, investors,
mentors, universities, government, and service providers that collide in a shared environment to
enable innovation. In emerging markets, ecosystems often struggle with funding gaps, regulatory
ambiguity, and fragmented institutional support. Studies highlight that a well-functioning
ecosystem requires not only technological infrastructure but also strong networks, policy
support, and trust-building mechanisms. [19].
2.3 Empirical Studies on the Ethiopian Ecosystem
```
2.3.1 JICA & MInT Startup Ecosystem Report (2023)
```
```
The Japan International Cooperation Agency (JICA), in collaboration with Ethiopia’s Ministry of
```
```
Innovation and Technology (MInT), conducted a comprehensive survey of the Ethiopian startup
```
ecosystem, sampling 300 startups and 80 stakeholders. Their findings reveal a nascent but
promising ecosystem: regulatory and policy barriers remain significant, with unclear frameworks
for startup registration and limited startup-specific legal infrastructure. Funding constraints are
evident, as investors report small ticket sizes compared to more mature ecosystems, underscoring
the need to de-risk investment. Additionally, many startups have not undergone formal valuation
59% of surveyed firms, for instance, lacked a structured valuation process. Gender dynamics also
surfaced, with access disparities for women-led ventures. While the report offers deep insight, it
is limited by its geographic concentration in Addis Ababa and by its reliance on self-reported
data, which may omit informal or very early-stage firms.
```
Relevance: For StartupConnect Ethiopia, this report provides empirical justification for a
```
verified matchmaking platform. The lack of valuation among many startups and the risk
perceived by investors strongly support the development of a system that can validate and
showcase startup potential credibly. Moreover, the regulatory challenges highlighted suggest that
24
our platform should be designed in alignment with government efforts and ecosystem
builders.[19]
2.3.2 Cenfri’s Guidance on Startup Support in Ethiopia
Cenfri, a research group, has published a policy guide that outlines how to structure a fund to
support digital startups in Ethiopia. One major recommendation is against designing funds that
target specific sectors: such targeted funds might unintentionally distort markets, pushing
entrepreneurs toward industries just because they are funded. Rather, Cenfri suggests a more
market-driven, broad-based funding approach aligned with national digital strategies like
Digital Ethiopia 2025. While the guide is more policy than technical in nature, its
recommendations are essential for building a sustainable and inclusive financing ecosystem.
```
Relevance: This aligns with StartupConnect Ethiopia’s need to remain sector-agnostic and
```
inclusive. The guide also supports the notion of collaborating with government entities to align
platform goals with national policy, improving legitimacy and potential sustainability.
```
2.3.3 BIC Africa’s ESO Ecosystem Mapping (2022/23)
```
The European Union funded BIC Africa conducted a mapping of Entrepreneur Support
```
Organizations in Ethiopia, identifying 125 ESOs (incubators, accelerators, mentorship programs,
```
```
etc.). The mapping highlights that while support structures are increasing, they remain
```
fragmented and poorly networked. Many ESOs do not have strong linkages with each other, and
coordination is limited.
```
Relevance: This fragmentation directly supports our project’s premise: there is a need for a
```
```
centralized digital space to bring together these diverse actors (startups, mentors, support
```
```
organizations). By onboarding ESOs, the platform can serve as a bridge that increases
```
connectivity and maximizes the impact of these organizations.
2.3.4 Dealroom / RISA / GrowthAfrica Report State of Startup Innovation in
Ethiopia
An insight report, backed by GrowthAfrica, Systemic Innovation, and the RISA Fund, analyzed
```
562 companies (489 startups) listed in Dealroom. It found that the total enterprise value (TEV)
```
of the Ethiopian startup ecosystem is approximately US$302 million. However, investment
remains concentrated in a few high-performing companies, and many startups are likely
excluded from the dataset due to limitations in public data.
```
Relevance: This report validates the economic potential of Ethiopian startups, supporting our
```
platform’s mission to highlight investable ventures. However, its data limitations also stress the
importance of building a local, verified database to ensure startups that are “off-Dealroom” also
gain visibility.
25
```
2.3.5 EdTech Financing Challenges (Shega)
```
```
A recent assessment by Shega (in collaboration with Reach for Change) focused on the EdTech
```
ecosystem in Ethiopia. They found a major funding gap, with 52% of surveyed EdTech startups
```
having less than 500,000 birr (very small seed funding) and only a few breaking out into higher
```
funding bands. Moreover, while EdTech represents a significant portion of the startup ecosystem
```
(21% in the JICA report), most ventures remain in early phases.
```
```
Relevance: This highlights that sector-specific challenges are real in Ethiopia. For
```
```
StartupConnect Ethiopia, this means you might want to include sector segmentation (e.g.,
```
```
EdTech, AgriTech) and perhaps tailored matching for investors interested in specific domains.
```
Also, the need for mentorship is acute in EdTech mentors who understand education and
technology can be more effective.
2.4 International and Technological Models for Platform Design
To build a globally informed but locally relevant platform, it helps to review international
models and academic research on matching platforms and AI-driven systems.
2.4.1 Global Platform Examples
1. AngelList
AngelList is a globally recognized platform that connects startups, angel investors, and job
seekers. It supports features like investment syndicates, talent recruitment, and deal flow. Its
success demonstrates how an online platform can scale matchmaking, but its model is based on
developed-market regulatory frameworks and investor sophistication.[13].
Relevance for Startup Connect Ethiopia: This model is critical for capital aggregation.
```
Implementing a similar structure (a local form of SPV) would allow Startup Connect Ethiopia
```
to manage the complexity of numerous small investments under a single entity on the startup's
cap table, simplifying the legal overhead for early-stage companies[14].
Regulatory and Non-U.S. Investor Implications: AngelList deals strictly adhere to U.S.
```
accreditation requirements. For non-U.S. investors (like the Ethiopian diaspora), the platform
```
structure facilitates investment across borders. While the tax structure is complex, the
mechanism for pooling international capital under a single, simplified investment entity is a
valuable blueprint for managing diaspora engagement[16].
Limitations for Ethiopia:
· Regulatory misalignment: AngelList’s financial model and regulatory assumptions may
not hold in Ethiopia.
26
· Trust gap: Without strong local verification, just creating a listing platform may not
solve the credibility issues Ethiopian startups face.
2. SeedInvest: Model for Compliance and Rigorous Curation
SeedInvest is an equity crowdfunding platform that “screens and vets” startups before they can
raise funds. It allows smaller investors to participate, democratizing early-stage investing.
Relevance for Startup Connect Ethiopia: Given the structural risks inherent in emerging
markets, SeedInvest's stringent curation model offers a powerful lesson. The platform must
prioritize quality over quantity in its deal flow to build investor trust and mitigate risk.
```
Furthermore, SeedInvest’s utilization of multiple U.S. securities exemptions (Reg CF, Reg A+,
```
```
Reg D) highlights the absolute necessity of anchoring the platform's transactions to clear, explicit
```
securities regulations, which in the Ethiopian context must align with the Ethiopian Capital
```
Market Authority (ECMA).
```
Limitations for Ethiopia:
· Crowdfunding regulations: Equity crowdfunding may be restricted or underdeveloped
in Ethiopian law.
· Investor sophistication: Local investors may lack experience with equity crowdfunding,
making adoption slow or risky.
3. Gust Platform: Model for Deal Flow and Operational Standards
Gust operates primarily as an ecosystem and deal flow management system for organized
investor groups, rather than directly structuring SPVs.
Relevance for Startup Connect Ethiopia: Gust's strength lies in standardizing the due
diligence and vetting process. For a platform like Startup Connect Ethiopia operating in a
nascent market, adopting standardized templates for pitches, financial reporting, and investor
```
updates is essential. This focus on "Company as a Service (CaaS)" functionality, ensuring local
```
startups are investor-ready and compliant, is paramount for building confidence among investors,
particularly those accustomed to international standards.
2.4.2 AI, Matching, and Mentorship Research
Fused Large Language Model for Predicting Startup Success
```
Maarouf, Feuerriegel, & Pröllochs (2024) propose a model that uses founder self-descriptions
```
```
(text) plus traditional metrics to predict startup success. They show that these text descriptions
```
significantly improve predictive power beyond structured data.
```
· Strengths: Helps investors discern potential from narrative, not just numbers; useful
```
when traditional financial data is unavailable.
27
```
· Limitations: Dependence on high-quality textual descriptions; potential lack of
```
```
interpretability; bias in training data if applied to local contexts without adaptation.
```
· Relevance: For StartupConnect Ethiopia, this model suggests how AI can recommend
high-potential startups to investors even when financial data is sparse but you would
need localized data for training to ensure relevance.
Deep Learning for Success Prediction and Simulated VC Portfolios
```
Potanin, Chertok, Zorin & Shtabtsovsky (2023) develop a deep learning model using Crunchbase
```
data to simulate VC decision-making. They demonstrate that their model can accurately identify
strong startups at early stages and generate good return when backtested.
```
· Strengths: Provides a data-driven way to simulate and support investment decisions;
```
helps investors triage startup deal flow.
```
· Limitations: Requires high-quality data; model trained on data from developed
```
```
markets; may not account for local risk factors, regulation, or currency issues.
```
· Relevance: Your platform could implement a similar predictive tool but must collect
local data and possibly retrain or adapt the model to Ethiopian startup dynamics.
Digital Mentor: Conversational Bot for Hypothesis Generation
```
Melegati & Wang (2022) propose a “Digital Mentor,” a conversational bot that helps startup
```
```
founders map out their business hypotheses and assumptions (via a “HyMap”) without a human
```
facilitator.
· Strengths: Scalable, reduces barrier to early mentorship, helps founders crystallize their
ideas.
```
· Limitations: Prototype-level; may not understand context deeply; lacks personalization
```
for different types of founders or sectors.
· Relevance: In StartupConnect Ethiopia, this bot can serve as a first layer of
mentorship, helping mentees frame their thinking before engaging human mentors.
This is especially useful given mentorship resource constraints.
```
InSearch: Interactive Investor Recommendation System
```
```
Zhang, Wang, Li & Zhang (2022) present InSearch, a visual-analytics system to help founders
```
discover and interactively explore potential crowdfunding investors. Their system uses Graph
Neural Networks to model investor behavior and preferences, and provides explanations for
recommendations.
```
· Strengths: Interactive and transparent; supports trust by explaining why investors are
```
```
recommended; allows founders to explore investor histories.
```
28
```
· Limitations: Requires detailed data on investors; may be complicated for users not
```
familiar with data-driven tools.
· Relevance: A tool modeled after InSearch could be implemented in StartupConnect
Ethiopia to help founders navigate investor profiles more meaningfully and to build
trust by explaining matches.
2.5 Digital Finance Integration and the Evolving Ethiopian Context
The successful implementation of digital investment platforms requires a foundational digital
```
financial services (DFS) ecosystem. While Ethiopia has faced structural barriers, recent policy
```
reforms have created a tangible pathway for FinTech innovation.
2.5.1. Infrastructure and Access Constraints
A primary impediment remains the low penetration of digital financial services. Challenges
```
include:
```
· Physical Infrastructure: Limited and unreliable access to electricity and low
ownership of feature/mobile handsets, especially in rural areas.
· Digital Literacy: A high proportion of the population relies on the informal financial
system, necessitating solutions that are extremely user-friendly and offer
low-bandwidth or agent-assisted access modes.
· Cash Dominance: The economy remains heavily cash-dependent, although recent
mandates requiring government offices to accept digital payments are accelerating the
cashless transition.
Strategic Response for Startup Connect Ethiopia: The platform must be designed with a
mobile-first, low-data consumption philosophy, potentially leveraging existing mobile money
agent networks to facilitate cash-in/cash-out for local investments, thus bridging the physical
infrastructure gap.
2.5.2. Regulatory Transformation and the Pathway to Compliance
Ethiopia's regulatory environment, previously restrictive, has undergone rapid modernization,
offering key enablers for Startup Connect Ethiopia:[18]
```
· The Ethiopian Capital Market Authority (ECMA): Established to regulate the
```
capital market, ECMA is the definitive body for securities issuance. The existence of
the ECMA Regulatory Sandbox is a critical opportunity, allowing innovative capital
```
market products and services (like a digital investment platform) to be tested in a
```
controlled environment with regulatory support and tailored guidance.
29
```
· Enabling FinTech Directives (NBE): The National Bank of Ethiopia (NBE) has
```
revised its directives, specifically allowing mobile money service providers to
facilitate capital market products. This is a direct technological and regulatory link
that Startup Connect Ethiopia can leverage to process transactions using existing
wallet infrastructure.
```
· Startup Proclamation Act (2025): This landmark legislation explicitly exempts
```
foreign startups and foreign startup ecosystem builders from previous minimum
```
foreign capital requirements (USD 200,000). This single policy change
```
fundamentally removes a major barrier to attracting diaspora and international
venture capital, significantly improving the viability of the project.
2.6 Gaps in Literature and Implications for StartupConnect Ethiopia
Based on the reviewed literature, the following gaps are particularly relevant to the design and
justification of our platform:
1. Absence of Comprehensive, Verified Startup Data
o Many Ethiopian startups are not listed in global databases like Dealroom, and
```
local data is fragmented (JICA report, RISA data).
```
o Implication: The platform must act as a central repository for verified startup
data, encouraging startups to upload documentation, business plans, and
regular updates.
2. Trust Deficit Between Stakeholders
o Investors in Ethiopia express concern about risk, verification, and valuation
```
(JICA report).
```
```
o Implication: Incorporate multi-level verification (document checks, third
```
```
parties, ESOs) and transparent matching logic.
```
3. Limited Use of Advanced Matching Technologies Locally
o While AI models exist, few platforms in Ethiopia currently leverage them.
```
o Implication: Leverage AI (LLM + structured data) for matching, but retrain /
```
```
adapt on local data; include explanation for matches to build trust.
```
4. Mentorship Resource Constraints
```
o There is a shortage of structured, scalable mentorship in Ethiopia; many ESOs
```
are fragmented.
30
```
o Implication: Use a hybrid mentorship model (bot + human), and encourage
```
ESO integration, matching mentors with startups based on expertise,
availability, and domain.
5. Sustainability and Policy Alignment
```
o Policy guides (e.g., Cenfri) caution against narrow funding; the ecosystem is
```
rapidly evolving.
o Implication: The platform should design a sustainable business model
```
(subscription, service fees, partnerships) and align with government strategies
```
```
(MInT, Digital Ethiopia).
```
2.7 Strategic Synthesis and Operationalizing Startup Connect Ethiopia
The analysis confirms that the global principles of compliance, curation, and aggregation are
necessary, but must be adapted to the Ethiopian market using the new regulatory tools. The
proposed strategic framework for Startup Connect Ethiopia is defined by four operational
```
pillars:
```
1. Capital Aggregation: Drawing a benchmark from the AngelList SPV model, the
platform must address the need for simplified investment vehicles in Ethiopia. The
```
operational strategy is to develop a mechanism (similar to an SPV) for local capital
```
pooling that is approved by the ECMA under their new directives, allowing the
platform to present a single, clean investor entity to the startup, drastically
simplifying the cap table.
2. Rigorous Curation: Benchmarking against SeedInvest's stringent vetting, the
platform recognizes the low investor confidence and inherent emerging market
risk. The strategy involves implementing Gust-style deal-flow management with a
highly selective acceptance rate. This focuses on investor protection, transparency,
and building market trust by ensuring only the most vetted opportunities reach the
investors.
3. Compliance & Testing: The regulatory benchmarks (U.S. Reg CF/Reg A+) translate
into leveraging the ECMA Regulatory Sandbox and new NBE Directives. The
essential strategy is to apply to the ECMA Regulatory Sandbox to test the
platform’s business model, legal structure, and compliance framework before full
market launch, which is crucial for guaranteeing regulatory alignment and
minimizing risk.
4. Access & Reach: Global digital investment platforms offer universal access, but
Startup Connect Ethiopia must address low digital literacy and cash dominance
in Ethiopia. The operational strategy is to design a mobile-first, low-bandwidth UI
```
and strategically integrate with licensed mobile money providers (enabled by NBE
```
31
```
directives) for seamless on-ramping of local funds, effectively bridging the digital and
```
cash divide.
The research gap is now closed by identifying the specific regulatory tools available. The focus
shifts from if a platform can be built, to how Startup Connect Ethiopia will utilize the ECMA
Sandbox and the Startup Proclamation to launch a fully compliant, locally adapted, and scalable
digital investment platform.
2.8 Conceptual Framework
Based on the above, the conceptual framework for StartupConnect Ethiopia includes:
· Inputs: Verified startup data, investor preferences, mentor expertise
· Processes: Verification, AI-driven matching, interactive exploration, mentorship
sessions
· Infrastructure: Admin dashboard, payment gateway, multilingual UI, analytics
· Outputs: Matched relationships, mentorship engagements, funding interest
· Outcomes: Increased trust, visibility, resource flow, and ecosystem cohesion
```
· Moderators: Regulatory environment, inclusion (gender, region), sector diversity
```
2.9 Summary
The literature strongly supports the need for StartupConnect Ethiopia: the Ethiopian startup
ecosystem faces fragmentation, trust issues, and data gaps. International and academic models
```
(AngelList, SeedInvest, AI-based prediction, interactive matching) offer proven strategies, but
```
must be carefully adapted to the local context. A platform that centralizes verified data, uses AI
for intelligent matching, provides scalable mentorship, and aligns with local policy could
significantly strengthen Ethiopia’s startup ecosystem.
32
CHAPTER THREE: SYSTEM ANALYSIS AND MODELING
3.1 Overview
After gathering detailed information about the limitations of existing platforms and
understanding the needs of our users, we conducted a structured system analysis to clearly define
the objectives of our platform. This chapter presents the modeling activities used during the
analysis phase.
First, scenario based modeling is used to identify the main actors of the system and describe
how they interact with the platform through well-defined use cases. These scenarios are
supported with UML Use Case Diagrams and UML Activity Diagrams to illustrate user goals
and workflow behavior.
Next, behavioral modeling captures the dynamic operation of the system using UML Sequence
Diagrams, which show the flow of events and communication between components during key
interactions.
Finally, class-based modeling identifies the core classes of the system and represents their
attributes and relationships using a UML Class Diagram.
Together, these modeling techniques provide a clear and complete understanding of how the
system behaves, interacts and is structured, ensuring a solid foundation for implementation.
3.2 Scenario-Based Modeling
Scenario-based modeling was applied to understand how end users and external actors intend to
interact with the platform. This method helps translate real-world needs into clear, traceable
system requirements. Each scenario is expressed using UML Use Cases and Activity Diagrams,
which together describe both what the system should do and how users will flow through
essential tasks.[24]
3.2.1 Use Case Identification
In the proposed StartupConnect Ethiopia platform, use case identification is a crucial step for
defining the system’s functional requirements. These use cases describe the interactions between
```
external actors (startups, investors, mentors, and administrators) and the system, outlining what
```
each actor can accomplish. Through the analysis of user needs, workflow diagrams, and platform
expectations, the following use cases have been identified. These use cases capture all system
functionalities required to support startup–investor–mentor collaboration, business project
management, investment processing, communication features, and administrative
operations.[23][24]
33
ADMIN
Table 3.1: Admin Use Case Identification List
Use Case ID Use Case Title Description
UC_1 Admin Login &
Authentication
Secure sign-in for
administrators with
multi-factor authentication
and role-based access
control.
UC_2 Approve User Accounts Review and approve
registrations for startups,
investors, and mentors
after validating provided
information.
UC_3 Reject User Accounts Reject registrations that
are incomplete or fail
verification, optionally
sending feedback to the
user.
UC_4 Remove User Accounts Deactivate or delete user
accounts that violate
policies or upon admin
decision.
UC_5 Search Users & Review
Profiles
Search and inspect user
profiles, documents, and
activity history for
verification or audits.
UC_6 Monitor System Activities View system logs, user
actions, and alerts to
detect misuse or
performance issues.
UC_7 Moderate Content & Posts Review, approve, or
remove user-generated
content that violates
community guidelines.
UC_8 Approve or Remove
Startup Listing
Validate startup listings
before publishing and
34
remove listings if they
breach rules.
UC_9 Oversee All Investments Access platform-wide
investment records to
verify legitimacy and
resolve disputes.
UC_10 Review Payment
Transactions
Inspect payment records
for mentor fees,
investments, refunds, and
chargebacks.
UC_11 Generate System Reports Create scheduled or
ad-hoc reports on usage,
finances, and platform
KPIs.
UC_12 Perform System
Maintenance
Update platform settings,
```
categories, and metadata;
```
run maintenance tasks and
migrations.
INVESTOR
Table 3.2: Investor Use Case Identification List
Use Case ID Use Case Title Description
UC_13 Investor Registration &
Login
Create an investor account
and securely authenticate
to the platform.
UC_14 View Startup List Browse a curated list of
verified startups with
summary information.
UC_15 Search and Filter Startups Find startups using filters
like industry, stage,
location, and traction.
35
UC_16 Receive AI Startup
Recommendations
Get personalized startup
suggestions based on
investor preferences and
behavior.
UC_17 View Detailed Startup
Profile
Open a startup's full
profile including
documents, traction
metrics, and team info.
UC_18 Send Funding Offer to
Startup
Submit an investment
proposal with terms,
amount, and conditions to
a startup.
UC_19 Accept/Reject Funding
Requests
Respond to
startup-initiated funding
requests with accept,
negotiate, or decline.
UC_20 Create Investment
Portfolio
Organize and track all
startups the investor has
funded in a portfolio view.
UC_21 Cancel Investment Offer Withdraw a previously
submitted funding offer
before it's accepted.
UC_22 Payment Handling for
Investments
Manage payment
authorizations, transfers,
escrow, and receipts for
investments.
UC_23 Direct Chat With Startup Communicate directly
with startup founders to
discuss terms or ask
questions.
UC_24 Join Video Meetings With
Startup
Participate in live video
meetings for pitches,
demos, or negotiations.
UC_25 Provide Feedback to
Startup
Leave structured feedback
or ratings on startup
progress and pitches.
36
UC_26 View Investment Reports View analytics and reports
on portfolio performance,
returns, and milestones.
STARTUP
Table 3.3: Startup Use Case Identification List
Use Case ID Use Case Title Description
UC_27 Startup Registration &
Login
Sign up a startup account,
claim company profile,
and authenticate securely.
UC_28 Create Startup Project Create a project or funding
request with summary,
goals, and required
amount.
UC_29 Upload Project Documents Upload pitch decks,
business plans, financials,
and demo videos for
investor review.
UC_30 Update Project Progress Post milestones, traction
updates, and progress
reports to the project
timeline.
UC_31 Search Investors and
Mentors
Find potential investors or
mentors using filters and
connectivity options.
UC_32 AI Investor/Mentor
Recommendations
Receive AI-driven
suggestions for best-fit
investors and mentors.
UC_33 Apply for Investment Submit an application to
receive funding, including
documents and funding
needs.
UC_34 Chat With Investors Communicate in real-time
with interested investors
to answer questions and
negotiate.
37
UC_35 Participate in Video
Meetings
Host or join video calls for
pitches, product demos,
and Q&A sessions.
UC_36 Track Investment
Payments
View payment status for
committed funds, pending
deposits, and completed
transfers.
UC_37 View Investor Feedback Access comments, ratings,
and suggestions left by
investors and mentors.
UC_38 Request Mentorship Send requests to mentors
for guidance, including
goals and expected
outcomes.
UC_39 Accept Mentor Offer Approve mentorship
proposals and schedule
sessions with chosen
mentors.
UC_40 Remove Mentor End an active mentorship
relationship and update
mentorship records.
UC_41 Chat With Mentor Text-based
communication channel to
get advice and follow-up
questions answered.
UC_42 Join Mentor Video
Sessions
Participate in scheduled
live mentorship calls and
webinars.
UC_43 View Startup Status See the current status of
```
the startup (Pending,
```
Active, Funded,
```
Mentored, Closed).
```
MENTOR
Table 3.4: Mentor Use Case Identification List
Use Case ID Use Case Title Description
38
UC_44 Mentor Registration &
Login
Create a mentor profile,
verify expertise, and sign
in securely.
UC_45 Accept or Reject
Mentorship Request
Respond to startups'
mentorship requests based
on fit and availability.
UC_46 Send Mentorship Proposal Initiate offers to startups
outlining scope, duration,
and fees for mentorship.
UC_47 View Startup Profiles Review startup
information and
documents to assess
suitability before
mentoring.
UC_48 Provide Learning
Resources
Share templates, guides,
and documents to help
startups improve
operations.
UC_49 Schedule Mentorship
Sessions
Propose and confirm
dates/times for coaching
sessions with calendar
integration.
UC_50 Host Live Mentorship
Video Session
Conduct real-time video
coaching, share screens,
and assign follow-ups.
UC_51 Chat With Startup Maintain ongoing text
conversations to provide
short-form advice and
clarifications.
UC_52 Share Materials During
Session
Send files or links during
sessions to illustrate points
or assign work.
UC_53 Submit Mentorship
Reports
Provide session
summaries, action items,
and progress notes to
startups and admin.
39
UC_54 View Mentorship History Access records of past
sessions, outcomes, and
mentor ratings.
UC_55 Receive Mentorship
Payments
Handle payments for paid
mentorship sessions and
generate receipts.
UC_56 End Mentorship
Engagement
Formally close mentorship
with final reporting and
feedback.
3.2.2 Actor Identification
The StartupConnect Ethiopia platform involves multiple categories of users who interact with
the system to accomplish specific objectives. Each actor plays a distinct role in the digital
ecosystem, and understanding their responsibilities is essential for defining system behavior. The
following actors have been identified based on system analysis and functional requirements.
A Startup represents individual entrepreneurs or founding teams seeking investment,
mentorship, or professional guidance for their innovative projects. They are the primary content
creators on the platform, responsible for adding project information, uploading business
documents, and initiating interaction with investors and mentors.
Startups utilize the system to publish their project profiles, including problem statements,
business models, financial projections, and pitch decks. They can search for appropriate
investors who align with their industry, funding stage, and investment requirements. In addition,
startups may request mentorship from experienced professionals to refine their ideas, improve
their strategy, and gain industry insights.
They also maintain communication with investors and mentors through chat and video sessions,
monitor their application status, manage offers received, and update their project’s progress over
time. Their role is essential, as they provide the core content and drive the activity flow within
the platform.
An Investor represents either an individual angel investor, investment firm, venture capitalist, or
organization that provides financial resources for promising startups. Investors use the system to
explore new opportunities, review startup profiles, and evaluate applications submitted to them.
They can filter startups based on predefined criteria such as sector, maturity stage, traction, and
investment needs. Investors also receive AI-based recommendations that match their investment
preferences with relevant startup projects. After reviewing proposals, they may accept or decline
investment requests, send funding offers, and track the progress of invested projects.
40
Investors interact using messaging tools to communicate with startup founders, participate in
video consultations, and finalize financial transactions within the platform. Their activities
ensure the funding cycle flows efficiently and transparently.
A Mentor represents an experienced professional, industry expert, business consultant, or
entrepreneurship trainer who provides advisory services to startups. Mentors play a crucial role
in supporting early-stage companies by offering feedback, conducting training sessions,
reviewing business plans, and facilitating strategic planning.
Mentors can browse startups seeking support, accept or decline mentorship requests, and
schedule mentorship sessions using the platform’s communication tools. They may offer
guidance through text messages, voice calls, or video meetings, helping startups refine their
models, improve pitches, and strengthen operational processes.
They are also responsible for submitting mentorship reports that summarize session outcomes
and recommendations. Their involvement improves the quality and viability of startup projects,
enhancing the platform’s impact on innovation.
An Administrator manages, supervises, and ensures the proper functioning of the
StartupConnect Ethiopia system. Administrators have elevated privileges and are responsible for
overseeing all user activities, managing account approval workflows, moderating content, and
ensuring system security.
They verify accounts for startups, investors, and mentors to maintain authenticity. Administrators
monitor system logs, detect suspicious or fraudulent activities, and enforce platform policies.
They can remove inappropriate content, deactivate accounts violating guidelines, and ensure that
communication channels remain safe and professional.
Administrators also oversee payment transactions, handle platform-wide reporting, and manage
the AI recommendation modules, ensuring the system performs reliably and efficiently. Their
role guarantees the platform’s stability, transparency, and integrity.
41
3.3 use case diagram
Fig 3.1: Admin and Investor Use Case Diagram
4243
Fig 3.2: Startup and Mentor Use Case Diagram
3.3.2 Use Case Description
The diagrams below aim to summarize the details of our system's users and their interactions
with the system.
Table 3.5: Use Case description for Admin Login & Authentication
Field Description
Use Case ID UC_1
Use Case Name Admin Login & Authentication
```
Primary Actor(s) Admin
```
```
Secondary Actor(s) N/A
```
Description Secure sign-in for administrators with
multi-factor authentication and
role-based access control.
Precondition Admin account exists.
Main Flow 1. Admin navigates to login page
.2. Admin enters username and
password.
3. System validates credentials.
4. If multi-factor authentication is
enabled, system prompts for
verification.
5. Admin successfully logs in and
accesses the dashboard.
Alternate Flows 1a. Invalid credentials → System
displays error and prompts to re-enter.
1b. Multi-factor authentication fails
→ System denies access and logs
attempt.
Post-condition Admin is authenticated and has access
```
to the dashboard; login attempt
```
logged.
Table 3.6: Use Case description for Reject User Accounts
44
Field Description
Use Case ID UC_3
Use Case Name Reject User Accounts
```
Primary Actor(s) Admin
```
```
Secondary Actor(s) N/A
```
Description Reject registrations that are incomplete or fail
verification, optionally sending feedback to
the user.
```
Precondition Admin is logged in; pending user registrations
```
exist.
Main Flow 1. Admin reviews the user registration.
2. Admin identifies incomplete or invalid
information.
3. Admin rejects the account.
4. System updates the status to "rejected" and
sends notification to the user.
Alternate Flows 3a. User corrects information → System
allows resubmission and re-review.
```
Post-condition User account is rejected; feedback sent to the
```
user.
Table 3.7: Use Case description for Approve User Accounts
Field Description
Use Case ID UC_2
Use Case Name Approve User Accounts
```
Primary Actor(s) Admin
```
```
Secondary Actor(s) N/A
```
Description Review and approve registrations for startups,
investors, and mentors after validating
provided information.
```
Precondition Admin is logged in; pending user registrations
```
exist.
45
Main Flow 1. Admin searches or views pending user
registrations.
2. Admin reviews submitted documents and
profile information.
3. Admin approves the account.
4. System updates the user status to
"approved" and notifies the user.
Alternate Flows 2a. Missing or incomplete information →
Admin requests additional details before
approval.
```
Post-condition User account is approved and activated;
```
notification sent.
Table 3.8: Use Case description for Remove User Accounts
Field Description
Use Case ID UC_4
Use Case Name Remove User Accounts
```
Primary Actor(s) Admin
```
```
Secondary Actor(s) N/A
```
Description Deactivate or delete user accounts that violate
policies or upon admin decision.
```
Precondition Admin is logged in; user account exists.
```
Main Flow 1. Admin searches and selects the user account.
2. Admin verifies the reason for removal.
3. Admin deactivates or deletes the account.
4. System updates user status and logs action.
Alternate Flows 3a. User has ongoing transactions → System
prompts for resolution before removal.
```
Post-condition User account is removed or deactivated; action
```
logged.
Table 3.9: Use Case description for Search Users & Review Profiles
Field Description
46
Use Case ID UC_5
Use Case Name Search Users & Review Profiles
```
Primary Actor(s) Admin
```
```
Secondary Actor(s) N/A
```
Description Search and inspect user profiles, documents,
and activity history for verification or audits.
Precondition Admin is logged in.
Main Flow 1. Admin enters search criteria for users.
2. System displays matching profiles.
3. Admin selects a profile to review.
4. System shows detailed account
information, documents, and activity logs.
Alternate Flows 3a. No matching profiles → System displays
"no results found."
Post-condition Admin successfully views user profile details.
Table 3.10: Use Case description for Monitor System Activities
Field Description
Use Case ID UC_6
Use Case Name Monitor System Activities
```
Primary Actor(s) Admin
```
```
Secondary Actor(s) N/A
```
Description View system logs, user actions, and alerts to
detect misuse or performance issues.
Precondition Admin is logged in.
Main Flow 1. Admin navigates to system activity
monitoring section.
2. System displays logs, user actions, and
alerts.
3. Admin filters or searches specific activities.
4. Admin reviews alerts or suspicious activity.
47
Alternate Flows 3a. No relevant logs found → System displays
a "no data" message.
Post-condition Admin has successfully reviewed system
activity logs.
Table 3.11: Use Case description for Moderate Content & Posts
Field Description
Use Case ID UC_7
Use Case Name Moderate Content & Posts
```
Primary Actor(s) Admin
```
```
Secondary Actor(s) N/A
```
Description Review, approve, or remove user-generated
content that violates community guidelines.
```
Precondition Admin is logged in; content exists for
```
moderation.
Main Flow 1. Admin navigates to content moderation
section.
2. Admin reviews flagged or submitted
content.
3. Admin approves or removes content.
4. System updates content status and logs the
action.
Alternate Flows 3a. Content requires further review → System
marks as pending.
```
Post-condition Content is moderated; system logs the action.
```
Table 3.12: Use Case description for Approve or Remove Startup Listing
Field Description
Use Case ID UC_8
48
Use Case Name Approve or Remove Startup Listing
```
Primary Actor(s) Admin
```
```
Secondary Actor(s) N/A
```
Description Validate startup listings before publishing and
remove listings if they breach rules.
```
Precondition Admin is logged in; startup listing exists.
```
Main Flow 1. Admin searches or selects a startup listing.
2. Admin reviews documents and
information.
3. Admin approves or removes the listing.
4. System updates listing status and notifies
the startup.
Alternate Flows 3a. Incomplete information → System
prompts startup to update listing.
```
Post-condition Listing status updated; startup notified.
```
Table 3.13: Use Case description for Oversee All Investments
Field Description
Use Case ID UC_9
Use Case Name Oversee All Investments
```
Primary Actor(s) Admin
```
```
Secondary Actor(s) N/A
```
Description Access platform-wide investment records to
verify legitimacy and resolve disputes.
Precondition Admin is logged in.
Main Flow 1. Admin navigates to investment overview
section.
2. System displays all active investments.
3. Admin reviews records and transaction
histories.
4. Admin investigates disputes if any.
Alternate Flows 3a. No investments found → System displays
"no records found."
49
Post-condition Admin has a complete overview of
```
investments; disputes are tracked.
```
Table 3.14: Use Case description for Review Payment Transactions
Field Description
Use Case ID UC_10
Use Case Name Review Payment Transactions
```
Primary Actor(s) Admin
```
```
Secondary Actor(s) Payment Processing System
```
Description Inspect payment records for mentor fees,
investments, refunds, and chargebacks.
```
Precondition Admin is logged in; transactions exist.
```
Main Flow 1. Admin selects payment review section.
2. System fetches payment transactions.
3. Admin inspects transactions.
4. Admin flags anomalies if detected.
Alternate Flows 3a. No transactions found → System displays
"no transactions available."
```
Post-condition Payment records are reviewed; anomalies are
```
reported.
Table 3.15: Use Case description for Generate System Reports
Field Description
Use Case ID UC_11
Use Case Name Generate System Reports
```
Primary Actor(s) Admin
```
```
Secondary Actor(s) N/A
```
Description Create scheduled or ad-hoc reports on usage,
finances, and platform KPIs.
50
```
Precondition Admin is logged in; system has data to report.
```
Main Flow 1. Admin selects report type and timeframe.
2. System compiles data and generates report.
3. Admin reviews report.
4. System allows export or download.
Alternate Flows 2a. Insufficient data → System notifies
admin.
Post-condition Report is generated and optionally exported.
Table 3.16: Use Case description for Perform System Maintenance
Field Description
Use Case ID UC_12
Use Case Name Perform System Maintenance
```
Primary Actor(s) Admin
```
```
Secondary Actor(s) N/A
```
Description Update platform settings, categories, and
```
metadata; run maintenance tasks and
```
migrations.
```
Precondition Admin is logged in; system is operational.
```
Main Flow 1. Admin navigates to system maintenance
```
section.2. Admin selects task (update,
```
```
migrate, or clean).3. System performs
```
maintenance task.4. System logs all changes.
Alternate Flows 3a. Task fails → System notifies admin with
error details.
```
Post-condition System maintenance tasks are completed; logs
```
updated.
Table 3.17: Use Case description for Investor Registration & Login
Field Description
Use Case ID UC_13
51
Use Case Name Investor Registration & Login
```
Primary Actor(s) Investor
```
```
Secondary Actor(s) N/A
```
Description Create an investor account and securely
authenticate to the platform.
Precondition Investor has internet access and registration
details.
Main Flow 1. Investor navigates to registration page.2.
Fills out registration form.3. System validates
details.4. Investor sets password.5. System
confirms registration and allows login.
Alternate Flows 3a. Invalid or incomplete information →
System prompts to correct.5a. Duplicate
account → System displays error.
Post-condition Investor account created and ready to login.
Table 3.18: Use Case description for View Startup List
Field Description
Use Case ID UC_14
Use Case Name View Startup List
```
Primary Actor(s) Investor
```
```
Secondary Actor(s) N/A
```
Description Browse a curated list of verified startups with
summary information.
Precondition Investor is logged in.
Main Flow 1. Investor navigates to startup listing.2.
System displays verified startups.3. Investor
scrolls or filters list.
Alternate Flows 3a. No startups available → System displays
"no results found."
Post-condition Investor views list of startups.
52
Table 3.19: Use Case description for Search and Filter Startups
Field Description
Use Case ID UC_15
Use Case Name Search and Filter Startups
```
Primary Actor(s) Investor
```
```
Secondary Actor(s) N/A
```
Description Find startups using filters like industry, stage,
location, and traction.
Precondition Investor is logged in.
Main Flow 1. Investor enters search criteria.2. System
filters startups.3. Investor selects startup for
details.
Alternate Flows 2a. No matching startups → System displays
"no results."
Post-condition Investor successfully filters and searches
startups.
Table 3.20: Use Case description for Receive AI Startup Recommendations
Field Description
Use Case ID UC_16
Use Case Name Receive AI Startup Recommendations
```
Primary Actor(s) Investor
```
```
Secondary Actor(s) AI Recommendation Engine
```
Description Get personalized startup suggestions based on
investor preferences and behavior.
```
Precondition Investor is logged in; AI system active.
```
Main Flow 1. Investor opens recommendations page.2.
System queries AI engine.3. AI returns
recommended startups.4. Investor reviews
53
suggestions.
Alternate Flows 2a. AI fails → System displays default startup
list.
Post-condition Investor receives recommended startups.
Table 3.21: Use Case description for Receive View Detailed Startup Profile
Field Description
Use Case ID UC_17
Use Case Name View Detailed Startup Profile
```
Primary Actor(s) Investor
```
```
Secondary Actor(s) N/A
```
Description Open a startup's full profile including
documents, traction metrics, and team info.
```
Precondition Investor is logged in; startup profile exists.
```
Main Flow 1. Investor selects a startup.2. System displays
detailed profile including documents, metrics,
and team.3. Investor reviews information.
Alternate Flows 2a. Profile incomplete → System notifies
investor of missing data.
Post-condition Investor views full startup profile.
Table 3.22: Use Case description for Receive Send Funding Offer to Startup
Field Description
Use Case ID UC_18
Use Case Name Send Funding Offer to Startup
```
Primary Actor(s) Investor
```
```
Secondary Actor(s) Payment Processing System
```
Description Submit an investment proposal with terms,
54
amount, and conditions to a startup.
```
Precondition Investor is logged in; startup profile viewed.
```
Main Flow 1. Investor selects "Send Offer".2. Enters
terms, amount, and conditions.3. System
validates offer.4. System confirms
submission.5. System handles payment
authorization if required.
Alternate Flows 3a. Insufficient funds → System notifies
investor.3b. Startup unavailable → Offer
cannot be sent.
```
Post-condition Funding offer submitted; payment handling
```
initiated if needed.
Table 3.23 : Use Case description for Accept/Reject Funding Requests
Field Description
Use Case ID UC_19
Use Case Name Accept/Reject Funding Requests
```
Primary Actor(s) Investor
```
```
Secondary Actor(s) N/A
```
Description Respond to startup-initiated funding requests
with accept, negotiate, or decline.
```
Precondition Investor is logged in; funding request exists.
```
Main Flow 1. Investor views funding request.2. System
displays details.3. Investor chooses action:
accept, negotiate, decline.4. System updates
request status and notifies startup.
Alternate Flows 3a. Startup cancels request → System notifies
investor.
Post-condition Funding request is processed and startup
notified.
55
Table 3.24 : Use Case description for Create Investment Portfolio
Field Description
Use Case ID UC_20
Use Case Name Create Investment Portfolio
```
Primary Actor(s) Investor
```
```
Secondary Actor(s) N/A
```
Description Organize and track all startups the investor
has funded in a portfolio view.
Precondition Investor is logged in.
Main Flow 1. Investor opens portfolio section.2. System
lists all funded startups.3. Investor organizes
or groups investments.4. System saves
portfolio view.
Alternate Flows 2a. No investments → System displays empty
portfolio message.
Post-condition Investor has a portfolio view of all
investments.
Table 3.25 : Use Case description for Cancel Investment Offer
Field Description
Use Case ID UC_21
Use Case Name Cancel Investment Offer
```
Primary Actor(s) Investor
```
```
Secondary Actor(s) Payment Processing System
```
Description Withdraw a previously submitted funding
offer before it's accepted.
```
Precondition Investor is logged in; offer exists.
```
Main Flow 1. Investor selects pending offer.2. Chooses
"Cancel Offer".3. System confirms
cancellation.4. Payment authorization
56
canceled if initiated.
Alternate Flows 3a. Offer already accepted → Cancellation
denied.
```
Post-condition Investment offer canceled; system updated.
```
Table 3.26: Use Case description for Payment Handling for Investments
Field Description
Use Case ID UC_22
Use Case Name Payment Handling for Investments
```
Primary Actor(s) Investor
```
```
Secondary Actor(s) Payment Processing System
```
Description Manage payment authorizations, transfers,
escrow, and receipts for investments.
```
Precondition Investor is logged in; investment selected.
```
Main Flow 1. System calculates required payment.2.
Investor authorizes transaction.3. Payment
system processes transfer.4. System updates
investment status and sends receipt.
Alternate Flows 2a. Insufficient funds → System notifies
investor.3a. Payment fails → Retry or cancel.
Post-condition Investment payment successfully processed
and recorded.
Table 3.27 : Use Case description for Direct Chat With Startup
Field Description
Use Case ID UC_23
Use Case Name Direct Chat With Startup
```
Primary Actor(s) Investor
```
```
Secondary Actor(s) Messaging System
```
57
Description Communicate directly with startup founders
to discuss terms or ask questions.
```
Precondition Investor is logged in; startup exists.
```
Main Flow 1. Investor opens chat with startup.2. System
connects to messaging server.3. Investor
sends message.4. System delivers message to
startup.
Alternate Flows 3a. Startup offline → System queues
messages for later delivery.
Post-condition Messages exchanged successfully.
Table 3.28 : Use Case description for Join Video Meetings With Startup
Field Description
Use Case ID UC_24
Use Case Name Join Video Meetings With Startup
```
Primary Actor(s) Investor
```
```
Secondary Actor(s) Video Conferencing System
```
Description Participate in live video meetings for pitches,
demos, or negotiations.
```
Precondition Investor is logged in; meeting scheduled.
```
Main Flow 1. Investor clicks join link.2. System connects
to video session.3. Investor participates in live
meeting.
Alternate Flows 2a. Connection fails → System prompts
retry.3a. Meeting canceled → System notifies
investor.
```
Post-condition Investor joins or leaves video session;
```
meeting logged.
Table 3.29: Use Case description for Provide Feedback to Startup
Field Description
Use Case ID UC_25
58
Use Case Name Provide Feedback to Startup
```
Primary Actor(s) Investor
```
```
Secondary Actor(s) N/A
```
Description Leave structured feedback or ratings on
startup progress and pitches.
```
Precondition Investor is logged in; startup profile exists.
```
Main Flow 1. Investor opens feedback form.2. Fills rating
and comments.3. Submits feedback.4. System
saves feedback and notifies startup.
Alternate Flows 2a. Feedback incomplete → System prompts
for required fields.
Post-condition Feedback stored and visible to startup.
Table 3.30: Use Case description for View Investment Reports
Field Description
Use Case ID UC_26
Use Case Name View Investment Reports
```
Primary Actor(s) Investor
```
```
Secondary Actor(s) N/A
```
Description View analytics and reports on portfolio
performance, returns, and milestones.
```
Precondition Investor is logged in; portfolio exists.
```
Main Flow 1. Investor opens reports section.2. System
displays portfolio performance data.3.
Investor reviews graphs and metrics.
Alternate Flows 2a. No investments → System displays empty
report.
Post-condition Investor has viewed reports and performance
analytics.
59
Table 3.31: Use Case description for Startup Registration & Login
Field Description
Use Case ID UC_27
Use Case Name Startup Registration & Login
```
Primary Actor(s) Startup
```
```
Secondary Actor(s) N/A
```
Description Sign up a startup account, claim company
profile, and authenticate securely.
Precondition Startup has internet access and company
details.
Main Flow 1. Startup navigates to registration page.2.
Fills out registration form with company
details.3. System validates and confirms
registration.4. Startup logs in successfully.
Alternate Flows 3a. Duplicate account → System notifies
startup.3b. Invalid information → System
prompts correction.
Post-condition Startup account created and ready for login.
Table 3.32: Use Case description for Create Startup Project
Field Description
Use Case ID UC_28
Use Case Name Create Startup Project
```
Primary Actor(s) Startup
```
```
Secondary Actor(s) N/A
```
Description Create a project or funding request with
summary, goals, and required amount.
Precondition Startup is logged in.
Main Flow 1. Startup navigates to "Create Project".2.
60
Fills in project summary, goals, and required
funding.3. Submits project.4. System saves
project and makes it visible to investors.
Alternate Flows 2a. Missing required fields → System
prompts to complete.
Post-condition Project created and available for review.
Table 3.33: Use Case description for Upload Project Documents
Field Description
Use Case ID UC_29
Use Case Name Upload Project Documents
```
Primary Actor(s) Startup
```
```
Secondary Actor(s) N/A
```
Description Upload pitch decks, business plans, financials,
and demo videos for investor review.
```
Precondition Startup is logged in; project exists.
```
Main Flow 1. Startup selects project.2. Uploads required
documents.3. System validates file formats
and size.4. System saves documents and links
them to project.
Alternate Flows 2a. Invalid file format → System rejects
upload.2b. Upload fails → System prompts
retry.
Post-condition Project documents successfully uploaded and
accessible to investors.
Table 3.34: Use Case description for Update Project Progress
Field Description
Use Case ID UC_30
Use Case Name Update Project Progress
```
Primary Actor(s) Startup
```
```
Secondary Actor(s) N/A
```
61
Description Post milestones, traction updates, and
progress reports to the project timeline.
```
Precondition Startup is logged in; project exists.
```
Main Flow 1. Startup navigates to project timeline.2.
Adds updates or milestones.3. System
validates and saves updates.4. Updates visible
to investors.
Alternate Flows 2a. Update exceeds allowed format/size →
System prompts correction.
Post-condition Project progress updated and visible.
Table 3.35: Use Case description for Search Investors and Mentors
Field Description
Use Case ID UC_31
Use Case Name Search Investors and Mentors
```
Primary Actor(s) Startup
```
```
Secondary Actor(s) N/A
```
Description Find potential investors or mentors using
filters and connectivity options.
Precondition Startup is logged in.
Main Flow 1. Startup enters search/filter criteria.2.
System displays matching
investors/mentors.3. Startup selects
individuals for interaction.
Alternate Flows 2a. No matches → System shows "no results
found."
Post-condition Startup finds investors/mentors.
Table 3.36: Use Case description for AI Investor/Mentor Recommendations
Field Description
Use Case ID UC_32
62
Use Case Name AI Investor/Mentor Recommendations
```
Primary Actor(s) Startup
```
```
Secondary Actor(s) AI Recommendation Engine
```
Description Receive AI-driven suggestions for best-fit
investors and mentors.
```
Precondition Startup is logged in; AI system active.
```
Main Flow 1. Startup opens recommendations page.2.
System queries AI engine.3. AI returns
suggested investors/mentors.4. Startup
reviews suggestions.
Alternate Flows 2a. AI system unavailable → Default list
shown.
Post-condition Startup receives recommended
investors/mentors.
Table 3.37: Use Case description for Apply for Investment
Field Description
Use Case ID UC_33
Use Case Name Apply for Investment
```
Primary Actor(s) Startup
```
```
Secondary Actor(s) N/A
```
Description Submit an application to receive funding,
including documents and funding needs.
```
Precondition Startup is logged in; project exists.
```
Main Flow 1. Startup selects "Apply for Investment".2.
Completes application form and attaches
documents.3. Submits application.4. System
```
validates and forwards to investor(s).
```
Alternate Flows 2a. Missing documents → System prompts
upload.3a. Application exceeds limits →
System rejects submission.
Post-condition Investment application submitted
successfully.
63
Table 3.38: Use Case description for Chat With Investors
Field Description
Use Case ID UC_34
Use Case Name Chat With Investors
```
Primary Actor(s) Startup
```
```
Secondary Actor(s) Messaging System
```
Description Communicate in real-time with interested
investors to answer questions and negotiate.
```
Precondition Startup is logged in; investors available.
```
Main Flow 1. Startup opens chat.2. System connects to
messaging server.3. Startup sends/receives
messages.4. Investor responds.
Alternate Flows 3a. Investor offline → Messages queued.
Post-condition Messages successfully exchanged.
Table 3.39: Use Case description for Participate in Video Meetings
Field Description
Use Case ID UC_35
Use Case Name Participate in Video Meetings
```
Primary Actor(s) Startup
```
```
Secondary Actor(s) Video Conferencing System
```
Description Host or join video calls for pitches, product
demos, and Q&A sessions.
```
Precondition Startup is logged in; meeting scheduled.
```
Main Flow 1. Startup joins video meeting.2. System
connects to conferencing server.3. Participates
in live session.
Alternate Flows 2a. Connection fails → System prompts
retry.3a. Meeting canceled → System notifies
startup.
64
Post-condition Startup successfully participates in video
session.
Table 3.40: Use Case description for Track Investment Payments
Field Description
Use Case ID UC_36
Use Case Name Track Investment Payments
```
Primary Actor(s) Startup
```
```
Secondary Actor(s) Payment Processing System
```
Description View payment status for committed funds,
pending deposits, and completed transfers.
```
Precondition Startup is logged in; investment exists.
```
Main Flow 1. Startup opens payment section.2. System
fetches payment status.3. Startup reviews
transaction details.
Alternate Flows 2a. No payments → System displays "no
payments found."
Post-condition Startup views current investment payments.
Table 3.41: Use Case description for View Investor Feedback
Field Description
Use Case ID UC_37
Use Case Name View Investor Feedback
```
Primary Actor(s) Startup
```
```
Secondary Actor(s) N/A
```
Description Access comments, ratings, and suggestions
left by investors and mentors.
```
Precondition Startup is logged in; feedback exists.
```
Main Flow 1. Startup navigates to feedback section.2.
System displays ratings/comments.3. Startup
reviews feedback.
65
Alternate Flows 2a. No feedback → System displays "no
feedback available."
Post-condition Feedback successfully viewed.
Table 3.42: Use Case description for Request Mentorship
Field Description
Use Case ID UC_38
Use Case Name Request Mentorship
```
Primary Actor(s) Startup
```
```
Secondary Actor(s) N/A
```
Description Send requests to mentors for guidance,
including goals and expected outcomes.
```
Precondition Startup is logged in; mentors exist.
```
Main Flow 1. Startup selects "Request Mentorship".2.
Fills out request form.3. Submits request.4.
```
System notifies selected mentor(s).
```
Alternate Flows 2a. Form incomplete → System prompts
completion.
Post-condition Mentorship request sent to mentor.
Table 3.43: Use Case description for Accept Mentor Offer
Field Description
Use Case ID UC_39
Use Case Name Accept Mentor Offer
```
Primary Actor(s) Startup
```
```
Secondary Actor(s) N/A
```
Description Approve mentorship proposals and schedule
sessions with chosen mentors.
```
Precondition Startup is logged in; mentor offer exists.
```
66
Main Flow 1. Startup reviews mentor proposal.2. Accepts
proposal.3. System schedules sessions and
notifies mentor.
Alternate Flows 2a. Decline → System notifies mentor of
rejection.
Post-condition Mentorship offer accepted and sessions
scheduled.
Table 3.44: Use Case description for Remove Mentor
Field Description
Use Case ID UC_40
Use Case Name Remove Mentor
```
Primary Actor(s) Startup
```
```
Secondary Actor(s) N/A
```
Description End an active mentorship relationship and
update mentorship records.
```
Precondition Startup is logged in; mentor assigned.
```
Main Flow 1. Startup selects "Remove Mentor".2. System
confirms removal.3. Updates mentorship
records.4. Notifies mentor of removal.
Alternate Flows 2a. Mentor unavailable → System logs
request for admin intervention.
```
Post-condition Mentor removed; records updated.
```
Table 3.45: Use Case description for Chat With Mentor
Field Description
Use Case ID UC_41
Use Case Name Chat With Mentor
```
Primary Actor(s) Startup
```
67
```
Secondary Actor(s) Messaging System
```
Description Text-based communication channel to get
advice and follow-up questions answered.
```
Precondition Startup is logged in; mentor assigned.
```
Main Flow 1. Startup opens chat.2. System connects to
messaging server.3. Messages exchanged.
Alternate Flows 3a. Mentor offline → Messages queued.
Post-condition Messages successfully exchanged.
Table 3.46: Use Case description for Join Mentor Video Sessions
Field Description
Use Case ID UC_42
Use Case Name Join Mentor Video Sessions
```
Primary Actor(s) Startup
```
```
Secondary Actor(s) Video Conferencing System
```
Description Participate in scheduled live mentorship calls
and webinars.
```
Precondition Startup is logged in; session scheduled.
```
Main Flow 1. Startup joins video session.2. System
connects to server.3. Startup participates in
session.
Alternate Flows 2a. Connection fails → Retry or notify
admin.3a. Session canceled → System
notifies startup.
Post-condition Startup participates in video session.
Table 3.47: Use Case description for View Startup Status
Field Description
Use Case ID UC_43
68
Use Case Name View Startup Status
```
Primary Actor(s) Startup
```
```
Secondary Actor(s) N/A
```
```
Description See the current status of the startup (Pending,
```
```
Active, Funded, Mentored, Closed).
```
```
Precondition Startup is logged in; project exists.
```
Main Flow 1. Startup opens dashboard.2. System displays
current status of projects.
Alternate Flows 2a. No project exists → System shows "no
active projects."
Post-condition Startup status successfully viewed.
Table 3.48: Use Case description for Mentor Registration & Login
Field Description
Use Case ID UC_44
Use Case Name Mentor Registration & Login
```
Primary Actor(s) Mentor
```
```
Secondary Actor(s) N/A
```
Description Create a mentor profile, verify expertise, and
sign in securely.
Precondition Mentor has internet access and expertise
details.
Main Flow 1. Mentor navigates to registration page.2.
Fills out registration form.3. System validates
and confirms registration.4. Mentor logs in
successfully.
Alternate Flows 3a. Duplicate account → System notifies
mentor.3b. Invalid information → System
prompts correction.
Post-condition Mentor account created and ready for login.
69
Table 3.49: Use Case description for Accept or Reject Mentorship Request
Field Description
Use Case ID UC_45
Use Case Name Accept or Reject Mentorship Request
```
Primary Actor(s) Mentor
```
```
Secondary Actor(s) N/A
```
Description Respond to startups' mentorship requests
based on fit and availability.
```
Precondition Mentor is logged in; mentorship requests
```
exist.
Main Flow 1. Mentor views pending requests.2. Reviews
request details.3. Accepts or rejects request.4.
System notifies startup.
Alternate Flows 3a. Mentor unavailable → System queues
request.
```
Post-condition Request is accepted/rejected; startup notified.
```
Table 3.50: Use Case description for Send Mentorship Proposal
Field Description
Use Case ID UC_46
Use Case Name Send Mentorship Proposal
```
Primary Actor(s) Mentor
```
```
Secondary Actor(s) N/A
```
Description Initiate offers to startups outlining scope,
duration, and fees for mentorship.
Precondition Mentor is logged in.
Main Flow 1. Mentor selects startup.2. Fills proposal
form with scope, duration, fees.3. Submits
proposal.4. System sends proposal to startup.
Alternate Flows 2a. Missing fields → System prompts
70
correction.3a. Submission fails → Retry.
Post-condition Proposal sent and visible to startup.
Table 3.51: Use Case description for View Startup Profiles
Field Description
Use Case ID UC_47
Use Case Name View Startup Profiles
```
Primary Actor(s) Mentor
```
```
Secondary Actor(s) N/A
```
Description Review startup information and documents to
assess suitability before mentoring.
```
Precondition Mentor is logged in; startup exists.
```
Main Flow 1. Mentor selects startup profile.2. System
displays startup details, documents, and
history.3. Mentor reviews information.
Alternate Flows 2a. Profile incomplete → System shows
warning.
Post-condition Startup profile reviewed by mentor.
Table 3.52: Use Case description for Provide Learning Resources
Field Description
Use Case ID UC_48
Use Case Name Provide Learning Resources
```
Primary Actor(s) Mentor
```
```
Secondary Actor(s) N/A
```
Description Share templates, guides, and documents to
help startups improve operations.
Precondition Mentor is logged in.
71
Main Flow 1. Mentor selects resources.2. Uploads files or
links.3. System saves and shares resources
with startup.
Alternate Flows 2a. File format invalid → System rejects
upload.
Post-condition Resources successfully shared with startup.
Table 3.53: Use Case description for Schedule Mentorship Sessions
Field Description
Use Case ID UC_49
Use Case Name Schedule Mentorship Sessions
```
Primary Actor(s) Mentor
```
```
Secondary Actor(s) N/A
```
Description Propose and confirm dates/times for coaching
sessions with calendar integration.
```
Precondition Mentor is logged in; mentorship request
```
accepted.
Main Flow 1. Mentor selects startup.2. Proposes available
dates/times.3. Startup confirms.4. System
schedules session and notifies both parties.
Alternate Flows 2a. Proposed date unavailable → Mentor
selects alternate date.
Post-condition Mentorship session scheduled.
Table 3.54: Use Case description for Host Live Mentorship Video Session
Field Description
Use Case ID UC_50
Use Case Name Host Live Mentorship Video Session
```
Primary Actor(s) Mentor
```
```
Secondary Actor(s) Video Conferencing System
```
72
Description Conduct real-time video coaching, share
screens, and assign follow-ups.
```
Precondition Mentor is logged in; session scheduled.
```
Main Flow 1. Mentor starts video session.2. System
connects to conferencing server.3. Conducts
live mentoring.4. Assigns follow-ups if
needed.
Alternate Flows 2a. Connection fails → Retry or notify
admin.3a. Session canceled → System
notifies startup.
Post-condition Mentorship session completed successfully.
Table 3.55: Use Case description for Chat With Startup
Field Description
Use Case ID UC_51
Use Case Name Chat With Startup
```
Primary Actor(s) Mentor
```
```
Secondary Actor(s) Messaging System
```
Description Maintain ongoing text conversations to
provide short-form advice and clarifications.
```
Precondition Mentor is logged in; startup assigned.
```
Main Flow 1. Mentor opens chat.2. System connects to
messaging server.3. Messages exchanged with
startup.
Alternate Flows 3a. Startup offline → Messages queued.
Post-condition Messages successfully exchanged.
Table 3.56: Use Case description for Share Materials During Session
Field Description
Use Case ID UC_52
Use Case Name Share Materials During Session
73
```
Primary Actor(s) Mentor
```
```
Secondary Actor(s) N/A
```
Description Send files or links during sessions to illustrate
points or assign work.
```
Precondition Mentor is logged in; session active.
```
Main Flow 1. Mentor selects file/link.2. Shares with
startup.3. System saves and delivers material.
Alternate Flows 2a. File too large → System rejects upload.
Post-condition Materials successfully shared.
Table 3.57: Use Case description for Submit Mentorship Reports
Field Description
Use Case ID UC_53
Use Case Name Submit Mentorship Reports
```
Primary Actor(s) Mentor
```
```
Secondary Actor(s) N/A
```
Description Provide session summaries, action items, and
progress notes to startups and admin.
Precondition Mentor completed session.
Main Flow 1. Mentor writes session report.2. Submits
report.3. System saves and shares with startup
and admin.
Alternate Flows 2a. Submission fails → Retry.
Post-condition Mentorship report submitted successfully.
Table 3.58: Use Case description for View Mentorship History
Field Description
Use Case ID UC_54
74
Use Case Name View Mentorship History
```
Primary Actor(s) Mentor
```
```
Secondary Actor(s) N/A
```
Description Access records of past sessions, outcomes,
and mentor ratings.
Precondition Mentor is logged in.
Main Flow 1. Mentor navigates to history.2. System
displays past sessions, outcomes, and ratings.
Alternate Flows 2a. No history → System shows "no records
found."
Post-condition Mentor views history successfully.
Table 3.59: Use Case description for Receive Mentorship Payments
Field Description
Use Case ID UC_55
Use Case Name Receive Mentorship Payments
```
Primary Actor(s) Mentor
```
```
Secondary Actor(s) Payment Processing System
```
Description Handle payments for paid mentorship
sessions and generate receipts.
```
Precondition Mentor is logged in; session completed.
```
Main Flow 1. Mentor checks payments.2. System
retrieves transaction status.3. Mentor views
receipts.
Alternate Flows 2a. No payment → System shows "pending"
or "none".
Post-condition Mentor receives payments and receipts.
Table 3.60: Use Case description for End Mentorship Engagement
75
Field Description
Use Case ID UC_56
Use Case Name End Mentorship Engagement
```
Primary Actor(s) Mentor
```
```
Secondary Actor(s) N/A
```
Description Formally close mentorship with final
reporting and feedback.
```
Precondition Mentor is logged in; mentorship active.
```
Main Flow 1. Mentor selects "End Engagement".2.
System confirms closure.3. Saves final
report.4. Notifies startup and admin.
Alternate Flows 2a. Mentorship already closed → System
notifies mentor.
Post-condition Mentorship engagement successfully closed.
3.4 Activity Diagram
Below are diagrams we have created to help describe the steps performed in some of the use
cases listed in the above sections as well as simplify and improve the processes in these
complicated use cases.
76
Fig 3.3: Activity Diagram for User Registration
77
Fig 3.4: Activity Diagram for Create and Publish Project
Fig 3.5: Activity Diagram for Apply to Investor
78
Fig 3.6: Activity Diagram for Review Investment Proposal
79
Fig 3.7: Activity Diagram for Process Investment Funding
80
Fig 3.8: Activity Diagram for Schedule Mentorship Session
81
3.5 Behavioral/Dynamic Modeling
We have conducted behavioral modeling to indicate how the system will respond to external
events or stimuli. To achieve this, we have represented the behavior of the systemas a function of
specific events and time.
3.5.1 sequence diagram
The sequence diagram illustrates the complete end-to-end operational flow of the StartupConnect
Ethiopia platform, detailing how all four primary user roles Startup, Investor, Mentor, and Admin
interact with the system and with each other. It also visualizes how AI-driven features and
payment services support these interactions. The diagram is structured around the platform’s
major functional areas: registration and verification, AI-powered matching, investment
workflows, mentorship workflows, communication, payment handling, admin oversight, and
exception paths.[21][22]
1. Registration & Verification Workflow
```
All users (Startup, Investor, Mentor) begin by creating an account and submitting required
```
profile details.
The Admin receives verification requests and performs manual approval.
● If approved → The user becomes Active and gains access to their dashboard.
● If rejected → The workflow ends with a Rejected notification.
This ensures that only authentic, verified users can participate in investments and mentorship
processes.
2. AI-Driven Recommendations
Whenever a Startup, Investor, or Mentor initiates a search:
● The platform sends profile and project data to the AI Module.
● The AI analyzes interests, skills, funding size, and compatibility signals.
```
● The system returns ranked recommendations (e.g., suitable investors for startups,
```
```
relevant startups for investors, suitable mentors for startups).
```
This enables smarter, personalized matchmaking for all parties.
3. Investment Workflow
82
A Startup applies to an Investor after viewing recommendations or search results.
The Investor reviews the application and either:
● Accepts → Sends an investment offer
● Rejects → The workflow moves to the "Rejected" alternate path
If the Startup accepts the offer:
● The payment process is initiated through the Payment Gateway.
● The Investor completes the transaction.
● The Startup receives confirmation once payment succeeds.
After funding, the Startup can:
● Track payments
● Update progress
● Upload milestone reports
If payment fails, the diagram includes a Failed Payment alternate path.
4. Mentorship Workflow
A Startup selects a mentor via search or AI recommendations and submits a mentorship request.
The Mentor can:
● Accept → Scheduling and mentorship sessions begin
```
● Reject → The startup is notified (alternate rejection path)
```
Once accepted:
● Mentor schedules sessions
● Video calls and resource sharing take place
● Mentor submits guidance reports
● Startup marks mentorship completion
Both parties exchange feedback at the end of the mentorship cycle.
5. Communication & Collaboration
The platform supports direct communication channels:
● Direct messaging between Startup ↔ Investor or Startup ↔ Mentor
● Video conferencing for meetings and interviews
● Document exchange for reports, proposals, and session summaries
83
This interaction layer ensures seamless relationship-building within the platform.
6. Payment & Transaction Oversight
All financial activities, startup funding and mentor compensation, flow through the Payment
Gateway.
● Investors initiate payments for startup investment.
● The system triggers mentor payments upon mentorship acceptance.
● The Admin oversees all payment events for compliance and dispute resolution.
Failed payments trigger specific exception flows included in the diagram.
7. Admin Monitoring & Platform Management
Admins have global oversight across the platform:
● User account moderation
● Content monitoring
● Fraud detection and removal of suspicious accounts
● Analytics and reporting
● Oversight of all transactions
The admin role ensures platform integrity and proper functioning of all workflows.
8. Alternate / Exception Paths Included
The diagram also covers non-ideal but realistic paths:
● Startup rejected during onboarding
● Investor rejected
● Mentor rejected
● Payment failure during investment or mentorship
● Mentorship request rejection
● Investment application rejection
84
Fig 3.9: Sequence Diagram for User Registration and Verification Process
85
Fig 3.10: Sequence Diagram for User Login
86
Fig 3.11: Sequence Diagram for Admin Login and Authentication
Fig 3.12: Sequence Diagram for Remove or Disable User Account
87
Fig 3.13: Sequence Diagram for Create Startup Project
88
Fig 3.14: Sequence Diagram for Update Startup Project
89
Fig 3.15: Sequence Diagram for Search Investors and Mentors
Fig 3.16: Sequence Diagram for Create Investment Portfolio
90
Fig 3.17: Sequence Diagram for AI Recommendation System
91
Fig 3.18: Sequence Diagram for Startup Owners Apply for Investment
92
Fig 3.19: Sequence Diagram for Investor Startup Discovery
93
Fig 3.20: Sequence Diagram for Chat & Negotiation Between Startup and Investor
94
Fig 3.21: Sequence Diagram for Investment Acceptance & Decision
95
Fig 3.22: Sequence Diagram for Investment Payment Processing
96
Fig 3.23: Sequence Diagram for Mentor Discovery
Fig 3.24: Sequence Diagram for Mentorship Request
97
Fig 3.25: Sequence Diagram for Mentor Approval / Rejection
98
Fig 3.26: Sequence Diagram for Mentorship Scheduling & Calendar Sync
99
Fig 3.27: Sequence Diagram for Provide Learning Resources
100
Fig 3.28: Sequence Diagram for Mentor Session Payment
101
Fig 3.29: Sequence Diagram for Notification & Real Time Updates
Fig 3.30: Sequence Diagram for Reports & Analytics Module
102
Fig 3.31: Sequence Diagram for Compliance, Audits & Security Logs
103
Fig 3.32: Sequence Diagram for Admin Monitoring & Management Process
3.6 Class Based Modeling
We have conducted class-based modeling to identify classes, attributes and relationships that our
system will use. We used UML class diagrams to represent these classes.[20]
3.6.1 Identifying Classes
This table shows all the main classes in the platform with their IDs. Each class represents a user
type, system object, or integration, and the IDs help in referencing them in diagrams and
documentation.
104
ID Class Name
C_1 User
C_2 Admin
C_3 StartupOwner
C_4 Investor
C_5 Mentor
C_6 Project
C_7 Document
C_8 InvestmentRequest
C_9 Investment
C_10 MentorshipRequest
C_11 MentorshipSession
C_12 Message
C_13 Feedback
C_14 PaymentTransaction
Table 3.61: List of Classes and Identifiers
3.6.2 Class Diagram
This class diagram shows the main entities in the platform, including users, roles, startups,
projects, and integrations, along with their associations and identifiers. It provides a high-level
view of the system structure to support design and development.
105
Fig 3.33: Class Diagram of the Platform Entities
Chapter Four - System Design
4.1 Overview
This chapter describes how the system’s components, modules, data and interfaces are organized
to support collaboration between startups, investors, mentors and administrators. The goal of the
design is to translate system requirements into a clear and practical structure that can be
implemented efficiently.
The system design focuses on ensuring that the platform can support real world usage scenarios
such as project creation, investment management, mentorship coordination, communication and
administrative control. By defining the architecture and system elements early, the design helps
reduce development complexity, avoid unnecessary implementation costs and improve system
performance and user experience.
4.2 System Design
The system design follows a modular and object-oriented approach to ensure clarity, scalability
and ease of maintenance. The design decomposes the system into well-defined components each
106
responsible for a specific function such as user management, project handling, investment
processing, mentorship coordination, communication and administration.
The system is designed using a layered structure, separating presentation, application logic and
data management. This separation allows independent development and modification of system
components without affecting the entire platform. Core business entities such as users, projects,
investments, mentorships and transactions are modeled as classes to reflect real world
interactions within the startup ecosystem.
4.2.1 Design Goal
The system is designed to deliver a reliable, usable, secure and scalable platform that supports
effective collaboration among startups, investors and mentors. The following design goals
guided the system design:
- Reliability : The system is expected to operate consistently in an internet based
environment and provide uninterrupted access to essential services such as
authentication, project management and communication features.
- Usability : The system is emphasized to ensure that users can interact with the platform
easily regardless of their technical background. The interface and system flow are
designed to be simple and intuitive, allowing new users to complete basic tasks quickly
while enabling experienced users to work efficiently.
- Reusability: Is achieved through the use of modular and object-oriented design
principles. Common functionalities are encapsulated in reusable components, reducing
duplication and making the system easier to maintain and extend.
- Availability: The system is intended to be accessible at any time from internet enabled
devices, supporting continuous engagement across different user groups.
107
- Security: The system incorporates authentication mechanisms, role based access control
and controlled access to sensitive information to protect users and maintain platform
integrity.
- Scalability: The system is designed to handle multiple users accessing the platform at the
same time without affecting performance.
4.3 System Decomposition
4.3.1 Overview of System Decomposition
System decomposition is a fundamental design activity that involves dividing a complex system
into smaller, manageable, and logically independent subsystems. This approach enhances system
clarity, supports modular development, and simplifies implementation, testing, and maintenance.
By clearly defining subsystem responsibilities and interactions, the overall system becomes
easier to understand and extend.
In the case of StartupConnect Ethiopia, system decomposition is applied to separate core
platform functionalities such as user handling, startup and investment management, mentorship
coordination, communication, and administrative control. Each subsystem is designed to address
a specific functional concern while collaborating with other subsystems to achieve the platform’s
objectives.
This modular structure allows individual subsystems to be developed and modified
independently without affecting the stability of the entire system. It also improves scalability, as
additional features or services can be integrated in the future with minimal impact on existing
components. The decomposition therefore provides a strong architectural foundation for building
a reliable, secure, and maintainable platform that supports interactions among startups, investors,
mentors, and administrators.
4.3.2 High-Level System Decomposition
At a high level, the StartupConnect Ethiopia platform is decomposed into a set of major
subsystems based on functional responsibilities and system roles. These subsystems collectively
support the end-to-end operation of the platform, from user interaction to data storage and
administrative oversight.
The User Management Subsystem is responsible for handling user registration, profile
management, and role assignment for startups, investors, mentors, and administrators. Closely
related to this is the Authentication and Authorization Subsystem, which ensures secure
access through identity verification and role-based access control.
The Core Business Logic Subsystem forms the central processing component of the platform. It
manages startup listings, investor matching, mentorship coordination, and investment workflows
108
by applying predefined business rules and validation logic. This subsystem coordinates
interactions among users and ensures that platform operations follow established processes.
The Data Management Subsystem supports persistent storage and retrieval of system data,
including user profiles, startup information, investment records, and mentorship activities. It
ensures data consistency, integrity, and availability across the platform.
To facilitate smooth interaction between system components, the Communication and
Integration Subsystem manages data exchange between the user interface and backend
services, as well as integration with external services when required.
Finally, the Reporting and Administration Subsystem provides administrative oversight,
system monitoring, and reporting capabilities. This subsystem enables administrators to monitor
platform usage, generate analytical reports, and manage system configurations.
Together, these subsystems form a cohesive and well-structured system architecture that supports
the functional and non-functional requirements of StartupConnect Ethiopia while allowing future
growth and enhancement.
109
Fig 4.1: High-Level System Decomposition Diagram
4.3.3 User Management Subsystem
The User Management Subsystem is responsible for handling all activities related to user
accounts within the StartupConnect Ethiopia platform. It serves as the entry point for system
users and manages their identity, profile information, and access privileges. This subsystem
supports different categories of users, including startups, investors, mentors, and system
administrators.
By centralizing user-related operations, the subsystem ensures consistency, security, and proper
access control across the platform. It also interacts closely with the authentication and
authorization mechanisms to ensure that users are granted appropriate permissions based on their
assigned roles.
The User Management Subsystem is decomposed into three main modules: the User Registration
Module, the Profile Management Module, and the Role and Permission Management Module.
110
4.3.3.1 User Registration Module
The User Registration Module is responsible for creating new user accounts on the platform. It
provides structured mechanisms for onboarding startups, investors, mentors, and administrators.
During registration, the module collects essential user information and performs validation to
ensure data accuracy and completeness.
This module verifies that user inputs meet system requirements, such as unique identifiers and
valid contact details. Once the registration process is completed successfully, user information is
stored securely and made available to other system components. The User Registration Module
establishes the initial identity of users and enables them to access the platform’s services after
successful authentication.
4.3.3.2 Profile Management Module
The Profile Management Module allows users to view, update, and manage their personal and
organizational information after registration. This includes profile details relevant to the user’s
role, such as startup descriptions, investment interests, mentorship expertise, or contact
information.
The module ensures that profile updates are validated and stored consistently in the system
database. By allowing users to maintain accurate and up-to-date information, the Profile
Management Module improves the quality of interactions and matching processes across the
platform. It also enhances user engagement by providing flexibility and control over profile data.
4.3.3.3 Role and Permission Management Module
The Role and Permission Management Module controls access to system functionalities based on
predefined user roles. Each user is assigned a role that determines the actions they are permitted
to perform within the platform.
This module enforces role-based access control by ensuring that startups, investors, mentors, and
administrators can only access features relevant to their responsibilities. It also supports
administrative functions such as assigning, updating, or revoking user roles when necessary.
Through this mechanism, the system maintains security, prevents unauthorized operations, and
ensures proper separation of responsibilities.
4.3.4 Authentication and Authorization Subsystem
The Authentication and Authorization Subsystem is responsible for ensuring secure access to the
StartupConnect Ethiopia platform. It verifies user identities and controls access to system
111
resources based on assigned roles and permissions. This subsystem plays a critical role in
protecting sensitive user data and maintaining the integrity of platform operations.
The subsystem works closely with the User Management Subsystem to validate user credentials
and enforce access rules. By separating authentication and authorization concerns, the system
achieves a higher level of security and flexibility in managing user access.
The Authentication and Authorization Subsystem is decomposed into two main modules: the
Authentication Module and the Authorization and Access Control Module.
4.3.4.1 Authentication Module
The Authentication Module is responsible for verifying the identity of users attempting to access
the system. It ensures that only registered users with valid credentials can log in to the platform.
This module handles login and logout processes and manages user sessions.
During authentication, user credentials are validated against securely stored records. Appropriate
security mechanisms are applied to protect sensitive information and prevent unauthorized
access attempts. Once authentication is successful, the system establishes a secure session that
allows the user to interact with the platform according to their assigned role.
The Authentication Module also supports session termination and error handling, ensuring that
inactive or invalid sessions do not compromise system security.
4.3.4.2 Authorization and Access Control Module
The Authorization and Access Control Module determines what authenticated users are allowed
to do within the system. It enforces role-based access control by mapping user roles to specific
permissions and system functionalities.
This module ensures that users can only access features and data relevant to their responsibilities.
For example, startups can manage their project profiles, investors can review and track
investment opportunities, mentors can provide guidance, and administrators can manage system
configurations and user accounts.
By strictly enforcing access rules, the Authorization and Access Control Module prevents
unauthorized operations and protects critical system resources. It also supports administrative
functions such as modifying permissions and monitoring access-related activities.
4.3.5 Core Business Logic Subsystem
The Core Business Logic Subsystem represents the central processing component of the
StartupConnect Ethiopia platform. It coordinates all primary system operations by applying
predefined rules, workflows, and decision-making mechanisms. This subsystem acts as an
112
intermediary between user interactions and data storage, ensuring that system processes are
executed correctly and consistently.
By isolating the core logic from user interface and data management concerns, the system
achieves better modularity and maintainability. The Core Business Logic Subsystem interacts
with other subsystems such as User Management, Authentication and Authorization, Data
Management, and Communication to support the platform’s functional requirements.
The subsystem is decomposed into three main modules: the Request Processing Module, the
Workflow and Rule Management Module, and the Decision-Making Module.
4.3.5.1 Request Processing Module
The Request Processing Module serves as the entry point for all system requests that require
business logic execution. It receives validated requests from the user interface and determines the
appropriate actions to be performed.
This module is responsible for interpreting user inputs, coordinating with other subsystems, and
initiating relevant workflows. It ensures that incoming requests follow the correct sequence of
operations and that required conditions are met before processing continues. By managing
request flow, this module maintains system stability and consistency during operation.
4.3.5.2 Workflow and Rule Management Module
The Workflow and Rule Management Module defines and enforces the operational rules of the
platform. It manages system workflows such as startup registration approval, investor–startup
interactions, mentorship assignments, and investment tracking processes.
This module ensures that all actions comply with predefined business rules and platform policies.
By centralizing workflow definitions, the system can adapt to changes in operational
requirements without affecting other subsystems. This approach improves flexibility and
supports the evolution of platform processes over time.
4.3.5.3 Decision-Making Module
The Decision-Making Module supports logical and conditional decisions within the system. It
evaluates system states, user inputs, and workflow conditions to determine appropriate outcomes.
This module plays a key role in processes such as approving or rejecting user actions, matching
startups with investors or mentors, and enforcing platform constraints. By systematically
applying decision logic, the module ensures fairness, consistency, and reliability in system
operations.
113
4.3.6 Data Management Subsystem
The Data Management Subsystem is responsible for handling all data-related operations within
the StartupConnect Ethiopia platform. It ensures that data generated and used by the system is
stored, retrieved, and maintained in a secure, consistent, and reliable manner. This subsystem
supports all other subsystems by providing persistent data storage and controlled data access
mechanisms.
By separating data handling responsibilities from business logic and user interface concerns, the
system improves data integrity, scalability, and maintainability. The Data Management
Subsystem interacts closely with the Core Business Logic Subsystem to support operational
processes and decision-making.
The subsystem is decomposed into three main modules: the Database Access Module, the Data
Validation Module, and the Backup and Recovery Module.
4.3.6.1 Database Access Module
The Database Access Module provides a controlled interface between the system and the
underlying database. It is responsible for executing data storage and retrieval operations required
by the platform, such as creating, reading, updating, and deleting records.
This module ensures that database interactions are performed efficiently and securely. By
centralizing database access, the system reduces redundancy and minimizes the risk of
unauthorized or inconsistent data operations. The module also supports transaction management
to maintain data consistency during concurrent operations.
4.3.6.2 Data Validation Module
The Data Validation Module ensures that all data entering the system meets predefined quality
and consistency standards. It validates data received from other subsystems before it is stored in
the database.
This module checks for completeness, correctness, and adherence to data constraints. By
preventing invalid or inconsistent data from being stored, the Data Validation Module enhances
system reliability and supports accurate system processing and reporting.
4.3.6.3 Backup and Recovery Module
114
The Backup and Recovery Module is responsible for safeguarding system data against loss or
corruption. It supports periodic data backups and provides mechanisms for restoring data in the
event of system failures or unexpected incidents.
This module ensures business continuity and protects critical platform information. By
maintaining reliable backup and recovery processes, the system reduces downtime and preserves
data integrity, which is essential for long-term platform operation.
4.3.7 Communication and Integration Subsystem
The Communication and Integration Subsystem is responsible for enabling reliable interaction
between different components of the StartupConnect Ethiopia platform. It manages the exchange
of data between the user interface, backend services, and external systems where applicable. This
subsystem ensures that information flows smoothly across the system while maintaining
consistency, security, and performance.
By providing standardized communication mechanisms, the subsystem supports modular design
and simplifies integration with future services. It works closely with the Core Business Logic
and Data Management subsystems to ensure that system requests and responses are handled
efficiently.
The Communication and Integration Subsystem is decomposed into three main modules: the API
Management Module, the External Service Integration Module, and the Error Handling and
Logging Module.
4.3.7.1 API Management Module
The API Management Module provides a structured interface for communication between the
frontend and backend components of the system. It defines how system functionalities are
accessed and how data is exchanged through well-defined endpoints.
This module ensures that requests and responses follow consistent formats and communication
protocols. It also supports input validation and response handling, contributing to system
reliability and maintainability. By centralizing API control, the platform simplifies future
enhancements and integration efforts.
4.3.7.2 External Service Integration Module
The External Service Integration Module enables the system to interact with third-party services
when required. These services may include notification systems, external data providers, or
payment and messaging platforms.
This module ensures that external interactions are handled securely and reliably, minimizing
dependency-related risks. It also provides flexibility by allowing additional services to be
integrated in the future without disrupting core system operations.
115
4.3.7.3 Error Handling and Logging Module
The Error Handling and Logging Module is responsible for detecting, managing, and recording
system errors and exceptional events. It captures communication failures, integration issues, and
unexpected runtime conditions.
By maintaining structured logs and handling errors gracefully, this module supports system
monitoring, debugging, and performance analysis. It also contributes to system stability by
preventing unhandled errors from affecting user experience or system integrity.
4.3.8 Reporting and Administration Subsystem
The Reporting and Administration Subsystem provides oversight, control, and analytical
capabilities for the StartupConnect Ethiopia platform. It supports system administrators in
monitoring platform activities, managing users and resources, and generating reports for
decision-making purposes. This subsystem plays a key role in ensuring transparency,
accountability, and effective system governance.
By centralizing administrative functions and reporting mechanisms, the subsystem enables
efficient system management and supports long-term platform sustainability. It interacts with all
major subsystems to collect relevant operational data and enforce administrative policies.
The Reporting and Administration Subsystem is decomposed into three main modules: the
System Reporting Module, the Monitoring and Audit Module, and the Administrative Control
Module.
4.3.8.1 System Reporting Module
The System Reporting Module is responsible for generating structured reports that summarize
platform activities and system performance. These reports provide insights into user engagement,
startup registrations, investment activities, mentorship interactions, and overall system usage.
The module supports the creation of both periodic and on-demand reports, enabling
administrators to evaluate platform effectiveness and identify areas for improvement. By
presenting data in an organized manner, the System Reporting Module facilitates informed
decision-making and strategic planning.
4.3.8.2 Monitoring and Audit Module
The Monitoring and Audit Module tracks system operations and user activities to ensure
compliance with platform policies and security requirements. It records significant system
events, access attempts, and administrative actions for accountability purposes.
116
This module enables administrators to detect anomalies, investigate incidents, and assess system
health. By maintaining detailed audit logs, the system supports transparency and enhances trust
among platform stakeholders.
4.3.8.3 Administrative Control Module
The Administrative Control Module provides tools for managing and configuring the platform. It
allows administrators to perform tasks such as managing user accounts, controlling access
privileges, configuring system settings, and enforcing platform rules.
Through this module, administrators can maintain system integrity and ensure that platform
operations align with organizational policies. The module also supports system maintenance
activities, contributing to the overall reliability and stability of the platform.
4.4 Architecture of the System
The StartupConnect Ethiopia platform is designed using a modular and scalable system
architecture that supports secure interaction between startups, investors, mentors, and
administrators. The architecture enables efficient data management, seamless communication,
AI-assisted matching, and integration with external services such as local payment gateways.
The system follows a structured approach that separates user interaction, business logic, and data
management. This ensures maintainability, scalability, and ease of future enhancement. Both web
and mobile clients communicate with the backend through secure APIs, allowing consistent
behavior across platforms while maintaining centralized control over core functionalities.
The architecture also supports non-functional requirements such as security, performance, and
reliability, which are critical for handling sensitive business information, mentorship records, and
investment-related data.
4.4.1 Architectural Style
```
The system adopts a Layered Architectural Style (N-tier Architecture), which organizes the
```
system into clearly defined layers, each with specific responsibilities.
The main layers include:
● Presentation Layer:
Provides user interfaces for startups, investors, mentors, and administrators through web
and mobile applications. It handles user input, displays system data, and ensures usability
and accessibility.
117
```
● Application (Business Logic) Layer:
```
Implements core system functionalities such as user authentication, startup verification,
investment workflows, mentorship management, and AI-based recommendation logic.
● Data Access Layer:
Manages interactions with the database, ensuring data consistency, integrity, and secure
storage of user profiles, projects, transactions, and system logs.
● Integration Layer:
```
Handles communication with external services, including local payment gateways (e.g.,
```
```
Telebirr and CBE Birr), notification services, and AI modules.
```
Reason for Selection:
The layered architecture was chosen because it promotes separation of concerns, simplifies
maintenance, enhances system security, and allows independent scaling of system components. It
also supports future expansion, such as adding advanced analytics or additional financial
services, without major architectural changes.
4.4.2 Architectural Pattern
```
The system primarily employs the Model–View–Controller (MVC) architectural pattern to
```
structure its internal design.
● Model:
Represents the system’s data and business entities, including startups, investors, mentors,
projects, investments, and mentorship sessions.
● View:
Consists of the user interfaces that present data to users and capture user interactions
through dashboards, forms, and notifications.
● Controller:
Acts as an intermediary that processes user requests, applies business rules, and
coordinates communication between the model and view.
```
Justification:
```
The MVC pattern improves code organization by separating data, presentation, and control
logic. This enhances maintainability, testability, and development efficiency. It also enables
parallel development of frontend and backend components, which is essential for a multi-user,
feature-rich platform like StartupConnect Ethiopia.
118
Additionally, an Observer Pattern is applied within the notification module to enable real-time
updates for events such as mentorship requests, investment offers, and system alerts.
```
Fig 4.2: Model-View-Controller (MVC) Architecture Diagram
```
4.5 Component Diagram
A Component Diagram is a UML diagram used to show the high-level structure of a software
system by illustrating its main components and how they interact. It focuses on functional
decomposition, showing how responsibilities are divided among components and how they
communicate through interfaces. Component diagrams help in understanding system
architecture, managing complexity, and identifying dependencies between subsystems and
external services.
Fig 4.3: Component Diagram
119
4.6 Deployment Diagram
The deployment diagram below aims to describe the hardware where various instances of
components reside at run time. The links between nodes show how communication takes place.
Fig 4.4: Deployment Diagram
4.7 Database Design
The StartupConnect Ethiopia database is designed using a relational model to store and manage
data for startups, investors, mentors, and administrators. It supports user authentication, profile
management, startup projects, investments, mentorship activities, communication, and payment
tracking. The database ensures data integrity through primary and foreign key relationships and
enables secure, scalable, and efficient system operation aligned with the platform’s functional
requirements.
120
Fig 4.5: Entity Relationship Diagram of the StartupConnect Ethiopia System
121
4.8 User Interface Design
Figma link:-
```
https://www.figma.com/design/i0uxLtUGbGrGba5KIT6PBC/Startup-Connect?node-id=0-1&t=sqfogTCS
```
oIKneGRE-1
122
References
[1] AngelList, “About AngelList, Building the Infrastructure That Powers the Startup Economy.”
[Online]. Available: https://www.angellist.com/about
[2] Shega, “Total Valuation of Ethiopian Startups Passes $300M: Report,” Jan. 12, 2025.
[3] Shega, “Challenges in the Addis Ababa Startup Ecosystem.” [Online]. Available: https://shega.co
[4] VC4A, “Unlocking the Next Startup Opportunity.” [Online]. Available: https://vc4a.com/
[5] A. Davidson, M. Thomas, G. Wachori, A. Shrestha, and F. Gitau, Ethiopia Entrepreneurial Ecosystem
```
Mapping. Aspen Network of Development Entrepreneurs (ANDE), 2024.
```
```
[6] Japan International Cooperation Agency (JICA) and Ministry of Innovation and Technology (MInT),
```
Ethiopia Startup Ecosystem Study: Final Report, JICA, Tokyo, Japan, Mar. 2023.
[7] Gebeya Academy, “Tech Talent Development and Startup Support in Ethiopia,” [Online]. Available:
```
https://www.gebeya.com
```
[8] F6S, “Accelerators, Funding, and Startup Programs in Africa,” [Online]. Available:
```
https://www.f6s.com
```
[9] Ethio Telecom, “Telebirr Mobile Payment System Overview,” [Online]. Available:
```
https://www.telebirr.com
```
[10] OECD, University-Industry Collaboration and Innovation: Best Practices, OECD Publishing, 2023.
[11] W. Zhou, X. Liu, and P. Li, “AI-Enabled Matching and Recommendation Systems for Startup
Platforms,” Journal of Business Venturing Insights, vol. 18, 2024.
[12] A. Smith and B. Johnson, “Digital Mentorship Platforms and Their Role in Startup Success,”
International Journal of Entrepreneurship and Innovation, vol. 25, no. 3, pp. 101–115, 2023.
[13] AngelList, "What are the tax consequences for non-U.S. investors in syndicates?," AngelList Help
Center. Available: AngelList website. [Accessed: Nov. 15, 2025].
[14] CrowdCrux, "SeedInvest," CrowdCrux Website. [Accessed: Nov. 15, 2025].
```
[15] Ethiopian Capital Market Authority (ECMA), "Regulatory Sandbox," ECMA Official
```
Documentation. [Accessed: Nov. 15, 2025].
[16] Gust, "Terms of Service," Gust Official Website. [Accessed: Nov. 15, 2025].
```
[17] National Bank of Ethiopia (NBE), "Revised Directive for mobile money providers," NBE News and
```
Publications, Oct. 2023. [Accessed: Nov. 15, 2025].
[18] T. Reporter Ethiopia, "Novel Legislation Grants Foreign Startups Exemption From Investment
Capital Requirements," The Reporter Ethiopia, Aug. 2025. [Accessed: Nov. 15, 2025].
123
[19] UNCDF, "Building Ethiopia's Digital Financial Services Ecosystem: Barriers and Opportunities,"
UNCDF Report, 2022. [Accessed: Nov. 15, 2025].
[20]Jacobson, I., Christerson, M., Jonsson, P., & Övergaard, G., Object-Oriented Software Engineering: A
Use Case Driven Approach, Addison-Wesley, 1992.
[21]Fowler, M., UML Distilled: A Brief Guide to the Standard Object Modeling Language, 3rd Edition,
Addison-Wesley, 2004.
```
[22]Object Management Group (OMG), OMG Unified Modeling Language (UML) Version 2.5.1
```
Specification, 2017. https://www.omg.org/spec/UML/2.5.1/
[23]Pressman, R. S., Software Engineering: A Practitioner’s Approach, 8th Edition, McGraw-Hill, 2014.
[24]Cockburn, A., Writing Effective Use Cases, Addison-Wesley, 2000.
124