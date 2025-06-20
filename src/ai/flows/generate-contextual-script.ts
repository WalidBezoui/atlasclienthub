
'use server';
/**
 * @fileOverview Generates contextual scripts based on client or content information.
 *
 * - generateContextualScript - A function to generate scripts.
 * - GenerateContextualScriptInput - Input type for script generation.
 * - GenerateContextualScriptOutput - Output type for script generation.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateContextualScriptInputSchema = z.object({
  scriptType: z.enum([
    "Cold Outreach DM", 
    "Warm Follow-Up DM", 
    "Audit Delivery Message", 
    "Closing Pitch", 
    "Caption Idea"
  ]).describe("The type of script to generate."),
  clientHandle: z.string().optional().describe("The client's Instagram handle (e.g., @brandXYZ)."),
  clientName: z.string().optional().describe("The client's name or company name."),
  clientIndustry: z.string().optional().describe("The client's industry (e.g., Beauty Salon, Fitness Coach)."),
  lastTouch: z.string().optional().describe("Description of the last interaction with the client (e.g., None, Sent intro DM 3 days ago)."),
  desiredAction: z.string().optional().describe("The desired action from the client (e.g., Free Audit Offer, Book a call)."),
  postTopic: z.string().optional().describe("The topic of the social media post for which a caption is needed."),
  brandVoice: z.string().optional().describe("The brand voice to use for the script (e.g., Friendly, strategic, Moroccan)."),
  objectives: z.array(z.string()).optional().describe("Key objectives for the post or outreach (e.g., engagement, DM leads)."),
  additionalNotes: z.string().optional().describe("Any other relevant notes or context to consider for script generation.")
});
export type GenerateContextualScriptInput = z.infer<typeof GenerateContextualScriptInputSchema>;

const GenerateContextualScriptOutputSchema = z.object({
  script: z.string().describe('The generated script.'),
});
export type GenerateContextualScriptOutput = z.infer<typeof GenerateContextualScriptOutputSchema>;

export async function generateContextualScript(input: GenerateContextualScriptInput): Promise<GenerateContextualScriptOutput> {
  return generateContextualScriptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateContextualScriptPrompt',
  input: {schema: GenerateContextualScriptInputSchema},
  output: {schema: GenerateContextualScriptOutputSchema},
  prompt: `You are an expert social media manager and copywriter for "Atlas Social Studio".
Your goal is to generate a concise, effective, and context-aware "{{scriptType}}" script.

Consider the following context:
{{#if clientName}}Client/Company Name: {{clientName}}{{/if}}
{{#if clientHandle}}Client Instagram Handle: {{clientHandle}}{{/if}}
{{#if clientIndustry}}Client Industry: {{clientIndustry}}{{/if}}
{{#if lastTouch}}Last Interaction: {{lastTouch}}{{/if}}
{{#if desiredAction}}Desired Action from Client: {{desiredAction}}{{/if}}

{{#if postTopic}}Post Topic: {{postTopic}}{{/if}}
{{#if brandVoice}}Brand Voice: {{brandVoice}}. Incorporate Moroccan cultural nuances if appropriate and the brand voice allows.{{/if}}
{{#if objectives}}Key Objectives: {{#each objectives}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}.{{/if}}
{{#if additionalNotes}}Additional Notes: {{additionalNotes}}{{/if}}

Based on the script type "{{scriptType}}" and the provided context, generate a compelling and actionable script.
If generating a "Cold Outreach DM" or "Warm Follow-Up DM", keep it brief and suitable for Instagram DMs.
If generating "Caption Idea", provide one engaging caption.
If generating for "Atlas Social Studio", remember the mission: "To empower Moroccan and global brands with striking visuals, strategy-backed content, and Instagram-first creative direction that turns followers into clients."

Generate the script now:
`,
});

const generateContextualScriptFlow = ai.defineFlow(
  {
    name: 'generateContextualScriptFlow',
    inputSchema: GenerateContextualScriptInputSchema,
    outputSchema: GenerateContextualScriptOutputSchema,
  },
  async (input) => {
    // Basic temperature setting, can be adjusted
    const {output} = await prompt(input, { config: { temperature: 0.7, maxOutputTokens: 300 }}); 
    return output!;
  }
);
