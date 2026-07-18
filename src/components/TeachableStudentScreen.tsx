import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, Send, BookOpen } from 'lucide-react';
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

  if (!selectedStudent) {
    return (
      <div className="min-h-screen bg-[#2a2d43] flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 z-[-2] opacity-10 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(#da2d46 2px, transparent 2px)', backgroundSize: '20px 20px' }} />

        {/* Header */}
        <div className="relative z-10 px-4 pt-12 pb-4 flex items-center justify-between border-b-[6px] border-[#0f0c0c] bg-[#da2d46] shrink-0">
          <button
            onClick={onBack}
            className="w-10 h-10 bg-[#e0e5ed] border-4 border-[#0f0c0c] flex items-center justify-center shadow-[4px_4px_0px_0px_#0f0c0c] active:translate-y-1 active:shadow-none transition-all -skew-x-6"
          >
            <ChevronLeft size={22} className="skew-x-6 stroke-[3px] text-[#0f0c0c]" />
          </button>
          <div className="text-center">
            <h1 className="font-orbitron text-xl font-black tracking-widest text-[#0f0c0c] uppercase"
              style={{ textShadow: '2px 2px 0px rgba(255,255,255,0.2)' }}>
              TEACH A STUDENT
            </h1>
            <p className="font-space-mono text-[10px] text-[#0f0c0c] tracking-widest uppercase opacity-70">Endgame Content</p>
          </div>
          <div className="w-10" />
        </div>

        {/* Intro */}
        <div className="px-6 pt-8 pb-4">
          <div className="bg-[#0f0c0c] border-[4px] border-[#da2d46] p-4 -skew-x-1 shadow-[6px_6px_0px_0px_#da2d46]">
            <div className="flex items-start gap-3 skew-x-1">
              <BookOpen size={20} className="text-[#da2d46] shrink-0 mt-0.5" />
              <p className="font-space-mono text-xs text-[#e0e5ed] leading-relaxed">
                A student wants to learn about the instruments you've collected.
                They each have a personality — choose your student and teach them what you know!
              </p>
            </div>
          </div>
        </div>

        {/* Student cards */}
        <div className="flex-1 px-6 pb-8 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto">
          {STUDENT_PROFILES.map((student) => (
            <button
              key={student.id}
              onClick={() => handleSelectStudent(student)}
              className="w-full h-full bg-[#e0e5ed] border-[4px] border-[#0f0c0c] p-6 flex flex-col items-center text-center shadow-[8px_8px_0px_0px_#0f0c0c] hover:-translate-y-2 hover:-translate-x-1 hover:shadow-[12px_12px_0px_0px_#0f0c0c] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all group relative overflow-hidden"
            >
              {/* Scattered Stickers */}
              <div className="absolute inset-0 z-0 pointer-events-none mix-blend-multiply opacity-50 group-hover:opacity-90 transition-opacity duration-500 overflow-hidden">
                {[...Array(9)].map((_, i) => {
                  // Deterministic pseudo-random positions clustered closer to the middle
                  const positions = [
                    { top: '5%', left: '5%', rot: -15, scale: 1.0 },
                    { top: '15%', right: '5%', rot: 25, scale: 1.05 },
                    { bottom: '15%', left: '2%', rot: -30, scale: 1.2 },
                    { bottom: '5%', right: '10%', rot: 15, scale: 0.95 },
                    { top: '40%', left: '2%', rot: 45, scale: 0.85 },
                    { top: '50%', right: '2%', rot: -20, scale: 1.0 },
                    { top: '2%', left: '40%', rot: 10, scale: 1.05 },
                    { bottom: '2%', left: '35%', rot: -10, scale: 0.95 },
                    { top: '70%', left: '50%', rot: 35, scale: 0.8 },
                  ];
                  const pos = positions[i];
                  return (
                    <img 
                      key={i}
                      src={`/assets/avatars/${student.id}_sticker_${i + 1}.png`}
                      alt=""
                      className="absolute w-28 h-28 object-contain transition-all duration-500 drop-shadow-sm group-hover:drop-shadow-md"
                      style={{
                        top: pos.top,
                        left: pos.left,
                        right: pos.right,
                        bottom: pos.bottom,
                        transform: `rotate(${pos.rot}deg) scale(${pos.scale})`,
                        transformOrigin: 'center'
                      }}
                    />
                  );
                })}
              </div>

              <div className="relative z-10 w-32 h-32 xl:w-48 xl:h-48 bg-[#0f0c0c] border-[4px] border-[#da2d46] flex items-center justify-center shrink-0 shadow-[4px_4px_0px_0px_#da2d46] overflow-hidden mb-6 transition-transform duration-300 group-hover:scale-[1.03]">
                <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
              </div>
              
              <div className="flex flex-col items-center flex-1 w-full relative z-10">
                <div className="flex flex-col items-center gap-3 mb-4 w-full">
                  <h3 className="font-orbitron font-black text-2xl xl:text-3xl text-[#0f0c0c] tracking-widest uppercase bg-[#e0e5ed] px-2 -skew-x-2">{student.name}</h3>
                  <span className="inline-block bg-[#da2d46] border-[2px] border-[#0f0c0c] px-3 py-1 font-space-mono text-[10px] xl:text-xs font-black text-[#0f0c0c] -skew-x-6 shadow-[3px_3px_0px_0px_#0f0c0c]">
                    <span className="skew-x-6 block">{student.trait}</span>
                  </span>
                </div>
                <div className="bg-[#e0e5ed] border-[2px] border-[#0f0c0c] p-3 -skew-x-1 shadow-[4px_4px_0px_0px_#0f0c0c]">
                  <p className="font-space-mono text-sm xl:text-base text-[#2a2d43] leading-relaxed max-w-[250px] skew-x-1">
                    Curious about <strong>{student.focusCategory}</strong> instruments.
                    <br className="hidden md:block" />
                    <span className="inline-block mt-2 opacity-80 font-bold">Favorite: {student.favoriteInstrument}</span>
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Chat View ──────────────────────────────────────────────────────────────

  return (
    <div className="h-screen bg-[#2a2d43] flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 z-[-2] opacity-10 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(#da2d46 2px, transparent 2px)', backgroundSize: '20px 20px' }} />

      {/* Chat Header */}
      <div className="relative z-10 px-4 pt-12 pb-3 flex items-center gap-3 border-b-[6px] border-[#0f0c0c] bg-[#0f0c0c] shrink-0">
        <button
          onClick={() => setSelectedStudent(null)}
          className="w-9 h-9 bg-[#e0e5ed] border-[3px] border-[#da2d46] flex items-center justify-center shadow-[3px_3px_0px_0px_#da2d46] active:translate-y-0.5 active:shadow-none transition-all -skew-x-6 shrink-0"
        >
          <ChevronLeft size={18} className="skew-x-6 stroke-[3px] text-[#0f0c0c]" />
        </button>

        <div className="w-10 h-10 bg-[#2a2d43] border-[3px] border-[#da2d46] flex items-center justify-center shrink-0 shadow-[3px_3px_0px_0px_#da2d46] overflow-hidden">
          <img src={selectedStudent.avatar} alt={selectedStudent.name} className="w-full h-full object-cover" />
        </div>

        <div className="flex-1">
          <p className="font-orbitron font-black text-sm text-[#e0e5ed] tracking-wider uppercase">{selectedStudent.name}</p>
          <div className="flex items-center gap-2">
            <span className="inline-block bg-[#da2d46] border-[2px] border-[#0f0c0c] px-1.5 py-0 font-space-mono text-[8px] font-black text-[#0f0c0c]">
              {selectedStudent.trait}
            </span>
            <span className="font-space-mono text-[9px] text-[#888ea1]">
              {exchangeCount}/{SESSION_EXCHANGE_LIMIT} exchanges
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-[#0f0c0c] shrink-0">
        <div
          className="h-full bg-[#da2d46] transition-all duration-500"
          style={{ width: `${(exchangeCount / SESSION_EXCHANGE_LIMIT) * 100}%` }}
        />
      </div>

      {/* Chat messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {history.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'player' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'student' && (
              <div className="w-7 h-7 bg-[#0f0c0c] border-[2px] border-[#da2d46] flex items-center justify-center mr-2 shrink-0 mt-1 overflow-hidden">
                <img src={selectedStudent.avatar} alt={selectedStudent.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div
              className={`max-w-[80%] border-[3px] border-[#0f0c0c] px-3 py-2 shadow-[3px_3px_0px_0px_#0f0c0c] ${
                msg.role === 'player'
                  ? 'bg-[#da2d46] text-[#0f0c0c] -skew-x-2'
                  : 'bg-[#e0e5ed] text-[#0f0c0c] skew-x-1'
              }`}
            >
              {msg.role === 'student' && (
                <p className="font-orbitron font-black text-[8px] text-[#da2d46] tracking-widest uppercase mb-1 -skew-x-1">
                  {selectedStudent.name}
                </p>
              )}
              <p className={`font-space-mono text-xs leading-relaxed ${msg.role === 'player' ? 'skew-x-2 font-bold' : '-skew-x-1'}`}>
                {msg.content}
              </p>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start items-center gap-2">
            <div className="w-7 h-7 bg-[#0f0c0c] border-[2px] border-[#da2d46] flex items-center justify-center shrink-0 overflow-hidden">
              <img src={selectedStudent.avatar} alt={selectedStudent.name} className="w-full h-full object-cover" />
            </div>
            <div className="bg-[#e0e5ed] border-[3px] border-[#0f0c0c] px-4 py-2 shadow-[3px_3px_0px_0px_#0f0c0c] flex items-center gap-1.5">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 bg-[#888ea1] rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Session complete */}
        {sessionDone && !isTyping && (
          <div className="flex justify-center pt-2">
            <button
              onClick={onSessionComplete}
              className="px-6 py-3 bg-[#da2d46] border-[4px] border-[#0f0c0c] font-orbitron font-black text-sm tracking-widest text-[#0f0c0c] shadow-[6px_6px_0px_0px_#0f0c0c] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#0f0c0c] active:translate-y-1 active:shadow-none transition-all uppercase -skew-x-6"
            >
              <span className="skew-x-6 block">END SESSION (+30 XP)</span>
            </button>
          </div>
        )}
      </div>

      {/* Input bar */}
      {!sessionDone && (
        <div className="relative z-10 border-t-[4px] border-[#0f0c0c] bg-[#0f0c0c] px-4 pt-4 pb-8 shrink-0">
          <div className="flex gap-3 h-12">
            <input
              ref={inputRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isTyping}
              placeholder={`Teach ${selectedStudent.name}...`}
              className="flex-1 bg-[#2a2d43] border-[3px] border-[#888ea1] text-[#e0e5ed] font-space-mono text-sm px-4 py-2 focus:border-[#da2d46] focus:outline-none placeholder:text-[#888ea1] disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isTyping}
              className="w-14 h-full bg-[#da2d46] border-[3px] border-[#da2d46] flex items-center justify-center text-[#0f0c0c] shadow-[3px_3px_0px_0px_#da2d46] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#e0e5ed] transition-colors active:translate-y-0.5 active:shadow-none"
            >
              <Send size={20} className="stroke-[2.5px]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
