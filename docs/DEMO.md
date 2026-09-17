# Demo Video Plan (Max 3 Minutes)

- **0:00–0:20 (Problem + User)**: Show a physical wholesale invoice and a ledger. "Small shop owners in India spend hours manually entering inventory."
- **0:20–0:40 (Input)**: Introduce the app. "We built an app that digitizes this instantly." Show the upload interface.
- **0:40–1:50 (Real Workflow executing)**: Upload the invoice. Show a clear loading state (maybe hinting at AWS Textract/Bedrock).
- **1:50–2:20 (Strong Result / Payoff)**: The screen populates with a clean digital table. Show editing a field just in case it's slightly off.
- **2:20–2:40 (AWS Architecture)**: Quick diagram/explanation: React -> API Gateway -> Lambda -> Textract -> Bedrock.
- **2:40–2:55 (Technical Challenge)**: "The hardest part was parsing messy Indian wholesale invoices; Bedrock's structuring made it perfect."
- **2:55–3:00 (Closing frame)**: Team info, Hackathon name.
