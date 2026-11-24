# Course Scheduler

A degree-planning system that allows university students to map out coursework, track credit totals, and organize degree progress across pre-college work and four academic years.

## Language

**Catalog Course**:
A course offered natively by the home institution and maintained in the standard academic course catalog.
_Avoid_: Database course, default course, school course, standard course

**Transfer Course**:
Academic credit completed outside the home institution—such as AP exams, dual-enrollment courses, or coursework from another college—transferred into the student's degree plan.
_Avoid_: Custom course, external course, outside course, foreign credit

**Course Equivalency**:
The mapping of a Transfer Course to a specific Catalog Course code that it satisfies at the home institution, fulfilling degree requirements and removing the home course from the available courses list.
_Avoid_: Replacement code, course swap, substitute code, override

**Transfer Credits Section**:
A dedicated schedule section positioned ahead of the four-year plan to hold coursework and examination credits earned prior to attending the university.
_Avoid_: Year 0, pre-year, custom term, external bucket

**Schedule**:
A student's complete academic degree plan, comprising pre-college transfer credits and twelve terms structured across four academic years.
_Avoid_: Degree audit, curriculum table, calendar

**Term**:
An academic session (Fall, Spring, or Summer) within a designated academic year holding a collection of planned courses.
_Avoid_: Semester, quarter, period, block

**Prerequisite**:
Coursework that must be completed in an academic term strictly prior to the enrolled course, or satisfied via Pre-College Transfer Credits.
_Avoid_: Prereq, prior requirement, entry course

**Corequisite**:
Coursework that must be taken either concurrently in the same academic term or completed in an earlier term, or satisfied via Pre-College Transfer Credits.
_Avoid_: Coreq, co-course, parallel requirement

**Requirement Waiver**:
An explicit exemption applied to a scheduled course permitting it to remain on the schedule despite unsatisfied prerequisites or corequisites.
_Avoid_: Override, wave, pass, bypass

**Unsatisfied Requirement Flag**:
A visual warning indicator displayed on a scheduled course card when one or more of its prerequisite or corequisite requirements are unmet.
_Avoid_: Error badge, conflict mark, warning tag
