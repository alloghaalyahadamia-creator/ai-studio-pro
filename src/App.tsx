/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, 
  Sparkles, 
  FileText, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Copy, 
  Check, 
  Download, 
  AlertCircle, 
  X, 
  Loader2, 
  Code2, 
  Trash2, 
  Wifi, 
  WifiOff 
} from 'lucide-react';

type ContentType = 'text' | 'image' | 'video';

interface GenerationResult {
  type: ContentType;
  text?: string;
  imageUrl?: string;
  videoUrl?: string;
  timestamp: number;
}

const STORAGE_KEY = 'ai_tunnel_url';

export default function App() {
  // Main State
  const [selectedType, setSelectedType] = useState<ContentType>('text');
  const [prompt, setPrompt] = useState('');
  const [tunnelUrl, setTunnelUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempTunnelUrl, setTempTunnelUrl] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [pingStatus, setPingStatus] = useState<string | null>(null);
  const [isPingLoading, setIsPingLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  // Standalone HTML Modal / Export
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load saved Tunnel URL from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) || '';
    setTunnelUrl(saved);
    setTempTunnelUrl(saved);
  }, []);

  // Dynamic placeholders
  const placeholders: Record<ContentType, string> = {
    text: 'اكتب الفكرة أو الموضوع المطلوب صياغته هنا بالتفصيل (مثال: اكتب مقالاً احترافياً عن مستقبل الحوسبة الكمية)...',
    image: 'صف الصورة التي ترغب في توليدها بالتفصيل (مثال: منظر ليلي لمدينة مستقبلية بأسلوب سايبربانك بدقة 4K)...',
    video: 'صف مشهد الفيديو والحركة المطلوبة (مثال: درون يطير بين الجبال المغطاة بالثلوج وقت الغروب)...'
  };

  // Open Settings Modal
  const handleOpenSettings = () => {
    setTempTunnelUrl(tunnelUrl);
    setSaveSuccess(false);
    setPingStatus(null);
    setIsSettingsOpen(true);
  };

  // Save Settings to LocalStorage
  const handleSaveSettings = () => {
    let cleanUrl = tempTunnelUrl.trim().replace(/\/+$/, '');
    setTunnelUrl(cleanUrl);
    localStorage.setItem(STORAGE_KEY, cleanUrl);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsSettingsOpen(false);
    }, 1000);
  };

  // Test Ping Connection to Tunnel URL
  const handleTestPing = async () => {
    const cleanUrl = tempTunnelUrl.trim().replace(/\/+$/, '');
    if (!cleanUrl) {
      setPingStatus('يرجى كتابة الرابط أولاً');
      return;
    }
    setIsPingLoading(true);
    setPingStatus(null);
    try {
      const res = await fetch(cleanUrl, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'Bypass-Tunnel-Reminder': 'true'
        }
      });
      setPingStatus(`تم الاتصال بنجاح (كود: ${res.status})`);
    } catch {
      setPingStatus('تعذر الوصول للسيرفر. تأكد من تشغيل النفق وتفعيل CORS.');
    } finally {
      setIsPingLoading(false);
    }
  };

  // Generate Action
  const handleGenerate = async () => {
    const cleanPrompt = prompt.trim();
    setErrorMessage(null);

    if (!cleanPrompt) {
      setErrorMessage('يرجى كتابة نص أو وصف قبل الضغط على زر التوليد.');
      textareaRef.current?.focus();
      return;
    }

    const cleanTunnel = tunnelUrl.trim().replace(/\/+$/, '');
    if (!cleanTunnel && !demoMode) {
      setErrorMessage('يرجى تحديد رابط السيرفر (Tunnel URL) أولاً من أيقونة الإعدادات ⚙️ في الأعلى، أو تفعيل وضع التجربة.');
      return;
    }

    if (demoMode) {
      setIsGenerating(true);
      setResult(null);
      setTimeout(() => {
        setIsGenerating(false);
        if (selectedType === 'text') {
          setResult({
            type: 'text',
            text: `بناءً على طلبك: "${cleanPrompt}"\n\nتعتبر تقنيات الذكاء الاصطناعي التوليدي من أهم الابتكارات التقنية المعاصرة، حيث تتيح صياغة أفكار متعددة وتوليد محتوى دقيق وعالي الجودة متوافق مع كافة المنصات.\n\nالنقاط الرئيسية:\n• معالجة سريعة للأفكار وصياغتها باحترافية.\n• تكامل مباشر مع خوادم الـ Tunnel المستقلة.\n• سهولة النشر على GitHub Pages كملف مستقل واحد.`,
            timestamp: Date.now()
          });
        } else if (selectedType === 'image') {
          setResult({
            type: 'image',
            imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
            timestamp: Date.now()
          });
        } else {
          setResult({
            type: 'video',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            timestamp: Date.now()
          });
        }
      }, 1200);
      return;
    }

    setIsGenerating(true);
    setResult(null);

    try {
      const endpoint = `${cleanTunnel}/generate`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      const response = await fetch(endpoint, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'Bypass-Tunnel-Reminder': 'true'
        },
        body: JSON.stringify({
          prompt: cleanPrompt,
          type: selectedType
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        throw new Error(`خطأ من السيرفر (${response.status}): ${errBody || response.statusText || 'فشل التوليد'}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        if (selectedType === 'text') {
          const textOut = data.text || data.result || data.response || data.output || (typeof data === 'string' ? data : JSON.stringify(data, null, 2));
          setResult({ type: 'text', text: textOut, timestamp: Date.now() });
        } else if (selectedType === 'image') {
          const imgUrl = data.image_url || data.url || data.image || data.result;
          if (!imgUrl) throw new Error('لم يرجع السيرفر رابط صورة صالح.');
          setResult({ type: 'image', imageUrl: imgUrl, timestamp: Date.now() });
        } else {
          const vidUrl = data.video_url || data.url || data.video || data.result;
          if (!vidUrl) throw new Error('لم يرجع السيرفر رابط فيديو صالح.');
          setResult({ type: 'video', videoUrl: vidUrl, timestamp: Date.now() });
        }
      } else if (contentType.includes('image/')) {
        const blob = await response.blob();
        setResult({ type: 'image', imageUrl: URL.createObjectURL(blob), timestamp: Date.now() });
      } else if (contentType.includes('video/')) {
        const blob = await response.blob();
        setResult({ type: 'video', videoUrl: URL.createObjectURL(blob), timestamp: Date.now() });
      } else {
        const raw = await response.text();
        setResult({ type: 'text', text: raw, timestamp: Date.now() });
      }

    } catch (err: unknown) {
      console.error('Generation Error:', err);
      let msg = err instanceof Error ? err.message : 'فشل الاتصال بالسيرفر';
      if (err instanceof Error && err.name === 'AbortError') {
        msg = 'انتهت مهلة الانتظار (دقيقتين). استغرق السيرفر وقتاً طويلاً في المعالجة.';
      } else if (msg.includes('Failed to fetch')) {
        msg = 'تعذر الاتصال بـ Tunnel URL. تأكد من أن السيرفر يعمل ومن ضبط شهادة Ngrok أو CORS.';
      }
      setErrorMessage(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  // Keyboard shortcut Ctrl+Enter / Cmd+Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!isGenerating) {
        handleGenerate();
      }
    }
  };

  // Copy result text
  const handleCopyText = async (text?: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Clear fields
  const handleClear = () => {
    setPrompt('');
    setErrorMessage(null);
    setResult(null);
  };

  // Standalone HTML Code Fetcher & Download
  const handleDownloadStandaloneHtml = async () => {
    try {
      const res = await fetch('/standalone.html');
      const htmlContent = await res.text();
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'index.html';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download error:', e);
    }
  };

  const handleCopyStandaloneHtml = async () => {
    try {
      const res = await fetch('/standalone.html');
      const htmlContent = await res.text();
      await navigator.clipboard.writeText(htmlContent);
      setCopiedHtml(true);
      setTimeout(() => setCopiedHtml(false), 2000);
    } catch (e) {
      console.error('Copy error:', e);
    }
  };

  return (
    <div id="main-app" className="min-h-screen bg-[#212121] text-[#ececec] flex flex-col justify-between selection:bg-[#10a37f] selection:text-white antialiased font-['Cairo',sans-serif]">
      
      {/* 1. Header with Settings Icon (Requirement 2) */}
      <header id="app-header" className="w-full max-w-4xl mx-auto px-4 py-4 flex items-center justify-between border-b border-[#2e2e2e]">
        
        {/* Top-Left: Gear Icon ⚙️ for Tunnel URL Modal */}
        <div className="flex items-center gap-3">
          <button
            id="settings-trigger-btn"
            onClick={handleOpenSettings}
            className="w-10 h-10 rounded-xl bg-[#2f2f2f] hover:bg-[#3b3b3b] active:scale-95 text-[#ececec] flex items-center justify-center transition-all duration-200 border border-[#424242] shadow-sm relative group cursor-pointer"
            title="إعدادات رابط السيرفر (Tunnel URL)"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5 text-stone-200 transition-transform duration-300 group-hover:rotate-45" />
            {/* Status indicator dot */}
            <span
              id="tunnel-status-indicator"
              className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#212121] ${
                tunnelUrl ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              title={tunnelUrl ? `الرابط: ${tunnelUrl}` : 'لم يتم إدخال رابط السيرفر'}
            />
          </button>

          <div className="hidden sm:flex flex-col">
            <span className="text-[11px] text-stone-400">حالة السيرفر:</span>
            <div className="flex items-center gap-1.5">
              {tunnelUrl ? (
                <>
                  <Wifi className="w-3 h-3 text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-400">الرابط مضبوط</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-400">غير متصل</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Center / Brand Header */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
            AI
          </div>
          <h1 className="text-base sm:text-lg font-bold tracking-wide text-stone-100">
            منصة توليد المحتوى
          </h1>
        </div>

        {/* Top-Right Tools: Clear & GitHub Pages Standalone Export */}
        <div className="flex items-center gap-2">
          <button
            id="export-standalone-btn"
            onClick={() => setIsExportOpen(true)}
            className="px-2.5 py-1.5 text-xs rounded-lg text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-700/40 transition flex items-center gap-1 cursor-pointer font-medium"
            title="ملف index.html المستقل لـ GitHub Pages"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">كود GitHub Pages</span>
          </button>

          {(prompt || result || errorMessage) && (
            <button
              id="clear-all-btn"
              onClick={handleClear}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-[#2f2f2f] transition cursor-pointer"
              title="تفريغ الحقول"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* 2. Main Center Body (ChatGPT-like Minimalist Centerpiece) */}
      <main id="app-main-content" className="w-full max-w-2xl mx-auto px-4 py-8 flex-1 flex flex-col justify-center items-center">
        
        {/* Title / Heading */}
        <div className="text-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
            ما الذي ترغب في توليده؟
          </h2>
          <p className="text-xs sm:text-sm text-stone-400 max-w-md mx-auto">
            اختر نوع المحتوى واكتب وصفك بدقة ليقوم السيرفر بتوليده فوراً
          </p>
        </div>

        {/* 3 Top Buttons: Exactly 3 Buttons [📝 نص] [🎨 صورة] [🎬 فيديو] (Requirement 1) */}
        <div id="content-type-selector" className="flex items-center justify-center gap-2 sm:gap-3 mb-4 w-full">
          <button
            id="type-btn-text"
            type="button"
            onClick={() => setSelectedType('text')}
            className={`flex-1 py-2.5 px-3 sm:px-4 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 border cursor-pointer ${
              selectedType === 'text'
                ? 'bg-[#2f2f2f] border-[#424242] text-white shadow-sm ring-1 ring-emerald-500/50'
                : 'bg-[#212121] border-[#333333] text-stone-400 hover:text-white hover:bg-[#2a2a2a]'
            }`}
          >
            <FileText className={`w-4 h-4 ${selectedType === 'text' ? 'text-emerald-400' : ''}`} />
            <span>نص</span>
          </button>

          <button
            id="type-btn-image"
            type="button"
            onClick={() => setSelectedType('image')}
            className={`flex-1 py-2.5 px-3 sm:px-4 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 border cursor-pointer ${
              selectedType === 'image'
                ? 'bg-[#2f2f2f] border-[#424242] text-white shadow-sm ring-1 ring-blue-500/50'
                : 'bg-[#212121] border-[#333333] text-stone-400 hover:text-white hover:bg-[#2a2a2a]'
            }`}
          >
            <ImageIcon className={`w-4 h-4 ${selectedType === 'image' ? 'text-blue-400' : ''}`} />
            <span>صورة</span>
          </button>

          <button
            id="type-btn-video"
            type="button"
            onClick={() => setSelectedType('video')}
            className={`flex-1 py-2.5 px-3 sm:px-4 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 border cursor-pointer ${
              selectedType === 'video'
                ? 'bg-[#2f2f2f] border-[#424242] text-white shadow-sm ring-1 ring-purple-500/50'
                : 'bg-[#212121] border-[#333333] text-stone-400 hover:text-white hover:bg-[#2a2a2a]'
            }`}
          >
            <VideoIcon className={`w-4 h-4 ${selectedType === 'video' ? 'text-purple-400' : ''}`} />
            <span>فيديو</span>
          </button>
        </div>

        {/* Central Text Input Box (ChatGPT Style) */}
        <div 
          id="prompt-input-container"
          className="w-full bg-[#2f2f2f] border border-[#424242] rounded-2xl p-3.5 sm:p-4 shadow-xl transition-all duration-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 mb-4"
        >
          <textarea
            id="prompt-textarea"
            ref={textareaRef}
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholders[selectedType]}
            className="w-full bg-transparent text-[#ececec] placeholder-stone-500 text-sm sm:text-base outline-none resize-none leading-relaxed font-sans"
          />
          <div className="flex items-center justify-between pt-2 border-t border-[#3d3d3d] text-xs text-stone-400">
            <span>{prompt.length} حرف</span>
            <span className="text-stone-500 hidden sm:inline">اضغط Ctrl + Enter للتوليد السريع</span>
          </div>
        </div>

        {/* Big Generate Button: [توليد الآن ✨] (Requirement 1) */}
        <div className="w-full mb-6">
          <button
            id="generate-action-btn"
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full py-3.5 px-6 rounded-2xl bg-white hover:bg-stone-200 active:scale-[0.99] text-[#171717] font-bold text-base shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>جاري التوليد...</span>
              </>
            ) : (
              <>
                <span>توليد الآن</span>
                <Sparkles className="w-4 h-4 text-emerald-600 fill-emerald-600" />
              </>
            )}
          </button>
        </div>

        {/* Loading Spinner Indicator (Requirement 4) */}
        {isGenerating && (
          <div id="loading-indicator-box" className="w-full p-6 bg-[#2a2a2a] border border-[#3d3d3d] rounded-2xl flex flex-col items-center justify-center gap-3 text-center my-2 animate-fade">
            <Loader2 className="w-9 h-9 text-emerald-400 animate-spin" />
            <p className="text-sm font-semibold text-stone-200">
              {selectedType === 'text' && 'جاري معالجة وتوليد النص بواسطة الذكاء الاصطناعي...'}
              {selectedType === 'image' && 'جاري معالجة وتوليد الصورة بدقة عالية...'}
              {selectedType === 'video' && 'جاري معالجة وتوليد مشهد الفيديو...'}
            </p>
            <p className="text-xs text-stone-400">يتم إرسال الطلب إلى خادم الـ Tunnel المخصص</p>
          </div>
        )}

        {/* Error Alert Box in Red (Requirement 4) */}
        {errorMessage && (
          <div id="error-alert-banner" className="w-full my-3 p-4 bg-red-950/40 border border-red-700/60 rounded-2xl flex items-start gap-3 text-red-200 text-sm">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-bold text-red-300 mb-1">حدث خطأ في العملية:</div>
              <div className="text-xs leading-relaxed text-red-200">{errorMessage}</div>
              {!tunnelUrl && !demoMode && (
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <button
                    id="open-settings-from-error"
                    onClick={handleOpenSettings}
                    className="text-xs font-bold text-red-300 underline hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>فتح إعدادات السيرفر ⚙️</span>
                  </button>
                  <span className="text-red-400 text-xs">•</span>
                  <button
                    id="enable-demo-mode-btn"
                    onClick={() => {
                      setDemoMode(true);
                      setErrorMessage(null);
                    }}
                    className="text-xs font-bold text-emerald-300 underline hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    <span>تفعيل وضع التجربة التوضيحي السريع</span>
                  </button>
                </div>
              )}
            </div>
            <button
              id="dismiss-error-btn"
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 3. Results Display (Requirement 3) */}
        {result && (
          <div id="results-display-area" className="w-full my-4">
            
            {/* Text Result Card */}
            {result.type === 'text' && result.text && (
              <div id="result-text-card" className="bg-[#2a2a2a] border border-[#3d3d3d] rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#3a3a3a]">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>نتيجة النص المولّد</span>
                  </span>
                  <button
                    id="copy-result-text-btn"
                    onClick={() => handleCopyText(result.text)}
                    className="px-3 py-1 bg-[#3a3a3a] hover:bg-[#484848] text-xs text-white rounded-lg flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                  >
                    {copiedText ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ النص</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="text-sm sm:text-base leading-relaxed text-stone-100 whitespace-pre-wrap selection:bg-emerald-700 selection:text-white font-sans">
                  {result.text}
                </div>
              </div>
            )}

            {/* Image Result Card */}
            {result.type === 'image' && result.imageUrl && (
              <div id="result-image-card" className="bg-[#2a2a2a] border border-[#3d3d3d] rounded-2xl p-4 shadow-lg flex flex-col items-center">
                <div className="w-full flex items-center justify-between mb-3 pb-2 border-b border-[#3a3a3a]">
                  <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>الصورة المولّدة</span>
                  </span>
                  <a
                    id="download-result-image-btn"
                    href={result.imageUrl}
                    download="ai_generated_image.png"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 bg-[#3a3a3a] hover:bg-[#484848] text-xs text-white rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تحميل الصورة</span>
                  </a>
                </div>
                <div className="w-full overflow-hidden rounded-xl bg-[#1c1c1c] border border-[#3a3a3a] flex items-center justify-center">
                  <img
                    id="generated-image-element"
                    src={result.imageUrl}
                    alt="الصورة المولّدة بالذكاء الاصطناعي"
                    className="w-full max-h-[500px] object-contain rounded-xl"
                  />
                </div>
              </div>
            )}

            {/* Video Result Card */}
            {result.type === 'video' && result.videoUrl && (
              <div id="result-video-card" className="bg-[#2a2a2a] border border-[#3d3d3d] rounded-2xl p-4 shadow-lg flex flex-col items-center">
                <div className="w-full flex items-center justify-between mb-3 pb-2 border-b border-[#3a3a3a]">
                  <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                    <VideoIcon className="w-3.5 h-3.5" />
                    <span>مشغل الفيديو</span>
                  </span>
                  <a
                    id="download-result-video-btn"
                    href={result.videoUrl}
                    download="ai_generated_video.mp4"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 bg-[#3a3a3a] hover:bg-[#484848] text-xs text-white rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تحميل الفيديو</span>
                  </a>
                </div>
                <div className="w-full overflow-hidden rounded-xl bg-black border border-[#3a3a3a] flex items-center justify-center">
                  <video
                    id="generated-video-element"
                    src={result.videoUrl}
                    controls
                    autoPlay
                    loop
                    className="w-full max-h-[500px] rounded-xl outline-none"
                  >
                    متصفحك لا يدعم تشغيل الفيديو.
                  </video>
                </div>
              </div>
            )}

          </div>
        )}

      </main>

      {/* Footer */}
      <footer id="app-footer" className="w-full max-w-4xl mx-auto px-4 py-4 text-center border-t border-[#2e2e2e] text-xs text-stone-500">
        جاهز للنشر على GitHub Pages • متوافق مع Ngrok و Localtunnel و Google Colab و FastAPI
      </footer>

      {/* 4. Settings Modal: [⚙️ رابط السيرفر] (Requirement 2) */}
      {isSettingsOpen && (
        <div id="settings-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade">
          <div id="settings-modal-content" className="bg-[#2a2a2a] border border-[#424242] rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            
            {/* Close Button */}
            <button
              id="close-settings-modal-btn"
              onClick={() => setIsSettingsOpen(false)}
              className="absolute top-4 left-4 w-8 h-8 rounded-lg bg-[#333333] hover:bg-[#404040] text-stone-300 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">⚙️</span>
              <h3 className="text-lg font-bold text-white">إعدادات رابط السيرفر (Tunnel URL)</h3>
            </div>

            <p className="text-xs text-stone-400 mb-4 leading-relaxed">
              أدخل رابط السيرفر أو نفق التوجيه الخاص بك (مثل رابط Ngrok أو LocalTunnel أو Colab). يتم حفظ الرابط تلقائياً في LocalStorage بالمتصفح.
            </p>

            {/* Input Field (Single input as required) */}
            <div className="mb-4">
              <label htmlFor="tunnel-url-field" className="block text-xs font-semibold text-stone-300 mb-1.5">
                رابط السيرفر (Tunnel URL):
              </label>
              <input
                id="tunnel-url-field"
                type="url"
                dir="ltr"
                value={tempTunnelUrl}
                onChange={(e) => setTempTunnelUrl(e.target.value)}
                placeholder="https://xxxx-xx-xx.ngrok-free.app"
                className="w-full bg-[#1e1e1e] border border-[#424242] focus:border-emerald-500 rounded-xl px-3 py-2.5 text-sm text-white placeholder-stone-500 outline-none transition font-mono"
              />
              <p className="text-[11px] text-stone-500 mt-1.5 leading-normal">
                مثال: <code className="bg-[#1e1e1e] px-1 py-0.5 rounded text-stone-400">https://xxxx.ngrok-free.app</code>
              </p>
            </div>

            {/* Demo Mode Toggle for instant testing */}
            <div className="mb-4 p-3 bg-[#1e1e1e] border border-[#383838] rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-stone-200 block">وضع التجربة السريعة (Demo Mode)</span>
                <span className="text-[11px] text-stone-400">تجربة التوليد بمحتوى افتراضي دون الحاجة لسيرفر فوري</span>
              </div>
              <button
                type="button"
                onClick={() => setDemoMode(!demoMode)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${demoMode ? 'bg-emerald-600' : 'bg-[#404040]'}`}
              >
                <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${demoMode ? 'right-6' : 'right-1'}`} />
              </button>
            </div>

            {/* Ping Feedback */}
            {pingStatus && (
              <div className="mb-4 p-2.5 bg-[#1f1f1f] border border-[#3d3d3d] rounded-xl text-xs text-stone-300 flex items-center gap-2">
                <span>📡</span>
                <span>{pingStatus}</span>
              </div>
            )}

            {/* Success Alert */}
            {saveSuccess && (
              <div className="mb-4 p-2.5 bg-emerald-950/40 border border-emerald-700/50 rounded-xl text-emerald-300 text-xs text-center font-medium">
                ✓ تم حفظ الرابط بنجاح في متصفحك!
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-[#3a3a3a]">
              <button
                id="ping-test-btn"
                type="button"
                onClick={handleTestPing}
                disabled={isPingLoading}
                className="px-3 py-2 rounded-xl bg-[#383838] hover:bg-[#484848] text-xs font-medium text-stone-200 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isPingLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>📡 فحص الاتصال</span>}
              </button>

              <button
                id="save-tunnel-url-btn"
                type="button"
                onClick={handleSaveSettings}
                className="px-5 py-2 rounded-xl bg-white hover:bg-stone-200 text-[#171717] text-xs font-bold transition shadow cursor-pointer"
              >
                حفظ الرابط
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 5. GitHub Pages Standalone File Modal */}
      {isExportOpen && (
        <div id="export-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade">
          <div id="export-modal-content" className="bg-[#2a2a2a] border border-[#424242] rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
            
            <button
              id="close-export-modal-btn"
              onClick={() => setIsExportOpen(false)}
              className="absolute top-4 left-4 w-8 h-8 rounded-lg bg-[#333333] hover:bg-[#404040] text-stone-300 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <Code2 className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-bold text-white">ملف index.html المستقل لـ GitHub Pages</h3>
            </div>

            <p className="text-xs text-stone-300 mb-4 leading-relaxed">
              هذا الملف مدمج بالكامل في ملف واحد (Single File HTML) يحتوي على التصميم وTailwind والأكواد وربط LocalStorage، وجاهز للنشر المباشر على GitHub Pages بدون أي إعدادات أو تثبيت!
            </p>

            <div className="bg-[#1a1a1a] border border-[#383838] rounded-xl p-3 mb-5 text-xs text-stone-400 flex flex-col gap-2">
              <div className="font-semibold text-stone-200 flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>كيفية الاستخدام على GitHub Pages:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-stone-400 text-[11px] leading-relaxed">
                <li>حمّل الملف بالنقر على <strong>تحميل index.html</strong> أدناه أو انسخ الكود.</li>
                <li>ارفعه مباشرة إلى مستودع GitHub الخاص بك في المسار الرئيسي باسم <code className="text-emerald-400 font-mono">index.html</code>.</li>
                <li>فعّل GitHub Pages من إعدادات المستودع (Settings &gt; Pages &gt; Branch: main).</li>
              </ol>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#3a3a3a]">
              <button
                id="copy-standalone-html-btn"
                type="button"
                onClick={handleCopyStandaloneHtml}
                className="px-4 py-2 rounded-xl bg-[#383838] hover:bg-[#484848] text-xs font-semibold text-stone-200 transition flex items-center gap-1.5 cursor-pointer"
              >
                {copiedHtml ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">تم نسخ الكود!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>نسخ كود HTML كاملاً</span>
                  </>
                )}
              </button>

              <button
                id="download-standalone-html-btn"
                type="button"
                onClick={handleDownloadStandaloneHtml}
                className="px-5 py-2 rounded-xl bg-white hover:bg-stone-200 text-[#171717] text-xs font-bold transition shadow flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>تحميل ملف index.html</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
