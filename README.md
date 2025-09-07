# 📚 AI-Powered PDF Search

This project is an **intelligent assistant** that allows you to upload a PDF, extract its content, split it into fragments (*chunks*), generate **embeddings** with an open-source model, and finally perform **semantic searches** and natural language questions using a **local LLM (Gemma via Ollama)**.

---

## ✨ Features

* 📤 **PDF upload** for local analysis.
* ✂️ **Chunking** text for more accurate searches.
* 🧠 **Open-source embeddings** with Hugging Face models.
* 🔍 **Semantic search** using cosine similarity.
* 💬 **RAG assistant** (Retrieval-Augmented Generation) with **Gemma (Ollama)**.
* 🌍 **Multilingual support** (PDFs in Spanish, English, etc.).

---

## 🛠️ Technologies

* [Next.js 14](https://nextjs.org/) (with `app/` and TypeScript)
* [Yarn](https://yarnpkg.com/) as dependency manager
* [pdf-parse](https://www.npmjs.com/package/pdf-parse) to extract text from PDFs
* [HuggingFace Transformers.js](https://huggingface.co/docs/transformers.js) for embeddings
* [Ollama](https://ollama.ai) to run the **Gemma** model locally