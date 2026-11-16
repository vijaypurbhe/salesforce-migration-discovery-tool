# Salesforce Migration Discovery Tool

"Agentic Commerce Intelligence Platform"

Objective:
Demonstrate a future-state Salesforce Commerce Cloud + GA4 ecosystem powered by AI agents that monitor, analyze, recommend, and execute commerce optimizations in real time.

Environment Setup

Simulate:

Salesforce Commerce Cloud storefront

Salesforce Data Cloud unified customer graph

Google Analytics 4 event stream

BigQuery behavioral warehouse

Marketing Cloud activation

CRM integration

Create realistic mock datasets:

2M customers

150K SKUs

18 months of transaction data

Multi-channel attribution data

Paid, organic, social traffic sources

Core Demo Components
1. Executive AI Command Center

Dashboard Sections:

Revenue Overview

Conversion Rate Trend

AOV Trend

Channel Performance

Segment Profitability

Customer Lifetime Value

Cart Abandonment

Inventory Velocity

Add:

Conversational AI input box

Natural language queries

Scenario simulation panel

Forecasting panel

Example prompt capability:
“Why did revenue decline last month?”
System response:

Root cause analysis

Segment breakdown

Channel attribution

Predicted impact

Recommended action

2. Agent Layer Visualization

Create visual cards for each AI agent:

Revenue Agent
Personalization Agent
Merchandising Agent
Retention Agent
Marketing Allocation Agent

Each card displays:

Status (Monitoring / Alert / Acting)

Insight summary

Confidence score

Recommended action

Estimated revenue impact

Execute button (simulate approval workflow)

3. Closed-Loop Optimization Simulation

Scenario 1:
Conversion rate drops 3% on mobile.

System:

Detects anomaly

Diagnoses PDP load time issue

Recommends image compression

Predicts 1.5% uplift

Simulates execution

Shows incremental revenue recovery

Scenario 2:
High-value segment churn risk increases.

System:

Identifies LTV > $2,000 segment

Recommends targeted loyalty offer

Triggers journey simulation

Shows projected retention lift

4. Data Cloud Unified Profile View

Create 360° customer profile:

Identity resolution

Purchase history

Browsing events

Marketing engagement

Predicted LTV

Churn probability

Next best action

Include:

AI-generated summary narrative

Cross-cloud activation simulation

5. Attribution & Budget Optimization Agent

Dashboard shows:

Multi-touch attribution model

ROAS by channel

Budget allocation recommendations

What-if slider to adjust spend

Predicted incremental revenue

6. Governance Layer

Include:

Human approval workflow simulation

AI explainability panel

Decision reasoning summary

Data lineage visualization

UI/UX Requirements

Enterprise-grade design

Dark and light modes

Executive storytelling layout

Real-time streaming effect for alerts

Clean KPI tiles

Agent interaction panel

Scenario simulator controls

Demo Narrative Flow

Executive logs in

AI highlights performance anomaly

Executive asks natural language question

AI provides root cause analysis

Agent recommends action

Executive approves

System simulates revenue impact

Dashboard updates in real time

Technical Framing (Simulated)

Salesforce Data Cloud as unified data model

GA4 event ingestion

BigQuery analytics layer

Einstein predictive modeling

Agentforce autonomous orchestration

Final Deliverable

Produce:

Fully interactive UI prototype

Multiple predefined scenarios

Executive storytelling script

Toggle between “Current State” and “Agentic Future State”

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Firebase Hosting

Deploy from the repository root using Node.js 22 or newer:

```sh
npm install
npx firebase-tools login
npm run deploy:firebase
```

The existing Firebase project alias is `salesforce-cpq-discovery`. If you use a different Firebase project, run `npx firebase-tools use <your-project-id>` before deployment.

`firebase.json` serves the compiled `dist` folder, automatically runs `npm run build` before uploading, and sends app routes to `index.html`. Do not deploy the source `public` folder or run Firebase initialization again: Firebase's generated setup page is not the application.

Keep the project's local `.env` file available when building; Vite embeds its public `VITE_` configuration into the compiled app. Never place private credentials in `VITE_` variables. Firebase Hosting serves the frontend only; existing Lovable Cloud services remain hosted separately.

After deployment, open the Hosting URL printed by the command and refresh an app route such as `/survey`. If Firebase still shows its setup page, confirm the command ran in this repository and that the opened URL belongs to the selected Firebase project/site.
