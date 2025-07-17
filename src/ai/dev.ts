
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-ig-audit.ts';
import '@/ai/flows/generate-contextual-script.ts';
import '@/ai/flows/generate-qualifier-question.ts';
import '@/ai/flows/qualify-prospect.ts';
import '@/ai/flows/discover-prospects.ts';
import '@/ai/flows/discover-hot-prospects.ts';
import '@/ai/flows/generate-comment.ts';
import '@/ai/flows/generate-generic-comment.ts';
import '@/ai/flows/translate-text.ts';
