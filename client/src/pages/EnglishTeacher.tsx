import { useMemo, useState } from 'react';
import { Bot, Languages, MessageSquareText, Send, Sparkles, Wand2 } from 'lucide-react';

type Message = {
  id: number;
  sender: 'user' | 'assistant';
  text: string;
};

const quickPrompts = [
  'Can you correct my sentence?',
  'Teach me a useful daily phrase',
  'How do I say this naturally?',
  'Give me 3 grammar tips',
];

const fixCommonGrammar = (text: string) => {
  let corrected = text.trim().replace(/\s+/g, ' ');

  const commonReplacements: Array<[RegExp, string]> = [
    [/\bim\b/gi, "I'm"],
    [/\bi am\b/gi, 'I am'],
    [/\bdo not\b/gi, "don't"],
    [/\bdoes not\b/gi, "doesn't"],
    [/\bcan not\b/gi, "can't"],
    [/\bwon t\b/gi, "won't"],
    [/\bI\s+am\s+good\b/gi, 'I am good'],
    [/\bteh\b/gi, 'the'],
    [/\bthier\b/gi, 'their'],
    [/\bwich\b/gi, 'which'],
    [/\bwich one\b/gi, 'which one'],
    [/\bwhat is\s+your\s+name\?/gi, 'What is your name?'],
    [/\bi\b/gi, 'I'],
  ];

  commonReplacements.forEach(([pattern, replacement]) => {
    corrected = corrected.replace(pattern, replacement);
  });

  corrected = corrected.replace(/\s+([?.!,])/g, '$1');

  if (!/[.!?]$/.test(corrected)) {
    corrected = `${corrected}.`;
  }

  corrected = corrected.charAt(0).toUpperCase() + corrected.slice(1);

  return corrected;
};

const buildTeacherResponse = (userInput: string) => {
  const cleanInput = userInput.trim();

  if (!cleanInput) {
    return 'Please write a sentence and I will help you correct it.';
  }

  const corrected = fixCommonGrammar(cleanInput);
  const lowerInput = cleanInput.toLowerCase();

  if (
    lowerInput.includes('correct') ||
    lowerInput.includes('grammar') ||
    lowerInput.includes('fix') ||
    lowerInput.includes('sentence')
  ) {
    return `Your corrected sentence: "${corrected}"

A few quick notes:
- Start with a capital letter.
- Use correct verb forms in the sentence.
- End with punctuation when appropriate.`;
  }

  if (lowerInput.includes('hello') || lowerInput.includes('hi')) {
    return 'Hello! I can help you speak more naturally in English. Try a sentence, and I will correct it for you.';
  }

  if (lowerInput.includes('teach') || lowerInput.includes('phrase') || lowerInput.includes('daily')) {
    return 'A useful phrase is: "I would like to practice my English every day."\n\nYou can also say: "Could you help me improve my speaking skills?"';
  }

  return `Good try! A more natural version is: "${corrected}"

Tip: speak clearly, keep the sentence simple, and focus on correct word order.`;
};

export default function EnglishTeacher() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: 'assistant',
      text: 'Hi! I am your English teacher. Send me a sentence and I will help you correct it and explain it simply.',
    },
  ]);
  const [lastCorrection, setLastCorrection] = useState('');

  const totalMessages = useMemo(() => messages.length, [messages]);

  const handleSend = () => {
    const safeInput = input.trim();
    if (!safeInput) return;

    const userMessage: Message = { id: Date.now(), sender: 'user', text: safeInput };
    const teacherMessageText = buildTeacherResponse(safeInput);
    const correctedSentence = fixCommonGrammar(safeInput);

    setMessages((current) => [...current, userMessage, { id: Date.now() + 1, sender: 'assistant', text: teacherMessageText }]);
    setLastCorrection(correctedSentence);
    setInput('');
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">Learning</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">AI English Teacher</h1>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300">
          <Languages className="h-6 w-6" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Talk with your teacher</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{totalMessages} messages in this session</p>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleQuickPrompt(prompt)}
                className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 transition hover:border-orange-300 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-300"
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="h-[360px] space-y-3 overflow-y-auto rounded-2xl bg-gray-50 p-3 dark:bg-gray-900/50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                    message.sender === 'user'
                      ? 'bg-orange-500 text-white'
                      : 'bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-200'
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-3">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={3}
              placeholder="Type your sentence here..."
              className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:border-orange-700 dark:focus:ring-orange-900/30"
            />
            <button
              type="button"
              onClick={handleSend}
              className="inline-flex items-center justify-center rounded-2xl bg-orange-500 px-4 py-3 text-white shadow-sm transition hover:bg-orange-600"
              aria-label="Send message"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-300">
                <Wand2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sentence corrector</h3>
              </div>
            </div>

            <div className="space-y-3">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                rows={5}
                placeholder="Write your sentence here"
                className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-green-300 focus:ring-2 focus:ring-green-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:border-green-700 dark:focus:ring-green-900/30"
              />
              <button
                type="button"
                onClick={handleSend}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-700"
              >
                <Sparkles className="h-4 w-4" />
                Correct my sentence
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-dashed border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/20">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-green-700 dark:text-green-300">
                <MessageSquareText className="h-4 w-4" />
                Corrected version
              </div>
              <p className="text-sm leading-6 text-gray-700 dark:text-gray-200">
                {lastCorrection || 'Your corrected sentence will appear here.'}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Teacher tips</h3>
            <ul className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <li>• Keep sentences short and clear.</li>
              <li>• Practice 5 minutes every day.</li>
              <li>• Use common phrases like “I would like…” and “Could you help me…?”</li>
              <li>• Ask for a natural version, not only a grammar fix.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
