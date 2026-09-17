# KiranaSync (First Commit Hackathon)

## Elevate Pitch
Snap a photo of a wholesale invoice and instantly digitize it into your inventory using AWS AI.

## The Problem
Small retail shop owners in India spend hours manually entering items from wholesale invoices into inventory or accounting software, which is time-consuming and error-prone.

## What We Built
**KiranaSync** is a web app where a user uploads a photo of a physical bill, and it automatically structures the line items into a digital inventory table.

## AWS Integration
- **Amazon Textract (AnalyzeExpense)**: Extracts raw text and standard fields from messy, handwritten, or printed invoices.
- **Amazon Bedrock**: Parses unstructured/semi-structured extractions into a clean JSON array (name, quantity, price).
- **AWS Lambda & API Gateway**: Serverless backend pipeline.
- **DynamoDB**: Stores the resulting structured inventory.

## Setup & Running Locally

*(To be updated by Agent 2)*

## AI Tools Used
- Antigravity AI agents used for product ideation, task management, code generation, and verification.
- Amazon Bedrock used for core product feature (data structuring).
