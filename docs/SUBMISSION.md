# Submission Narrative

**Problem**: Small retail shop owners in India spend excessive time on manual data entry from wholesale invoices into their local inventory ledgers, leading to errors and wasted time.
**Build**: A web application that takes an image of an invoice and automatically converts it into a structured digital inventory list.
**AWS Usage**: 
- **Amazon Textract**: Extracts raw text from the uploaded invoice image.
- **Amazon Bedrock**: Parses the unstructured text into a clean JSON array of items (name, quantity, price).
- **AWS Lambda & API Gateway**: Connects the frontend to the AI services.

**AI Disclosure**:
- Used Antigravity AI agents for product ideation, task management, and code generation.
- Used Amazon Bedrock (via API) for core product functionality.
