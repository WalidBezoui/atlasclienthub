
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-ig-audit.ts';
import '@/ai/flows/generate-contextual-script.ts'; // Add new flow
import '@/ai/flows/generate-qualifier-question.ts';
