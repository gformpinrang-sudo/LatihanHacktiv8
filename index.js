import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import { GoogleGenAI } from "@google/genai";

const app = express();
const upload = multer();
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// **Set your default Gemini model here:**
const GEMINI_MODEL = "gemini-2.5-flash";

app.use(express.json());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server ready on http://localhost:${PORT}`));
