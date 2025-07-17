
'use server';
/**
 * @fileOverview A simple flow for translating text into a specified language.
 *
 * - translateText - A function that handles the translation.
 * - TranslateTextInput - The input type for the translateText function.
 * - TranslateTextOutput - The return type for the translateText function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { SCRIPT_LANGUAGES } from '@/lib/types';

const TranslateTextInputSchema = z.object({
  textToTranslate: z.string().describe("The text content that needs to be translated."),
  targetLanguage: z.enum(SCRIPT_LANGUAGES).describe("The target language for the translation."),
});
export type TranslateTextInput = z.infer<typeof TranslateTextInputSchema>;

const TranslateTextOutputSchema = z.object({
  translatedText: z.string().describe('The resulting translated text.'),
});
export type TranslateTextOutput = z.infer<typeof TranslateTextOutputSchema>;


export async function translateText(input: TranslateTextInput): Promise<TranslateTextOutput> {
  // If the target language is English, no need to call the AI.
  if (input.targetLanguage === 'English') {
    return { translatedText: input.textToTranslate };
  }
  return translateTextFlow(input);
}


const translationPrompt = ai.definePrompt({
  name: 'translationPrompt',
  input: {schema: TranslateTextInputSchema},
  output: {schema: TranslateTextOutputSchema},
  prompt: `Translate the following text into {{targetLanguage}}.

If the target language is "Moroccan Darija", you MUST write the translation using Arabic letters and a natural, conversational dialect (e.g., "السلام عليكم، كيف الحال؟"). Do not use Latin characters (franco) for Darija.

Ensure the translation is accurate, maintains the original tone, and is culturally appropriate.

Text to Translate:
"{{{textToTranslate}}}"`,
});


const translateTextFlow = ai.defineFlow(
  {
    name: 'translateTextFlow',
    inputSchema: TranslateTextInputSchema,
    outputSchema: TranslateTextOutputSchema,
  },
  async (input) => {
    const {output} = await translationPrompt(input, { config: { temperature: 0.2 }});
    
    if (!output?.translatedText) {
        throw new Error("Failed to generate a valid translation.");
    }

    return { translatedText: output.translatedText };
  }
);
