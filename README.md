# 🔬 Lab Co-Pilot

AI-powered lab assistant for researchers, analyze data, visualize results, and query scientific documents using natural language.

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Frontend (Next.js + Tailwind)   :3000          │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐│
│  │DataUpload│ │DocUpload │ │   Chat Panel     ││
│  │  (.csv)  │ │  (.pdf)  │ │ text/plot/table  ││
│  └────┬─────┘ └────┬─────┘ └───────┬──────────┘│
└───────┼─────────────┼───────────────┼───────────┘
        │  HTTP/JSON  │               │
┌───────▼─────────────▼───────────────▼───────────┐
│  Backend (FastAPI + Pandas)    :8000             │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐│
│  │  Data    │ │ Document │ │  Chat + LLM      ││
│  │  Engine  │ │    KB    │ │  (Mistral API)   ││
│  │ (Pandas) │ │(ChromaDB)│ │  Tool Calling    ││
│  └──────────┘ └──────────┘ └──────────────────┘│
└─────────────────────────────────────────────────┘
```

## Modules

### Module 1: Data Analysis & Visualization
- Upload CSV/Excel files
- Filter, aggregate, and describe data using Pandas
- Generate interactive Plotly charts (bar, pie, scatter, line, histogram, box)

### Module 2: Document Knowledge Base
- Upload PDF research papers
- Text extraction via pdfplumber, chunking, and embedding
- Semantic search powered by ChromaDB

### Module 3: Natural Language Chat
- Unified chat interface for data + document queries
- Mistral LLM with function/tool calling
- Inline rendering of plots, tables, and markdown

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- A [Mistral API key](https://console.mistral.ai/)


## API Endpoints

### Data (`/api/data`)
| Method | Endpoint    | Description                     |
|--------|-------------|---------------------------------|
| POST   | `/upload`   | Upload CSV/Excel file           |
| GET    | `/list`     | List uploaded datasets          |
| POST   | `/filter`   | Filter data with query string   |
| POST   | `/aggregate`| Group & aggregate data          |
| POST   | `/describe` | Get summary statistics          |
| POST   | `/plot`     | Generate a Plotly chart         |

### Documents (`/api/docs`)
| Method | Endpoint   | Description                      |
|--------|------------|----------------------------------|
| POST   | `/upload`  | Upload & index a PDF             |
| POST   | `/search`  | Semantic search across documents |
| GET    | `/list`    | List indexed documents           |

### Chat (`/api/chat`)
| Method | Endpoint   | Description                      |
|--------|------------|----------------------------------|
| POST   | `/message` | Send a message, get AI response  |
| GET    | `/history` | Get conversation history         |
| POST   | `/clear`   | Clear conversation history       |

## Project Structure

```
lab_Co-Pilot/
├── backend/
│   ├── main.py                 # FastAPI app, CORS, router mounting
│   ├── store.py                # In-memory data store
│   ├── requirements.txt
│   ├── .env                    # MISTRAL_API_KEY, CHROMA_DB_PATH
│   ├── models/
│   │   └── schemas.py          # Pydantic request/response models
│   ├── routers/
│   │   ├── data.py             # Data analysis endpoints
│   │   ├── documents.py        # Document KB endpoints
│   │   └── chat.py             # Chat endpoints
│   └── services/
│       ├── data_engine.py      # Pandas operations, Plotly charts
│       ├── doc_processor.py    # PDF extraction, chunking, NER
│       ├── knowledge_base.py   # ChromaDB vector store
│       ├── llm.py              # Mistral API + tool calling
│       └── sandbox.py          # Restricted code execution
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx        # Main dashboard (sidebar + chat)
│   │   │   ├── layout.tsx      # Root layout
│   │   │   └── globals.css     # Global styles
│   │   ├── components/
│   │   │   ├── ChatPanel.tsx   # Chat interface
│   │   │   ├── DataUploader.tsx# CSV/Excel upload dropzone
│   │   │   ├── DocUploader.tsx # PDF upload dropzone
│   │   │   ├── PlotViewer.tsx  # Plotly chart renderer
│   │   │   ├── DataTable.tsx   # DataFrame table renderer
│   │   │   └── MessageBubble.tsx# Chat message bubble
│   │   └── lib/
│   │       ├── api.ts          # Axios API client
│   │       └── types.ts        # TypeScript interfaces
│   └── package.json
└── README.md
```

## Example Queries

Once you upload data and/or documents, try:

- *"Show me a bar chart of gene_A expression by age group"*
- *"What's the average survival rate for patients over 50?"*
- *"Filter data where gene_B > 0.8 and age < 40"*
- *"What does the paper say about gene regulation mechanisms?"*
- *"Give me summary statistics for all columns"*

## Tech Stack

| Layer          | Technology                               |
|----------------|------------------------------------------|
| Frontend       | Next.js 16, TypeScript, Tailwind CSS     |
| Charts         | Plotly.js (via react-plotly.js)           |
| Backend        | FastAPI, Python 3.11+                    |
| Data Engine    | Pandas, Plotly                           |
| Vector DB      | ChromaDB                                 |
| PDF Processing | pdfplumber                               |
| NLP / NER      | spaCy (optional)                         |
| LLM            | Mistral API (function calling)           |
