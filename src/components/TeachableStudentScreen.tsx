import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, Send, BookOpen } from 'pixelarticons/react';
import { PixelBar, PixelButton, PixelChip, PixelIconButton, type PixelChipTone } from './ui';
import { playUiSound } from '../hooks/useUiSound';
import { cn } from '../lib/cn';
import { useGemini } from '../context/GeminiProvider';
import { STUDENT_PROFILES, sendStudentMessage, type ChatMessage, type StudentProfile } from '../services/studentService';

interface TeachableStudentScreenProps {
  unlockedInstruments: string[];
  onBack: () => void;
  onSessionComplete: () => void;
}

const SESSION_EXCHANGE_LIMIT = 5;

export function TeachableStudentScreen({
  unlockedInstruments,
  onBack,
  onSessionComplete,
}: TeachableStudentScreenProps) {
  const { client } = useGemini();
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [exchangeCount, setExchangeCount] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, isTyping]);

  // Student selection screen
  const handleSelectStudent = useCallback((student: StudentProfile) => {
    setSelectedStudent(student);
    const openingMessage = student.openingLine(unlockedInstruments);
    setHistory([{ role: 'student', content: openingMessage }]);
  }, [unlockedInstruments]);

  // Send player message
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || !selectedStudent || !client || isTyping || sessionDone) return;

    const playerMsg = inputValue.trim();
    setInputValue('');

    const newHistory: ChatMessage[] = [...history, { role: 'player', content: playerMsg }];
    setHistory(newHistory);
    setIsTyping(true);

    try {
      const reply = await sendStudentMessage(client, selectedStudent, newHistory, playerMsg, unlockedInstruments);
      const newExchanges = exchangeCount + 1;
      setExchangeCount(newExchanges);
      setHistory(prev => [...prev, { role: 'student', content: reply }]);

      if (newExchanges >= SESSION_EXCHANGE_LIMIT) {
        setSessionDone(true);
      }
    } catch {
      setHistory(prev => [...prev, { role: 'student', content: "Sorry, I got a bit confused! Can you repeat that?" }]);
    } finally {
      setIsTyping(false);
    }
  }, [inputValue, selectedStudent, client, isTyping, sessionDone, history, exchangeCount, unlockedInstruments]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Student Selection ──────────────────────────────────────────────────────

  const CATEGORY_TONE: Record<string, PixelChipTone> = { percussion: 'perc', string: 'string', wind: 'wood', woodwind: 'wood' };

  if (!selectedStudent) {
    return (
      <div className="min-h-screen bg-plum-950 text-parchment-100 flex flex-col">
        <header className="bg-plum-900 border-b-[3px] border-ink">
          <div className="max-w-6xl mx-auto px-3 sm:px-6 pt-10 sm:pt-3 pb-3 flex items-center gap-3">
            <PixelIconButton icon={<ChevronLeft />} label="Back" sound="ui_back" onClick={onBack} />
            <div>
              <h1 className="font-bold text-2xl sm:text-3xl leading-none">Teach a Student</h1>
              <p className="mt-1 text-sm text-parchment-300">Share what you know about the instruments you've collected.</p>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-6 flex flex-col gap-4">
          <p className="flex items-start gap-2 text-base text-parchment-300">
            <BookOpen className="size-5 shrink-0 mt-0.5 text-gold-300" aria-hidden />
            Each student has a personality. Pick one and answer their questions to earn XP.
          </p>

          <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STUDENT_PROFILES.map((student) => (
              <li key={student.id}>
                <button
                  type="button"
                  onClick={() => { playUiSound('ui_click'); handleSelectStudent(student); }}
                  className="group px-frame px-frame-plum w-full h-full flex flex-col items-center gap-3 p-4 text-center hover:brightness-110 focus-visible:outline-[3px] focus-visible:outline-gold-300"
                >
                  <span className="px-frame px-frame-inset size-36 xl:size-44 overflow-hidden">
                    <img src={student.avatar} alt="" className="w-full h-full object-cover" />
                  </span>
                  <span className="font-bold text-2xl leading-none text-parchment-100 group-hover:text-gold-300">{student.name}</span>
                  <PixelChip tone={CATEGORY_TONE[String(student.focusCategory).toLowerCase()] ?? 'neutral'}>{student.trait}</PixelChip>
                  <span className="text-sm leading-snug text-parchment-300">
                    Curious about <strong className="font-semibold text-parchment-100">{student.focusCategory}</strong> instruments.
                    <span className="block mt-1 text-parchment-500">Favorite: {student.favoriteInstrument}</span>
                  </span>
                  <span className="mt-auto px-btn px-btn-secondary min-h-10 px-4 text-sm">Teach {student.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </main>
      </div>
    );
  }

  // ── Chat View ──────────────────────────────────────────────────────────────

  return (
    <div className="h-screen bg-plum-950 text-parchment-100 flex flex-col">
      <header className="shrink-0 bg-plum-900 border-b-[3px] border-ink">
        <div className="max-w-3xl mx-auto px-3 pt-10 sm:pt-3 pb-3 flex items-center gap-3">
          <PixelIconButton icon={<ChevronLeft />} label="Choose another student" sound="ui_back" onClick={() => setSelectedStudent(null)} />
          <span className="px-frame px-frame-inset px-frame-sm size-11 shrink-0 overflow-hidden">
            <img src={selectedStudent.avatar} alt="" className="w-full h-full object-cover" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-lg leading-none">{selectedStudent.name}</p>
            <p className="mt-1 text-xs text-parchment-500">{selectedStudent.trait}</p>
          </div>
          <PixelBar
            className="w-28 sm:w-40"
            kind="heal"
            height={8}
            segments={20}
            value={exchangeCount}
            max={SESSION_EXCHANGE_LIMIT}
            label="Lesson"
            valueText={`${exchangeCount}/${SESSION_EXCHANGE_LIMIT}`}
          />
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-3 py-4 flex flex-col gap-3">
          {history.map((msg, i) => (
            <div key={i} className={cn('flex items-end gap-2', msg.role === 'player' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'student' && (
                <span className="size-8 shrink-0 border-2 border-ink overflow-hidden">
                  <img src={selectedStudent.avatar} alt="" className="w-full h-full object-cover" />
                </span>
              )}
              <div className={cn('px-frame max-w-[80%] px-3 py-2', msg.role === 'player' ? 'bg-xp text-ink' : 'px-frame-parchment')} style={msg.role === 'player' ? { ['--frame-bg' as string]: 'var(--color-xp)' } : undefined}>
                {msg.role === 'student' && <p className="mb-1 text-xs font-semibold text-wood-700">{selectedStudent.name}</p>}
                <p className="text-sm leading-snug">{msg.content}</p>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-end gap-2" aria-live="polite">
              <span className="size-8 shrink-0 border-2 border-ink overflow-hidden">
                <img src={selectedStudent.avatar} alt="" className="w-full h-full object-cover" />
              </span>
              <div className="px-frame px-frame-parchment flex items-center gap-1.5 px-4 py-3" aria-label={`${selectedStudent.name} is typing`}>
                {[0, 1, 2].map(i => (
                  <span key={i} className="size-2 bg-wood-500 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            </div>
          )}

          {sessionDone && !isTyping && (
            <div className="flex justify-center pt-2">
              <PixelButton variant="primary" size="lg" onClick={onSessionComplete}>
                Finish Lesson · +30 XP
              </PixelButton>
            </div>
          )}
        </div>
      </div>

      {!sessionDone && (
        <div className="shrink-0 bg-plum-900 border-t-[3px] border-ink">
          <div className="max-w-3xl mx-auto px-3 pt-3 pb-6 flex gap-2">
            <input
              ref={inputRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isTyping}
              placeholder={`Teach ${selectedStudent.name}...`}
              className="flex-1 h-12 px-3 bg-plum-950 border-[3px] border-ink text-base text-parchment-100 placeholder:text-parchment-500 focus:border-gold-300 focus:outline-none disabled:opacity-50"
            />
            <PixelIconButton
              variant="primary"
              className="size-12"
              icon={<Send />}
              label="Send"
              sound={null}
              disabled={!inputValue.trim() || isTyping}
              onClick={handleSend}
            />
          </div>
        </div>
      )}
    </div>
  );
}
