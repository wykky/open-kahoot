/**
 * Authenticated OpenAI question generation.
 *
 * Auth: NextAuth session required. Anonymous callers get 401.
 * Pre-2026-05 this used a shared `accessKey` passed in the request body — removed:
 * the key was visible in browser devtools to every host, and a single leak burned
 * an unbounded amount of OpenAI quota with no per-user accountability.
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import { auth } from '@/auth';
import { aiGenUserLimiter, aiGenIpLimiter } from '@/lib/rate-limit';

function getRequestIp(request: NextRequest): string {
  const cf = request.headers.get('cf-connecting-ip');
  if (cf) return cf;
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  return 'unknown';
}

const QuizResponseSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      correct: z.string(),
      wrong1: z.string(),
      wrong2: z.string(),
      wrong3: z.string(),
      explanation: z.string(),
    })
  ),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit by user (primary, since the endpoint is auth-gated) AND by IP
  // (backstop in case one user's session token is shared across many machines).
  const userId = (session.user as { dbUserId?: string }).dbUserId ?? session.user.email ?? 'unknown-user';
  const ip = getRequestIp(request);
  if (!aiGenUserLimiter.consume(userId) || !aiGenIpLimiter.consume(ip)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded — please wait a minute before generating more questions' },
      { status: 429 }
    );
  }

  try {
    const { subject, language, questionCount = 5 } = await request.json();

    if (!subject || !language) {
      return NextResponse.json(
        { error: 'Subject and language are required' },
        { status: 400 }
      );
    }

    if (questionCount < 1 || questionCount > 20) {
      return NextResponse.json(
        { error: 'Question count must be between 1 and 20' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });

    const prompts = {
      english: `Create ${questionCount} multiple-choice quiz questions about "${subject}".

For each question, provide:
- The question text
- 4 answer options (1 correct, 3 incorrect)
- The correct answer
- An optional explanation

Make the questions engaging, educational, and appropriate for a quiz game.`,
      french: `Créez ${questionCount} questions de quiz à choix multiples sur "${subject}".

Pour chaque question, fournissez :
- Le texte de la question
- 4 options de réponse (1 correcte, 3 incorrectes)
- La réponse correcte
- Une explication optionnelle

Rendez les questions engageantes, éducatives et appropriées pour un jeu de quiz.`,
    };

    const prompt = prompts[language as keyof typeof prompts] || prompts.english;

    const jsonInstructions = `

You must respond with a valid JSON object in the following format:
{
  "questions": [
    {
      "question": "question text here",
      "correct": "correct answer",
      "wrong1": "first wrong answer",
      "wrong2": "second wrong answer",
      "wrong3": "third wrong answer",
      "explanation": "explanation of the answer"
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            language === 'french'
              ? 'Vous êtes un expert en création de quiz éducatifs. Créez des questions claires, précises et engageantes en français. Répondez toujours avec un JSON valide.'
              : 'You are an expert at creating educational quizzes. Create clear, accurate, and engaging questions. Always respond with valid JSON.',
        },
        {
          role: 'user',
          content: prompt + jsonInstructions,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const jsonResponse = JSON.parse(content);
    const parsed = QuizResponseSchema.parse(jsonResponse);

    return NextResponse.json({
      success: true,
      questions: parsed.questions,
    });
  } catch (error) {
    console.error('Error generating questions:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate questions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
