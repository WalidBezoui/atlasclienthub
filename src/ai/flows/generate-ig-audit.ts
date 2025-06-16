'use server';

/**
 * @fileOverview An Instagram audit report AI agent.
 *
 * - generateIgAudit - A function that handles the instagram audit generation process.
 * - GenerateIgAuditInput - The input type for the generateIgAudit function.
 * - GenerateIgAuditOutput - The return type for the generateIgAudit function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateIgAuditInputSchema = z.object({
  questionnaireResponses: z
    .string()
    .describe('The responses from the checklist/questionnaire.'),
});
export type GenerateIgAuditInput = z.infer<typeof GenerateIgAuditInputSchema>;

const GenerateIgAuditOutputSchema = z.object({
  auditReport: z.string().describe('The generated Instagram audit report.'),
});
export type GenerateIgAuditOutput = z.infer<typeof GenerateIgAuditOutputSchema>;

export async function generateIgAudit(input: GenerateIgAuditInput): Promise<GenerateIgAuditOutput> {
  return generateIgAuditFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateIgAuditPrompt',
  input: {schema: GenerateIgAuditInputSchema},
  output: {schema: GenerateIgAuditOutputSchema},
  prompt: `You are an expert social media manager specializing in Instagram audits.

You will use the information from the questionnaire to generate a detailed Instagram audit report, providing insights into profile performance, audience demographics, content effectiveness, and areas for improvement.

Questionnaire Responses: {{{questionnaireResponses}}}`,
});

const generateIgAuditFlow = ai.defineFlow(
  {
    name: 'generateIgAuditFlow',
    inputSchema: GenerateIgAuditInputSchema,
    outputSchema: GenerateIgAuditOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
