
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-ig-audit.ts';
import '@/ai/flows/generate-contextual-script.ts';
import '@/ai/flows/generate-qualifier-question.ts';
import '@/ai/flows/qualify-prospect.ts';
import '@/ai/flows/discover-prospects.ts';
