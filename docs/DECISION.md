# Product Decision

- **User**: Small retail business owner in India (e.g., Kirana store).
- **Problem**: Manually entering items from wholesale invoices into inventory or accounting software takes hours and is error-prone.
- **Product**: A simple web app where the owner uploads a photo of a wholesale bill and it automatically structures the line items into digital inventory.
- **One-sentence pitch**: Snap a photo of an invoice and instantly digitize it into your inventory using AWS Textract and Bedrock.
- **Primary input**: An image (JPG/PNG) of a wholesale invoice.
- **Primary pipeline**: Frontend (React) -> AWS API Gateway -> Lambda -> AWS Textract (extract raw text) -> Amazon Bedrock (structure into JSON) -> DynamoDB (save).
- **Primary output**: A clean, editable data table showing item names, quantities, and prices.
- **Why AWS is necessary/useful**: AWS Textract is uniquely suited for document extraction, and Amazon Bedrock provides the LLM capability to parse messy OCR data into clean JSON.
- **Demo wow moment**: Uploading a crumpled, messy physical invoice and watching it perfectly populate a clean inventory table in seconds.
- **Explicit non-goals**: Full accounting software, tax calculation, multi-tenant complex login.
- **Biggest technical risk**: Handling messy handwriting or low-quality photos, and API latency during the live pipeline.
