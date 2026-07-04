# Human Resource Management System

**Every workday, perfectly aligned.**

## Overview

The Human Resource Management System is a digital platform designed to simplify and streamline core HR operations. It helps organizations manage employee records, attendance, leave requests, payroll visibility, and approval workflows through a secure role-based system.

The system supports two main user roles: **Admin/HR Officer** and **Employee**.

## Features

### Authentication and Authorization

- Secure user sign up and sign in
- Registration using Employee ID, email, password, and role
- Email verification
- Role-based access control
- Error handling for invalid login credentials

### Employee Dashboard

Employees can access:

- Profile details
- Attendance records
- Leave requests
- Salary details
- Recent activity and alerts
- Logout option

### Admin/HR Dashboard

Admins and HR Officers can access:

- Employee list
- Attendance records of all employees
- Leave approval requests
- Payroll details
- Employee profile management

## User Roles

| User Type | Access |
|---|---|
| Admin / HR Officer | Manages employees, attendance, leave approvals, and payroll details |
| Employee | Views profile, attendance, salary details, and applies for leave |

## Modules

### Employee Profile Management

Employees can view:

- Personal details
- Job details
- Salary structure
- Documents
- Profile picture

Employees can edit limited details such as:

- Address
- Phone number
- Profile picture

Admins can edit all employee information.

### Attendance Management

- Daily and weekly attendance view
- Employee check-in and check-out
- Attendance status tracking:
  - Present
  - Absent
  - Half-day
  - Leave
- Employees can view only their own attendance
- Admins can view attendance records of all employees

### Leave and Time-Off Management

Employees can:

- Apply for leave
- Select leave type:
  - Paid leave
  - Sick leave
  - Unpaid leave
- Choose leave dates using a calendar
- Add remarks
- View monthly attendance with Present/Absent markers
- Track leave status:
  - Pending
  - Approved
  - Rejected

Admins can:

- View all leave requests
- Approve or reject leave applications
- Add comments
- Update employee leave records instantly

### Payroll and Salary Management

Employees can:

- View salary details in read-only mode

Admins can:

- View payroll details of all employees
- Update salary structure
- Maintain payroll accuracy

## System Objectives

- Digitize HR operations
- Reduce manual paperwork
- Improve attendance and leave tracking
- Provide transparent payroll visibility
- Enable faster HR approval workflows
- Maintain secure role-based access

## Non-Functional Requirements

- Secure authentication
- Password validation
- Data privacy for employee records
- Fast dashboard loading
- Responsive user interface
- Reliable attendance and leave updates
- Easy-to-use design for employees and admins

## Future Enhancements

- Automated payroll generation
- Attendance reports and analytics
- Notification system
- Document upload and verification
- Department-wise employee filtering
- Export reports as PDF or Excel

## Project Tagline

**Every workday, perfectly aligned.**

### Run the project with the command 'npm run dev'

