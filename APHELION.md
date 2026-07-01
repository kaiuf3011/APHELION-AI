# Project Name

APHELION AI

# Project Goal

Build a production-ready, modern web application for **APHELION AI**, an AI-powered Physics-Informed Solar Flare Forecasting & Nowcasting Platform using Aditya-L1 SoLEXS and HEL1OS data.

This is NOT a college project UI.

Design it like an enterprise platform used by ISRO scientists and mission operators inside a real Space Weather Operations Center.

The application should feel like a combination of:

- NASA Mission Control
- SpaceX Launch Dashboard
- Bloomberg Terminal
- Palantir Foundry
- Datadog Observability
- Grafana
- Apple-level UI polish

The entire design should communicate trust, scientific precision, and real-time intelligence.

---

# Design Language

Theme

Dark Theme

Primary colors

Deep Space Black
Navy
Dark Graphite

Accent colors

Electric Blue
Cyan
Emerald
Amber
Red

Background

Gradient space background with subtle stars.

Glassmorphism only where appropriate.

No childish glowing effects.

Minimal.

Professional.

Premium.

---

Typography

Use clean fonts.

Examples

Inter

Geist

SF Pro Display

IBM Plex Sans

Perfect spacing.

Excellent visual hierarchy.

---

Animations

Very smooth.

60fps.

Framer Motion.

Micro-interactions.

Animated counters.

Animated graphs.

Smooth page transitions.

Hover effects.

Loading skeletons.

Realtime updates.

---

Application Structure

Landing Page

Dashboard

Historical Analysis

Forecast Center

Research Explorer

Settings

Documentation

---

Landing Page

Hero Section

Large animated Sun.

Solar activity animation.

Headline

"Understanding Solar Behaviour Before It Becomes Space Weather."

Subtitle

Explain APHELION AI in one paragraph.

CTA Buttons

Launch Dashboard

View Research

Architecture

Mission Overview

---

Mission Statistics

Cards

Current Solar Status

Current Health Index

Predicted Flare Probability

Today's Events

Prediction Accuracy

Lead Time

Animated counters.

---

Research Highlights

Timeline showing

Quiet Sun

↓

Magnetic Stress

↓

Particle Acceleration

↓

Thermal Build-up

↓

Solar Flare

↓

Recovery

Animated vertical timeline.

---

Technology Section

Interactive architecture diagram.

Hover each block.

Display explanation.

---

Dashboard

Mission Control layout.

Three-column responsive layout.

Left

Current Solar Status

Solar Health Index

Mission Alerts

Current Time

Prediction Confidence

Center

Large synchronized graphs.

Soft X-ray

Hard X-ray

Interactive timeline.

Zoom.

Pan.

Tooltip.

Overlay flare events.

Right

Prediction Panel

Current Risk

Expected Flare Class

Estimated Lead Time

Confidence

Reasoning

Current Behaviour Stage

Historical Similarity

---

Solar Behaviour Engine Panel

This is our USP.

Dedicated section.

Display

Behaviour Fingerprint

Current Stage

Rise Velocity

Peak Ratio

Cross Correlation

Thermal Delay

HXR→SXR Lag

Every metric should have

Current value

Trend

Mini sparkline

Explanation tooltip

---

Solar Health Index

Large circular gauge.

Levels

Quiet

Watch

Warning

Critical

Animated transition.

---

Forecast Center

Forecast Timeline

Next

5 minutes

10 minutes

30 minutes

1 hour

Display

Probability

Expected flare class

Confidence

Lead time

---

Historical Analysis

Search previous flare events.

Compare current behaviour.

Overlay historical graphs.

Display

Similarity Score

Event Date

Flare Class

Peak Flux

Lead Time

Behaviour Fingerprint

---

Research Explorer

Interactive explanation pages.

What is a Solar Flare?

What is the Neupert Effect?

What is Soft X-ray?

What is Hard X-ray?

Interactive diagrams.

Animations.

Scientific illustrations.

---

Architecture Page

Professional architecture diagram.

Data Flow

Aditya-L1

↓

SoLEXS

↓

HEL1OS

↓

Data Synchronization

↓

Solar Behaviour Engine

↓

Feature Engineering

↓

Forecasting Model

↓

Solar Health Index

↓

Alert Engine

↓

Dashboard

Every node clickable.

---

Future Expansion

Display roadmap.

Current

SoLEXS

HEL1OS

Future

VELC

SUIT

MAG

ASPEX

PAPA

Show modular architecture.

---

Components

Use modern components.

Cards

Charts

Timeline

Accordions

Tables

Status indicators

Badges

Command palette

Search

Resizable panels

Notifications

Drawer

Context menu

Modern inputs

Floating panels

---

Charts

Recharts preferred.

Professional styling.

Zoom.

Brush.

Tooltips.

Crosshair.

Live animation.

---

Tables

Modern data grid.

Sorting

Filtering

Search

Pagination

Sticky headers

---

AI Panel

Explainable AI

Display

Prediction

Confidence

Why

Evidence

Contributing Signals

Reasoning

Historical Match

Physics Validation

No fake AI chat.

Instead create a professional Explainable AI panel.

---

Developer Requirements

Framework

Next.js latest

TypeScript

Tailwind CSS

shadcn/ui

Framer Motion

Recharts

Lucide Icons

React Query

Zustand

Responsive.

Dark mode first.

Reusable components.

Component-driven architecture.

Proper folder structure.

No placeholder spaghetti.

No inline styles.

No duplicated code.

Follow clean architecture.

---

MCP Integration

The application must be designed so that future MCP tools can be plugged in without changing the UI.

Separate:

UI Layer

Business Layer

Data Layer

MCP Adapter Layer

Backend API Layer

All widgets should consume abstract interfaces instead of hardcoded JSON.

---

Code Quality

Senior-level production code.

Strong typing.

Reusable hooks.

Reusable utility functions.

No mock code mixed into components.

Well-commented.

Scalable architecture.

---

Overall Goal

When ISRO judges open the application, it should feel like they are looking at an internal mission operations platform rather than a student hackathon project.

The application should emphasize scientific credibility, explainability, modularity, and operational readiness rather than flashy AI visuals.