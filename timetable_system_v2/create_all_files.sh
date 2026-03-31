#!/bin/bash

# Create all HTML templates
cat > templates/base.html << 'EOF1'
<!DOCTYPE html>
<html><head><title>{% block title %}AI Timetable{% endblock %}</title>
<link rel="stylesheet" href="{{ url_for('static', filename='css/style.css') }}">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head><body>
{% if session.user_id %}<aside class="sidebar"><div class="sidebar-header"><i class="fas fa-calendar-alt"></i><h2>AI Timetable</h2></div>
<nav class="sidebar-nav"><a href="{{ url_for('dashboard') }}" class="nav-item"><i class="fas fa-home"></i><span>Dashboard</span></a>
{% if session.role == 'admin' %}<div class="nav-section">Management</div>
<a href="{{ url_for('departments') }}" class="nav-item"><i class="fas fa-building"></i><span>Departments</span></a>
<a href="{{ url_for('faculty') }}" class="nav-item"><i class="fas fa-chalkboard-teacher"></i><span>Faculty</span></a>
<a href="{{ url_for('subjects') }}" class="nav-item"><i class="fas fa-book"></i><span>Subjects</span></a>
<a href="{{ url_for('subject_allocation') }}" class="nav-item"><i class="fas fa-link"></i><span>Allocate Subjects</span></a>
<a href="{{ url_for('students') }}" class="nav-item"><i class="fas fa-user-graduate"></i><span>Students</span></a>
<a href="{{ url_for('classrooms') }}" class="nav-item"><i class="fas fa-door-open"></i><span>Classrooms</span></a>
<div class="nav-section">Timetable</div><a href="{{ url_for('generate_timetable') }}" class="nav-item"><i class="fas fa-magic"></i><span>Generate</span></a>{% endif %}
<a href="{{ url_for('timetables') }}" class="nav-item"><i class="fas fa-calendar-check"></i><span>Timetables</span></a>
<a href="{{ url_for('notifications') }}" class="nav-item"><i class="fas fa-bell"></i><span>Notifications</span></a></nav>
<div class="sidebar-footer"><div class="user-info"><div class="user-avatar">{{ session.full_name[0] }}</div>
<div class="user-details"><div class="user-name">{{ session.full_name }}</div><div class="user-role">{{ session.role }}</div></div></div>
<a href="{{ url_for('logout') }}" class="logout-btn"><i class="fas fa-sign-out-alt"></i></a></div></aside>{% endif %}
<main class="main-content {% if not session.user_id %}full-width{% endif %}">
{% if session.user_id %}<header class="topbar"><h1 class="page-title">{% block page_title %}Dashboard{% endblock %}</h1></header>{% endif %}
{% with messages = get_flashed_messages(with_categories=true) %}{% if messages %}<div class="flash-messages">{% for category, message in messages %}
<div class="alert alert-{{ category }}"><i class="fas fa-info-circle"></i><span>{{ message }}</span><button class="close-alert">&times;</button></div>{% endfor %}</div>{% endif %}{% endwith %}
<div class="content-wrapper">{% block content %}{% endblock %}</div></main>
<script src="{{ url_for('static', filename='js/main.js') }}"></script></body></html>
EOF1

cat > templates/index.html << 'EOF2'
{% extends "base.html" %}{% block content %}<div class="landing-page"><div class="landing-container"><div class="landing-hero">
<div class="hero-icon"><i class="fas fa-brain"></i></div><h1 class="hero-title">AI-Powered Timetable Management</h1>
<p class="hero-subtitle">Intelligent scheduling using advanced AI algorithms</p>
<div class="hero-buttons"><a href="{{ url_for('login') }}" class="btn btn-primary btn-lg"><i class="fas fa-sign-in-alt"></i> Login</a></div></div></div></div>
<style>.landing-page{min-height:100vh;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);display:flex;align-items:center;justify-content:center;padding:2rem}
.landing-container{max-width:1200px;width:100%}.landing-hero{text-align:center;background:white;border-radius:24px;padding:3rem;box-shadow:0 20px 60px rgba(0,0,0,0.3)}
.hero-icon{width:100px;height:100px;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:2rem}
.hero-icon i{font-size:3rem;color:white}.hero-title{font-size:3rem;font-weight:700;color:#1a202c;margin-bottom:1rem}
.hero-subtitle{font-size:1.2rem;color:#4a5568;margin-bottom:2rem}.hero-buttons{display:flex;gap:1rem;justify-content:center}
.btn-lg{padding:1rem 2.5rem;font-size:1.1rem;border-radius:12px;font-weight:600}</style>{% endblock %}
EOF2

cat > templates/login.html << 'EOF3'
{% extends "base.html" %}{% block content %}<div class="auth-page"><div class="auth-container"><div class="auth-card">
<div class="auth-header"><div class="auth-icon"><i class="fas fa-lock"></i></div><h2>Welcome Back</h2><p>Login to your account</p></div>
<form method="POST" class="auth-form"><div class="form-group"><label><i class="fas fa-user"></i> Username</label>
<input type="text" name="username" class="form-control" required autofocus></div>
<div class="form-group"><label><i class="fas fa-key"></i> Password</label><input type="password" name="password" class="form-control" required></div>
<button type="submit" class="btn btn-primary btn-block"><i class="fas fa-sign-in-alt"></i> Login</button></form></div></div></div>
<style>.auth-page{min-height:100vh;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;padding:2rem}
.auth-container{max-width:450px;width:100%}.auth-card{background:white;border-radius:20px;padding:3rem;box-shadow:0 20px 60px rgba(0,0,0,0.3)}
.auth-header{text-align:center;margin-bottom:2rem}.auth-icon{width:80px;height:80px;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:50%;
display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem}.auth-icon i{font-size:2.5rem;color:white}
.auth-header h2{font-size:2rem;font-weight:700;color:#1a202c;margin-bottom:0.5rem}.auth-header p{color:#4a5568}
.auth-form .form-group{margin-bottom:1.5rem}.auth-form label{display:flex;align-items:center;gap:0.5rem;font-weight:600;color:#2d3748;margin-bottom:0.5rem}</style>{% endblock %}
EOF3

echo "Templates created"
