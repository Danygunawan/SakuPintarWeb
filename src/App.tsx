/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Wallet, 
  TrendingDown, 
  Calendar as CalendarIcon, 
  Sparkles, 
  Plus, 
  Trash2, 
  Settings, 
  User, 
  Bell, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle, 
  Send, 
  RefreshCw,
  Search,
  CheckCircle,
  HelpCircle,
  X,
  LogOut
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title as ChartTitle,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  ChartTitle,
  ChartTooltip,
  ChartLegend
);

// ============================================================
// SAKUPINTAR LOGO — SVG inline, tidak perlu file eksternal
// Desain: kantong/saku hijau + bintang oranye di kiri atas
// ============================================================

interface SakuPintarLogoProps {
  size?: number;
  rounded?: boolean;
  bgColor?: string;
}

export function SakuPintarLogo({ size = 40, rounded = true, bgColor = 'transparent' }: SakuPintarLogoProps) {
  const r = rounded ? Math.round(size * 0.22) : 0;
  const sakuColor = '#00C040';   // hijau terang (badan kantong)
  const sakuDark  = '#009030';   // hijau gelap (garis detail)
  const starColor = '#FF6B00';   // oranye (bintang/sparkle)

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 40 40" 
      xmlns="http://www.w3.org/2000/svg" 
      style={{ borderRadius: `${r}px`, display: 'block', flexShrink: 0, overflow: 'hidden' }}
    >
      {/* Background: transparan atau warna yang diminta */}
      <rect width="40" height="40" fill={bgColor} rx={r}/>
      
      {/* Bintang sparkle oranye (kiri atas kantong) */}
      <path d="M14,9 L15,12 L18,13 L15,14 L14,17 L13,14 L10,13 L13,12 Z" fill={starColor}/>
      
      {/* Kantong/saku: badan utama (trapesoid membulat ke bawah) */}
      {/* Bagian atas kantong (tutup) */}
      <rect x="10" y="15" width="20" height="5" rx="2.5" fill={sakuColor}/>
      
      {/* Garis hitam di tutup (detail kantong) */}
      <rect x="10" y="19" width="20" height="1.5" fill={sakuDark} opacity={0.4}/>
      
      {/* Badan kantong (trapesoid membulat ke bawah) */}
      <path d="M10,20 L10,30 Q10,33 13,33 L27,33 Q30,33 30,30 L30,20 Z" fill={sakuColor}/>
      
      {/* Highlight tipis di badan (kesan 3D) */}
      <rect x="10" y="20" width="20" height="3" fill="white" opacity={0.08}/>
    </svg>
  );
}

// Define structures
interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  item: string;
  amount: number;
  category: string;
}

interface AlarmNotification {
  id: string;
  type: 'warning' | 'danger' | 'info';
  message: string;
}

export default function App() {
  const getTabLabel = (tab: 'dashboard' | 'transactions' | 'insights' | 'settings') => {
    switch (tab) {
      case 'dashboard': return 'Dashboard';
      case 'transactions': return 'Transaksi';
      case 'insights': return 'Wawasan AI';
      case 'settings': return 'Pengaturan';
      default: return 'Menu';
    }
  };

  // --- STATE MANAGEMENT ---
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthlyBudget, setMonthlyBudget] = useState<number>(3000000);
  const [dailyBudget, setDailyBudget] = useState<number>(100000);
  const [activeChartSlide, setActiveChartSlide] = useState<number>(0);

  // Height detection of Alarm Boros card
  const [alarmCardHeight, setAlarmCardHeight] = useState<number>(200);
  const observerRef = useRef<ResizeObserver | null>(null);
  const alarmCardRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (node) {
      setAlarmCardHeight(node.getBoundingClientRect().height || 200);
      const observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
          const height = entry.contentRect.height || entry.target.getBoundingClientRect().height;
          if (height) {
            setAlarmCardHeight(height);
          }
        }
      });
      observer.observe(node);
      observerRef.current = observer;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);
  
  // Mobile Top Dropdown Menu trigger & refs
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const mobileNavbarRef = useRef<HTMLDivElement>(null);

  // Calendar month-year picker dropdown trigger & refs
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState<boolean>(false);
  const [pickerYear, setPickerYear] = useState<number>(2026);
  const monthPickerRef = useRef<HTMLDivElement>(null);
  const [pickerStyle, setPickerStyle] = useState<React.CSSProperties>({});

  const toggleMonthPicker = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isMonthPickerOpen) {
      setIsMonthPickerOpen(false);
      return;
    }

    const btn = e.currentTarget;
    const btnRect = btn.getBoundingClientRect();
    const PICKER_W = Math.min(260, window.innerWidth - 32); // max lebar picker
    const MARGIN = 16; // jarak minimal dari tepi layar

    // Posisi vertikal: tepat di bawah tombol
    const topPx = btnRect.bottom + 8;

    // Posisi horizontal:
    // Coba rata kiri dengan tombol, lalu clamp agar tidak keluar layar
    let leftPx = btnRect.left;

    // Kalau picker melampaui sisi KANAN layar → geser ke kiri
    if (leftPx + PICKER_W > window.innerWidth - MARGIN) {
      leftPx = window.innerWidth - PICKER_W - MARGIN;
    }

    // Kalau hasil geser masih keluar sisi KIRI → paksa mulai dari MARGIN
    if (leftPx < MARGIN) {
      leftPx = MARGIN;
    }

    setPickerStyle({
      position: 'fixed',
      top: `${topPx}px`,
      left: `${leftPx}px`,
      right: 'auto',
      transform: 'none',
      width: `${PICKER_W}px`,
      maxWidth: `calc(100vw - ${MARGIN * 2}px)`,
      zIndex: 999999,
    });

    setPickerYear(currentYear);
    setIsMonthPickerOpen(true);
  };
  
  // Date tracking for Calendar & Dashboard
  const [currentYear, setCurrentYear] = useState<number>(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(() => new Date().getMonth());

  // Click outside handling for custom UI dropdown views & auto closer on scroll
  useEffect(() => {
    function handleClickOutsideCustomViews(event: MouseEvent) {
      if (monthPickerRef.current && !monthPickerRef.current.contains(event.target as Node)) {
        setIsMonthPickerOpen(false);
      }
      if (mobileNavbarRef.current && !mobileNavbarRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    }
    function handleScrollClose() {
      setIsMonthPickerOpen(false);
    }
    function handleResizeClose() {
      setIsMonthPickerOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutsideCustomViews);
    document.addEventListener('touchstart', handleClickOutsideCustomViews);
    window.addEventListener('scroll', handleScrollClose, true);
    window.addEventListener('touchmove', handleScrollClose, true);
    window.addEventListener('resize', handleResizeClose);
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideCustomViews);
      document.removeEventListener('touchstart', handleClickOutsideCustomViews);
      window.removeEventListener('scroll', handleScrollClose, true);
      window.removeEventListener('touchmove', handleScrollClose, true);
      window.removeEventListener('resize', handleResizeClose);
    };
  }, []);

  // Voice Input States & Handlers
  const [currentInputMode, setCurrentInputMode] = useState<'text' | 'voice'>('text');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [voiceStatusText, setVoiceStatusText] = useState<string>('Tap untuk mulai bicara');
  const [voiceStatusColor, setVoiceStatusColor] = useState<string>('');
  const [isVoiceSupported, setIsVoiceSupported] = useState<boolean>(false);
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);
  const [voicePermissionError, setVoicePermissionError] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsVoiceSupported(true);
      const rec = new SpeechRecognition();
      rec.lang = 'id-ID';
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        setIsRecording(true);
        setVoiceStatusText('Mendengarkan...');
        setVoiceStatusColor('');
        setVoicePermissionError(false);
      };

      rec.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setVoiceTranscript(transcript);
      };

      rec.onerror = (event: any) => {
        setIsRecording(false);
        let msg = 'Terjadi kesalahan. Coba lagi.';
        if (event.error === 'no-speech') msg = 'Tidak ada suara terdeteksi. Coba lagi.';
        if (event.error === 'not-allowed') {
          setVoicePermissionError(true);
          setVoiceStatusColor('#D85A30');
          setVoiceStatusText('🔒 Izin mikrofon belum diberikan.');
          return;
        }
        setVoiceStatusColor('#D85A30');
        setVoiceStatusText(msg);
        setTimeout(() => {
          setVoiceStatusColor('');
          setVoiceStatusText('Tap untuk mulai bicara');
        }, 3000);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const toggleVoiceRecording = async () => {
    if (!isVoiceSupported) {
      alert('Browser kamu tidak mendukung voice input. Coba pakai Chrome atau Edge ya!');
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      setVoiceTranscript('');
      setVoiceStatusColor('');
      setVoicePermissionError(false);
      setVoiceStatusText('Meminta izin mikrofon...');
      setVoiceStatusColor('#EF9F27');

      try {
        // Minta akses mikrofon secara eksplisit agar browser memunculkan dialog izin yang benar
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Jika diperoleh, matikan stream agar tidak bentrok atau gantung
        stream.getTracks().forEach(track => track.stop());

        setVoiceStatusText('Mendengarkan...');
        setVoiceStatusColor('');
        try {
          recognitionRef.current?.start();
        } catch (startErr) {
          console.error('Error starting recognition:', startErr);
          try { recognitionRef.current?.stop(); } catch (e) {}
          setTimeout(() => {
            try { recognitionRef.current?.start(); } catch (e) {}
          }, 100);
        }
      } catch (permissionError: any) {
        setIsRecording(false);
        console.error('Microphone permission error:', permissionError);
        
        let msg = 'Gagal akses mikrofon.';
        if (permissionError.name === 'NotAllowedError' || permissionError.name === 'PermissionDeniedError') {
          setVoicePermissionError(true);
          setVoiceStatusText('🔒 Izin mikrofon belum diberikan.');
          setVoiceStatusColor('#D85A30');
          return;
        } else if (permissionError.name === 'NotFoundError') {
          msg = '⚠️ Mikrofon tidak ditemukan di perangkat ini.';
        } else if (permissionError.name === 'NotReadableError') {
          msg = '⚠️ Mikrofon sedang digunakan oleh aplikasi lain.';
        } else {
          msg = 'Gagal akses mikrofon: ' + permissionError.message;
        }
        
        setVoiceStatusColor('#D85A30');
        setVoiceStatusText(msg);
      }
    }
  };

  const submitVoiceTransaksi = async () => {
    const text = voiceTranscript.trim();
    if (!text) return;

    setIsLoading(true);
    try {
      const parsed = await parseTransaksiWithAI(text);
      const newTx: Transaction = {
        id: Date.now().toString(),
        date: selectedDate,
        time: getCurrentTime(),
        item: parsed.item,
        amount: parsed.amount,
        category: parsed.category
      };

      const updatedList = [...transactions, newTx];
      saveTransactionsToStorage(updatedList);
      setVoiceTranscript('');
      setVoiceStatusText('Tap untuk mulai bicara');
      checkAlarmBoros(newTx);
      showToast('Transaksi berhasil ditambah!', 'success');
    } catch (err) {
      console.error('Error submitting transaction from voice:', err);
      showToast('Gagal memproses pengeluaran.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const [selectedDate, setSelectedDate] = useState<string>('2026-05-31');
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // UI Tabs
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'insights' | 'settings'>('dashboard');
  
  // Search and filter inside transaction tab
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('Semua');
  
  // Notifications / Alarm state
  const [alarms, setAlarms] = useState<AlarmNotification[]>([]);
  
  // Trigger loading effect or toast alert
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // User Profile
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<{
    nama: string;
    name: string;
    email: string;
    budgetBulanan: number;
    fotoProfil: string | null;
    tanggalDaftar: string;
  }>({
    nama: 'Dany Gunawan',
    name: 'Dany Gunawan',
    email: 'danygunawan80@gmail.com',
    budgetBulanan: 3000000,
    fotoProfil: null,
    tanggalDaftar: '2026-05-01'
  });

  // Login Form States (Redesign Requirements)
  const [loginForm, setLoginForm] = useState({
    nama: '',
    email: '',
    password: '',
    budget: '',
  });
  const [savedAccounts, setSavedAccounts] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('sakuPintar_savedAccounts') || '[]');
    } catch (e) {
      return [];
    }
  });
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});
  const [isSubmitLoading, setIsSubmitLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Settings Change States (Redesign Requirements)
  const [budgetSaveStatus, setBudgetSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [settingsBudgetInput, setSettingsBudgetInput] = useState<string>('');

  const [tipsIndex, setTipsIndex] = useState<number>(0);
  const [quoteIndex, setQuoteIndex] = useState<number>(0);

  const tipsPresets = useMemo(() => [
    "Bawa bekal dari rumah 3x seminggu bisa hemat Rp 150rb per bulan.",
    "Gunakan transportasi umum untuk perjalanan <5km.",
    "Batasi jajan kopi maksimal 2x seminggu.",
    "Catat setiap pengeluaran kecil, kamu akan terkejut.",
    "Tunda pembelian non-darurat 24 jam."
  ], []);

  const quotePresets = useMemo(() => [
    "Kamu sudah lebih baik dari bulan lalu! Tetap konsisten.",
    "Setiap rupiah yang dihemat adalah langkah menuju kebebasan finansial.",
    "Jangan bandingkan dengan orang lain, bandingkan dengan dirimu yang dulu.",
    "Hemat bukan berarti menyiksa diri, melainkan mengatur prioritas.",
    "Masa depan yang cerah dimulai dari kebiasaan finansial yang bijak hari ini."
  ], []);

  const updateSettingsRightPanel = useCallback(() => {
    const randomTip = Math.floor(Math.random() * tipsPresets.length);
    const randomQuote = Math.floor(Math.random() * quotePresets.length);
    setTipsIndex(randomTip);
    setQuoteIndex(randomQuote);
  }, [tipsPresets.length, quotePresets.length]);

  useEffect(() => {
    if (activeTab === 'settings') {
      setSettingsBudgetInput(monthlyBudget.toString());
      updateSettingsRightPanel();
    }
  }, [activeTab, monthlyBudget, updateSettingsRightPanel]);

  const isValidGmail = (email: string) => {
    const gmailRegex = /^[a-zA-Z0-9._%+\-]+@gmail\.com$/i;
    return gmailRegex.test(email.trim());
  };

  const getPasswordStrength = (value: string) => {
    if (!value || value.length === 0) return null;
    let score = 0;
    if (value.length >= 6) score++;
    if (value.length >= 10) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/[0-9]/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;
    
    const levels = [
      { pct: '20%', color: '#D85A30', label: 'Terlalu pendek' },
      { pct: '40%', color: '#EF9F27', label: 'Lemah' },
      { pct: '60%', color: '#EF9F27', label: 'Cukup' },
      { pct: '80%', color: '#1D9E75', label: 'Kuat' },
      { pct: '100%', color: '#1D9E75', label: '💪 Sangat kuat!' },
    ];
    
    return levels[Math.min(score, levels.length) - 1] || levels[0];
  };

  const pwStrength = getPasswordStrength(loginForm.password);
  const showSuffix = loginForm.email.length > 0 && !loginForm.email.includes('@');

  // --- SAMPLE DATA INTEGRATION ---
  useEffect(() => {
    const storedTransactions = localStorage.getItem('tabunganaja_transactions');
    const storedMonthly = localStorage.getItem('tabunganaja_monthly_budget');
    const storedDaily = localStorage.getItem('tabunganaja_daily_budget');
    const storedUser = localStorage.getItem('tabunganaja_user');
    const isLoggedOut = localStorage.getItem('tabunganaja_is_logged_out') === 'true';

    if (storedMonthly) setMonthlyBudget(parseInt(storedMonthly));
    if (storedDaily) setDailyBudget(parseInt(storedDaily));
    if (storedUser && !isLoggedOut) {
      const parsedUser = JSON.parse(storedUser);
      const savedFoto = localStorage.getItem('tabunganaja_foto_profil');
      parsedUser.fotoProfil = savedFoto || parsedUser.fotoProfil || null;
      setUserProfile(parsedUser);
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
      setLoginForm({
        nama: '',
        email: '',
        password: '',
        budget: '',
      });
    }

    if (storedTransactions) {
      setTransactions(JSON.parse(storedTransactions));
    } else {
      // Akun baru dimulai dari nol tanpa transaksi fiktif
      setTransactions([]);
      localStorage.setItem('tabunganaja_transactions', JSON.stringify([]));
    }
  }, []);

  // Sync settings helper
  const saveTransactionsToStorage = (updatedList: Transaction[]) => {
    setTransactions(updatedList);
    localStorage.setItem('tabunganaja_transactions', JSON.stringify(updatedList));
  };

  // Toast notifier
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Login handler
  const handleLoginSubmit = (nama: string, email: string, budget: number) => {
    if (!nama || !email) {
      alert('Nama dan email wajib diisi!');
      return;
    }
    const savedFoto = localStorage.getItem('tabunganaja_foto_profil');
    const profile = { 
      nama, 
      name: nama, 
      email, 
      budgetBulanan: budget, 
      fotoProfil: savedFoto || null, 
      tanggalDaftar: "2026-05-01" 
    };
    localStorage.setItem('tabunganaja_user', JSON.stringify(profile));
    localStorage.setItem('tabunganaja_monthly_budget', budget.toString());
    setUserProfile(profile);
    setMonthlyBudget(budget);
    initCalendarToCurrentMonth();
    setIsLoggedIn(true);
    showToast('Selamat Datang di SakuPintar!');
  };

  // Logout handler
  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  // --- HELPERS ---
  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatShort = (value: number) => {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + ' Jt';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(0) + ' Rb';
    }
    return value.toString();
  };

  // Convert Date components to YYYY-MM-DD
  const formatDateString = (year: number, monthZeroBased: number, dateDay: number) => {
    const mStr = String(monthZeroBased + 1).padStart(2, '0');
    const dStr = String(dateDay).padStart(2, '0');
    return `${year}-${mStr}-${dStr}`;
  };

  const getTodayDate = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${date}`;
  };

  const formattedTodayDate = useMemo(() => {
    const d = new Date();
    const hariNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const bulanNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${hariNames[d.getDay()]}, ${d.getDate()} ${bulanNames[d.getMonth()]} ${d.getFullYear()}`;
  }, []);

  const initCalendarToCurrentMonth = () => {
    const today = new Date();
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  const getCurrentTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  // --- METRICS COMPUTING ---
  const currentMonthTransactions = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.date);
      // Ensure local safe matching
      const tYear = d.getFullYear();
      const tMonth = d.getMonth();
      return tYear === currentYear && tMonth === currentMonth;
    });
  }, [transactions, currentYear, currentMonth]);

  const totalPengeluaranBulanIni = useMemo(() => {
    return currentMonthTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [currentMonthTransactions]);

  const sisaBudgetBulanan = useMemo(() => {
    return Math.max(0, monthlyBudget - totalPengeluaranBulanIni);
  }, [monthlyBudget, totalPengeluaranBulanIni]);

  const rataRataHarian = useMemo(() => {
    // Current date passed in active month
    const currentDateObj = new Date(getTodayDate());
    const isTodayInViewingMonth = currentDateObj.getFullYear() === currentYear && currentDateObj.getMonth() === currentMonth;
    
    let daysToDivide = 30; // standard month size
    if (isTodayInViewingMonth) {
      daysToDivide = currentDateObj.getDate();
    } else {
      daysToDivide = new Date(currentYear, currentMonth + 1, 0).getDate();
    }
    
    return daysToDivide > 0 ? Math.round(totalPengeluaranBulanIni / daysToDivide) : 0;
  }, [totalPengeluaranBulanIni, currentYear, currentMonth]);

  // --- COMPREHENSIVE FINANCIAL SUMMARY (SINKRONISASI SUMBER DATA ALARM VS WAWASAN) ---
  const financialSummary = useMemo(() => {
    const today = new Date(getTodayDate());
    const thisMonthTxns = currentMonthTransactions;
    
    const totalMonth = thisMonthTxns.reduce((s, t) => s + t.amount, 0);
    const pctUsed = monthlyBudget > 0 ? Math.round((totalMonth / monthlyBudget) * 100) : 0;
    const sisa = monthlyBudget - totalMonth;
    
    // Sisa hari di bulan ini
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
    const isCurrentMonth = today.getFullYear() === currentYear && today.getMonth() === currentMonth;
    
    let daysPassed = lastDay;
    let sisaHari = 0;
    if (isCurrentMonth) {
      daysPassed = today.getDate();
      sisaHari = Math.max(0, lastDay - today.getDate());
    } else if (currentYear < today.getFullYear() || (currentYear === today.getFullYear() && currentMonth < today.getMonth())) {
      daysPassed = lastDay;
      sisaHari = 0;
    } else {
      daysPassed = 1;
      sisaHari = lastDay;
    }
    
    // Budget harian ideal dari sisa
    const budgetHarianIdeal = sisaHari > 0 ? Math.round(Math.max(0, sisa) / sisaHari) : 0;
    
    // Proyeksi akhir bulan
    const dailyAvg = daysPassed > 0 ? totalMonth / daysPassed : 0;
    const proyeksi = Math.round(dailyAvg * lastDay);
    
    // Kategori terbanyak
    const catTotals: Record<string, number> = {};
    thisMonthTxns.forEach(t => {
      catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
    });
    const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
    const topCat = sortedCats[0]?.[0] || '-';
    
    // Hari paling boros
    const dayNames = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    const spendByDay = [0,0,0,0,0,0,0];
    thisMonthTxns.forEach(t => { 
      try {
        spendByDay[new Date(t.date).getDay()] += t.amount; 
      } catch (e) {}
    });
    const borosDayIdx = spendByDay.indexOf(Math.max(...spendByDay));
    const borosDay = spendByDay[borosDayIdx] > 0 ? dayNames[borosDayIdx] : '-';
    
    // Tentukan state
    let state: 'safe' | 'normal' | 'warning' | 'danger' | 'over' = 'safe';
    let stateColor = '#1D9E75';
    let stateLabel = 'Keuanganmu Sehat! 🛡️';
    let stateIcon = '🛡️';
    
    if (pctUsed < 30) {
      state = 'safe'; stateColor = '#1D9E75'; stateLabel = 'Keuanganmu Sehat! 🛡️'; stateIcon = '🛡️';
    } else if (pctUsed < 60) {
      state = 'normal'; stateColor = '#4A90D9'; stateLabel = 'Masih Terkendali 📊'; stateIcon = '📊';
    } else if (pctUsed < 80) {
      state = 'warning'; stateColor = '#EF9F27'; stateLabel = 'Mulai Waspada ⚠️'; stateIcon = '⚠️';
    } else if (pctUsed <= 100) {
      state = 'danger'; stateColor = '#D85A30'; stateLabel = 'Budget Hampir Habis 🚨'; stateIcon = '🚨';
    } else {
      state = 'over'; stateColor = '#8B1E00'; stateLabel = 'Budget Terlampaui! 💸'; stateIcon = '💸';
    }

    const stateBadges = {
      safe: 'AMAN',
      normal: 'TERPANTAU',
      warning: 'PERHATIAN',
      danger: 'BAHAYA',
      over: 'OVER BUDGET'
    };
    const badgeText = stateBadges[state];
    
    // Teks insight berdasarkan state (sama persis dengan yang di Alarm Boros)
    let insightText = '';
    if (totalMonth === 0) {
      insightText = 'Belum ada transaksi bulan ini. Yuk mulai catat pengeluaranmu! 📝';
    } else if (pctUsed < 30) {
      insightText = `🎉 Luar biasa! Kamu sudah pakai ${pctUsed}% dari budget bulan ini — jauh di bawah batas aman. Pengeluaran terbanyak kamu ada di kategori ${topCat}. Tetap hemat ya, sisa budgetmu masih aman banget!`;
    } else if (pctUsed < 50) {
      insightText = `📊 Budget sudah ${pctUsed}% terpakai — masih wajar. Rata-rata harian Rp ${formatRupiah(Math.round(dailyAvg))}. Paling boros di hari ${borosDay}, kategori ${topCat}. Pertahankan!`;
    } else if (pctUsed < 70) {
      insightText = `⚠️ Hati-hati! Budget sudah ${pctUsed}% terpakai dan bulan belum selesai. Terbesar di ${topCat} dan hari ${borosDay}. Mulai rem sedikit ya!`;
    } else if (pctUsed < 100) {
      insightText = `🚨 Budget hampir habis (${pctUsed}%)! Kategori ${topCat} jadi penyumbang terbesar. Kurangi pengeluaran tidak penting sekarang!`;
    } else {
      insightText = `💸 Budget bulan ini sudah TERLAMPAUI (${pctUsed}%)! Evaluasi kategori ${topCat} dan hari ${borosDay}. Bulan depan lebih ketat ya! 💪`;
    }
    
    return {
      totalMonth, monthlyBudget, pctUsed, sisa,
      sisaHari, budgetHarianIdeal, proyeksi,
      topCat, borosDay, catTotals, sortedCats,
      state, stateColor, stateLabel, stateIcon,
      badgeText, insightText, dailyAvg, daysPassed
    };
  }, [currentMonthTransactions, monthlyBudget, currentYear, currentMonth, formatRupiah]);

  // Calculate day-by-day spending sums for active calendar month
  const spendingByDayMap = useMemo(() => {
    const map: Record<string, number> = {};
    currentMonthTransactions.forEach(t => {
      map[t.date] = (map[t.date] || 0) + t.amount;
    });
    return map;
  }, [currentMonthTransactions]);

  const settingsQuickSummary = useMemo(() => {
    const today = new Date('2026-05-31');
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const dateSpendMapObj: Record<string, number> = {};
    const dateToDayName: Record<string, string> = {};

    transactions.forEach(t => {
      const txDate = new Date(t.date);
      const diffTime = today.getTime() - txDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      if (diffDays >= 0 && diffDays <= 7) {
        dateSpendMapObj[t.date] = (dateSpendMapObj[t.date] || 0) + t.amount;
        const dayName = dayNames[txDate.getDay()];
        dateToDayName[t.date] = `${dayName}, ${txDate.getDate()} ${['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][txDate.getMonth()]}`;
      }
    });

    let maxDaySpend = 0;
    let maxDayLabel = '—';
    
    Object.keys(dateSpendMapObj).forEach(dStr => {
      const spend = dateSpendMapObj[dStr];
      if (spend > maxDaySpend) {
        maxDaySpend = spend;
        maxDayLabel = dateToDayName[dStr] || dStr;
      }
    });

    if (maxDaySpend === 0 && currentMonthTransactions.length > 0) {
      const monthlyDateSpendMap: Record<string, number> = {};
      const monthlyDateToDayName: Record<string, string> = {};
      
      currentMonthTransactions.forEach(t => {
        monthlyDateSpendMap[t.date] = (monthlyDateSpendMap[t.date] || 0) + t.amount;
        const txDate = new Date(t.date);
        const dayName = dayNames[txDate.getDay()];
        monthlyDateToDayName[t.date] = `${dayName}, ${txDate.getDate()} ${['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][txDate.getMonth()]}`;
      });

      Object.keys(monthlyDateSpendMap).forEach(dStr => {
        const spend = monthlyDateSpendMap[dStr];
        if (spend > maxDaySpend) {
          maxDaySpend = spend;
          maxDayLabel = monthlyDateToDayName[dStr];
        }
      });
    }

    return {
      totalMonth: totalPengeluaranBulanIni,
      averageDaily: rataRataHarian,
      peakDayAndAmount: maxDaySpend > 0 ? `${maxDayLabel} (${formatRupiah(maxDaySpend)})` : 'Tidak ada pengeluaran'
    };
  }, [transactions, currentMonthTransactions, totalPengeluaranBulanIni, rataRataHarian, formatRupiah]);

  const settingsMonthProgress = useMemo(() => {
    const today = new Date('2026-05-31');
    const currYear = today.getFullYear();
    const currMonth = today.getMonth();
    
    const totalDays = new Date(currYear, currMonth + 1, 0).getDate();
    const currentDay = today.getDate();
    
    const daysPassed = currentDay;
    const daysRemaining = Math.max(0, totalDays - currentDay);
    const progressPercent = Math.min(100, Math.round((daysPassed / totalDays) * 100));
    
    return {
      totalDays,
      currentDay,
      daysRemaining,
      progressPercent
    };
  }, []);

  // --- BUG #1 — KALENDER: IMPLEMENTASI YANG BENAR ---
  const calendarCells = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Minggu, 1 = Senin, ...
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    const cells: (number | null)[] = [];
    // Padding start cells
    for (let i = 0; i < firstDay; i++) {
      cells.push(null);
    }
    // Main days numbers
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(d);
    }
    // Padding end cells to always form rows of 7
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }
    return cells;
  }, [currentYear, currentMonth]);

  // Handle month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const columnHeaders = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'];

  // --- BUG #2 — WAWASAN AI LOKAL (EXACT LOGIC) ---
  const intelligentInsightText = useMemo(() => {
    return financialSummary.insightText;
  }, [financialSummary]);

  // --- BUG #3 — CATAT CEPAT & FALLBACK IMPLEMENTATION ---
  const parseTransaksiManual = (text: string) => {
    let amount = 0;
    const patterns = [
      { regex: /(\d+(?:\.\d+)?)\s*jt/i, multiplier: 1000000 },
      { regex: /(\d+(?:\.\d+)?)\s*ribu/i, multiplier: 1000 },
      { regex: /(\d+(?:\.\d+)?)\s*rb/i, multiplier: 1000 },
      { regex: /(\d+(?:\.\d+)?)\s*k\b/i, multiplier: 1000 },
      { regex: /rp\.?\s*(\d[\d.,]*)/i, multiplier: 1 },
      { regex: /(\d{4,})/i, multiplier: 1 }, // angka 4 digit ke atas = rupiah langsung
    ];
    
    for (const p of patterns) {
      const match = text.match(p.regex);
      if (match) {
        // clean values
        const parsedNum = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
        amount = Math.round(parsedNum * p.multiplier);
        break;
      }
    }
    
    const categoryKeywords: Record<string, string[]> = {
      'Makan': ['makan', 'nasi', 'ayam', 'bakso', 'mie', 'soto', 'warteg', 'resto', 'lauk', 'sarapan', 'malam', 'siang', 'warung', 'bubur', 'pecel', 'gado'],
      'Minuman': ['minum', 'kopi', 'teh', 'susu', 'boba', 'es', 'jus', 'minuman', 'aqua', 'air'],
      'Transport': ['grab', 'gojek', 'ojek', 'bensin', 'bbm', 'parkir', 'bus', 'angkot', 'kereta', 'trans', 'ongkos', 'toll'],
      'Jajan': ['jajan', 'snack', 'cemilan', 'gorengan', 'cilok', 'batagor', 'siomay', 'cireng', 'cilor', 'chiki', 'biskuit'],
      'Belanja': ['beli', 'belanja', 'shop', 'tokopedia', 'shopee', 'toko', 'mart', 'indomaret', 'alfamart'],
      'Hiburan': ['bioskop', 'game', 'netflix', 'spotify', 'hiburan', 'nonton', 'main', 'karaoke'],
    };
    
    let category = 'Lainnya';
    const lowerText = text.toLowerCase();
    for (const [cat, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(k => lowerText.includes(k))) {
        category = cat;
        break;
      }
    }
    
    // Item name filtering
    let item = text
      .replace(/\d+(?:\.\d+)?\s*(jt|ribu|rb|k|rp\.?)/gi, '')
      .replace(/rp\.?\s*\d[\d.,]*/gi, '')
      .replace(/\d{4,}/g, '')
      .replace(/\b(beli|bayar|ongkos|untuk|buat)\b/gi, '')
      .trim();
    
    if (!item) {
      item = text.substring(0, 30);
    } else {
      item = item.charAt(0).toUpperCase() + item.slice(1);
    }
    
    return { item, amount: amount || 15000, category };
  };

  const parseTransaksiWithAI = async (text: string) => {
    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });
      
      if (!response.ok) {
        throw new Error('API server unavailable of lacking apiKey');
      }
      
      return await response.json();
    } catch (err) {
      console.warn('Backend API failed, running local manual fallbacks:', err);
      return parseTransaksiManual(text);
    }
  };

  const checkAlarmBoros = (transaksi: { item: string, amount: number, category: string, date: string }) => {
    const limitSingleMax = 150000;
    const newAlarms: AlarmNotification[] = [];
    
    // 1. Single spend alert
    if (transaksi.amount >= limitSingleMax) {
      newAlarms.push({
        id: Date.now().toString() + '-1',
        type: 'danger',
        message: `⚠️ Pengeluaran Terlalu Besar: "${transaksi.item}" menghabiskan ${formatRupiah(transaksi.amount)}. Pertimbangkan urgensinya!`
      });
    }

    // 2. Exceeding dynamic daily budget limits on selected day
    const spendingOfThatDate = spendingByDayMap[transaksi.date] || 0;
    const projectTotalSpend = spendingOfThatDate + transaksi.amount;
    
    if (projectTotalSpend > dailyBudget && spendingOfThatDate <= dailyBudget) {
      newAlarms.push({
        id: Date.now().toString() + '-2',
        type: 'warning',
        message: `🚨 Batas Harian Terlampaui! Pengeluaran pada ${transaksi.date} mencapai ${formatRupiah(projectTotalSpend)} (Batas Angg. Harian: ${formatRupiah(dailyBudget)}).`
      });
    }

    if (newAlarms.length > 0) {
      setAlarms(prev => [...newAlarms, ...prev].slice(0, 5)); // cap at 5 notifications
    }
  };

  const handleSubmitTransaksi = async () => {
    const text = inputText.trim();
    if (!text) return;
    
    setIsLoading(true);
    try {
      const parsed = await parseTransaksiWithAI(text);
      
      const newTx: Transaction = {
        id: Date.now().toString(),
        date: selectedDate, // Use the active calendar clicked date
        time: getCurrentTime(),
        item: parsed.item,
        amount: parsed.amount,
        category: parsed.category
      };
      
      const updatedList = [...transactions, newTx];
      saveTransactionsToStorage(updatedList);
      setInputText('');
      
      // Hook up bug updates and checking triggers
      checkAlarmBoros(newTx);
      showToast('Transaksi berhasil ditambah!', 'success');
    } catch (err) {
      console.error('Error submitting transaction:', err);
      showToast('Gagal memproses pengeluaran.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Direct manual insertion from quick modal
  const [manualItem, setManualItem] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualCategory, setManualCategory] = useState('Makan');

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualItem || !manualAmount) {
      showToast('Mohon isi item dan jumlah harga.', 'error');
      return;
    }
    
    const amountVal = parseInt(manualAmount.replace(/[^0-9]/g, ''));
    if (isNaN(amountVal) || amountVal <= 0) {
      showToast('Nilai Rupiah harus valid.', 'error');
      return;
    }

    const newTx: Transaction = {
      id: Date.now().toString(),
      date: selectedDate,
      time: getCurrentTime(),
      item: manualItem,
      amount: amountVal,
      category: manualCategory
    };

    const updated = [...transactions, newTx];
    saveTransactionsToStorage(updated);
    
    // reset form fields
    setManualItem('');
    setManualAmount('');
    checkAlarmBoros(newTx);
    showToast('Transaksi manual disimpan!', 'success');
  };

  const handleDeleteTransaction = (id: string) => {
    const updated = transactions.filter(t => t.id !== id);
    saveTransactionsToStorage(updated);
    showToast('Transaksi berhasil dihapus.', 'success');
  };

  // --- CHART CREATION & OPTIONS (BUG #4 COMPLIANCE) ---
  const weeklyChartData = useMemo(() => {
    // Generate label sums index-based 0 (Sunday) to 6 (Saturday)
    const weekDays = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const spendingSums = [0, 0, 0, 0, 0, 0, 0];
    
    currentMonthTransactions.forEach(t => {
      const d = new Date(t.date);
      const dayOfWeek = d.getDay();
      spendingSums[dayOfWeek] += t.amount;
    });

    return {
      labels: weekDays,
      datasets: [
        {
          label: 'Pengeluaran',
          data: spendingSums,
          backgroundColor: (ctx: any) => {
            const values = ctx.dataset?.data || [];
            if (values.length === 0) return '#1D9E75';
            const maxVal = Math.max(...values);
            const currentVal = values[ctx.dataIndex];
            
            // Hari paling boros (nilai tertinggi) diberi warna coral/oranye (#D85A30)
            if (currentVal === maxVal && maxVal > 0) {
              return '#D85A30'; 
            }
            
            // Gradient teal ke hijau untuk bar lainnya
            const chart = ctx.chart;
            if (chart) {
              const { ctx: chartCtx, chartArea } = chart;
              if (chartArea) {
                const gradient = chartCtx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                gradient.addColorStop(0, '#10B981'); // Hijau
                gradient.addColorStop(1, '#0D9488'); // Teal
                return gradient;
              }
            }
            return '#1D9E75'; // Fallback
          },
          borderRadius: {
            topLeft: 8,
            topRight: 8,
            bottomLeft: 0,
            bottomRight: 0
          },
          borderSkipped: false,
          hoverBackgroundColor: '#7F77DD', 
        }
      ]
    };
  }, [currentMonthTransactions]);

  const daysInCurrentMonth = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentYear, currentMonth]);

  const monthlyChartData = useMemo(() => {
    const dailyTotals = Array(daysInCurrentMonth).fill(0);
    
    currentMonthTransactions.forEach(t => {
      const parts = t.date.split('-');
      if (parts.length === 3) {
        const dayIndex = parseInt(parts[2], 10) - 1;
        if (dayIndex >= 0 && dayIndex < daysInCurrentMonth) {
          dailyTotals[dayIndex] += t.amount;
        }
      }
    });

    const labels = Array.from({ length: daysInCurrentMonth }, (_, i) => String(i + 1));

    // Warna bar berdasarkan target budget harian:
    const colors = dailyTotals.map(v => {
      if (v === 0) return '#E2E8F0';
      if (v < dailyBudget * 0.5) return '#10B981'; // Hemat (Hijau)
      if (v <= dailyBudget) return '#F59E0B';      // Sedang (Oranye)
      return '#EF4444';                             // Boros (Coral-Merah)
    });

    return {
      labels,
      datasets: [{
        label: 'Pengeluaran Bulanan',
        data: dailyTotals,
        backgroundColor: colors,
        borderRadius: 4,
        borderSkipped: false,
      }]
    };
  }, [currentMonthTransactions, daysInCurrentMonth, dailyBudget]);

  const monthlyChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items: any) => `Tanggal ${items[0].label}`,
          label: (item: any) => `Total: Rp ${item.raw.toLocaleString('id-ID')}`
        },
        padding: 10,
        backgroundColor: '#1E293B',
        titleFont: { size: 12, weight: 'bold' as const },
        bodyFont: { size: 11 },
        cornerRadius: 8
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 9 },
          maxTicksLimit: 15,
          maxRotation: 0,
        }
      },
      y: {
        grid: { color: '#F0F0F0', drawBorder: false },
        ticks: {
          callback: (v: any) => {
            if (v >= 1000000) return `Rp ${(v/1000000).toFixed(1)}jt`;
            if (v >= 1000) return `Rp ${v/1000}rb`;
            return `Rp ${v}`;
          },
          font: { size: 9 }
        }
      }
    }
  };

  const distributionMetrics = useMemo(() => {
    const yearStr = String(currentYear);
    const monthStr = String(currentMonth + 1).padStart(2, '0');
    const prefix = `${yearStr}-${monthStr}-`;

    let hematCount = 0;
    let sedangCount = 0;
    let borosCount = 0;
    let activeDays = 0;

    Object.entries(spendingByDayMap).forEach(([dateStr, total]) => {
      if (dateStr.startsWith(prefix)) {
        activeDays++;
        const totalNum = Number(total);
        const pct = dailyBudget > 0 ? totalNum / dailyBudget : 0;
        if (pct < 0.5) {
          hematCount++;
        } else if (pct <= 1.0) {
          sedangCount++;
        } else {
          borosCount++;
        }
      }
    });

    const hematPct = activeDays > 0 ? Math.round((hematCount / activeDays) * 100) : 0;
    const sedangPct = activeDays > 0 ? Math.round((sedangCount / activeDays) * 100) : 0;
    const borosPct = activeDays > 0 ? Math.round((borosCount / activeDays) * 100) : 0;

    // Dominant status
    let dominantStatus = 'Hemat';
    let dominantPct = hematPct;
    let dominantColor = '#10B981';

    if (sedangPct > dominantPct) {
      dominantStatus = 'Sedang';
      dominantPct = sedangPct;
      dominantColor = '#F59E0B';
    }
    if (borosPct > dominantPct) {
      dominantStatus = 'Boros';
      dominantPct = borosPct;
      dominantColor = '#EF4444';
    }
    if (activeDays === 0) {
      dominantStatus = 'Belum Ada';
      dominantPct = 0;
      dominantColor = '#94A3B8';
    }

    return {
      hematCount,
      sedangCount,
      borosCount,
      hematPct,
      sedangPct,
      borosPct,
      activeDays,
      dominantStatus,
      dominantPct,
      dominantColor
    };
  }, [spendingByDayMap, currentYear, currentMonth, dailyBudget]);

  const distributionChartData = useMemo(() => {
    const isEmpty = distributionMetrics.activeDays === 0;
    return {
      labels: ['Hemat', 'Sedang', 'Boros'],
      datasets: [{
        data: isEmpty ? [1, 1, 1] : [
          distributionMetrics.hematCount,
          distributionMetrics.sedangCount,
          distributionMetrics.borosCount
        ],
        backgroundColor: isEmpty ? ['#E2E8F0', '#E8ECF1', '#EDF2F7'] : ['#10B981', '#F59E0B', '#EF4444'],
        hoverBackgroundColor: isEmpty ? ['#E2E8F0', '#E8ECF1', '#EDF2F7'] : ['#10B981', '#F59E0B', '#EF4444'],
        borderWidth: 2,
        borderColor: 'white',
        hoverOffset: isEmpty ? 0 : 4,
      }]
    };
  }, [distributionMetrics]);

  const distributionChartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: distributionMetrics.activeDays > 0,
          callbacks: {
            label: (item: any) => ` ${item.label}: ${item.raw} Hari`
          },
          padding: 8,
          backgroundColor: '#1E293B',
          titleFont: { size: 12 },
          bodyFont: { size: 11 },
          borderRadius: 6
        }
      }
    };
  }, [distributionMetrics.activeDays]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false, // PENTING: agar tinggi bisa dikontrol via CSS
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `Total: Rp ${context.raw.toLocaleString('id-ID')}`;
          }
        },
        padding: 10,
        backgroundColor: '#1E293B',
        titleFont: { size: 13, weight: 'bold' as const },
        bodyFont: { size: 12 },
        cornerRadius: 8
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#334155', // warna abu-abu gelap
          font: { family: 'Nunito', weight: 'bold' as const, size: window.innerWidth < 600 ? 10 : 12 },
          maxRotation: 0  // jangan rotate label agar tidak terpotong
        }
      },
      y: {
        grid: {
          color: '#F0F0F0', // grid horizontal tipis
          drawBorder: false
        },
        ticks: {
          color: '#555555',
          font: { family: 'Nunito', weight: 'bold' as const },
          callback: function(v: any) {
            if (v >= 1000000) {
              return `Rp ${(v / 1000000).toFixed(1)}jt`;
            }
            if (v >= 1000) {
              return `Rp ${v / 1000}rb`;
            }
            return `Rp ${v}`;
          }
        }
      }
    }
  };

  // Filter Transaction list for Tab 2
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchSearch = t.item.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = filterCategory === 'Semua' || t.category === filterCategory;
      return matchSearch && matchCategory;
    }).sort((a,b) => b.date.localeCompare(a.date));
  }, [transactions, searchQuery, filterCategory]);

  // --- ALARM BOROS CALCULATIONS ---
  const alarmState = useMemo(() => {
    const today = new Date();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Total pengeluaran bulan yang aktif di kalender
    const monthTotal = transactions
      .filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    const percentUsed = monthlyBudget > 0 ? (monthTotal / monthlyBudget) * 100 : 0;
    
    // Hitung sisa hari berdasarkan apakah bulan yang dipilih adalah bulan sekarang
    let daysLeft = daysInMonth;
    if (currentYear === today.getFullYear() && currentMonth === today.getMonth()) {
      daysLeft = Math.max(0, daysInMonth - today.getDate());
    } else if (currentYear < today.getFullYear() || (currentYear === today.getFullYear() && currentMonth < today.getMonth())) {
      daysLeft = 0; // past month
    }
    
    const remainingBudget = monthlyBudget - monthTotal;
    const dailyIdeal = daysLeft > 0 ? Math.round(Math.max(0, remainingBudget) / daysLeft) : 0;
    
    // Proyeksi akhir bulan berdasarkan rata-rata harian (jika bulan sekarang)
    let projected = monthTotal;
    if (currentYear === today.getFullYear() && currentMonth === today.getMonth()) {
      const dayOfMonth = today.getDate();
      const avgDaily = dayOfMonth > 0 ? monthTotal / dayOfMonth : 0;
      projected = Math.round(avgDaily * daysInMonth);
    } else if (currentYear > today.getFullYear() || (currentYear === today.getFullYear() && currentMonth > today.getMonth())) {
      projected = monthTotal;
    }

    let state: 'safe' | 'normal' | 'warning' | 'danger' | 'over' = 'safe';
    if (percentUsed >= 100) {
      state = 'over';
    } else if (percentUsed >= 80) {
      state = 'danger';
    } else if (percentUsed >= 60) {
      state = 'warning';
    } else if (percentUsed >= 30) {
      state = 'normal';
    } else {
      state = 'safe';
    }

    return { 
      state, 
      percentUsed, 
      monthTotal, 
      monthlyBudget, 
      daysLeft, 
      dailyIdeal, 
      projected, 
      remainingBudget 
    };
  }, [transactions, monthlyBudget, currentMonth, currentYear]);

  const alarmConfig = useMemo(() => {
    const { state, percentUsed, monthTotal, monthlyBudget, daysLeft, dailyIdeal, projected, remainingBudget } = alarmState;
    const formattedProjected = formatRupiah(projected);
    const formattedBudget = formatRupiah(monthlyBudget);
    const formattedRemaining = formatRupiah(remainingBudget);
    const formattedDaily = formatRupiah(dailyIdeal);

    const configs = {
      safe: {
        gradient: 'linear-gradient(135deg, #1D9E75, #159060)',
        icon: '🛡️',
        badge: 'AMAN',
        badgeBg: 'rgba(255,255,255,0.25)',
        title: 'Keuanganmu Sehat!',
        body: (
          <span>
            Baru <strong>{percentUsed.toFixed(0)}%</strong> budget terpakai. Diproyeksikan menggunakan <strong>{formattedProjected}</strong> dari <strong>{formattedBudget}</strong> bulan ini — jauh di bawah batas!
          </span>
        ),
        barColor: 'rgba(255,255,255,0.8)',
        barBg: 'rgba(255,255,255,0.2)',
        footer: (
          <span>
            💡 Sisa {daysLeft} hari &nbsp;|&nbsp; Budget harian ideal: <strong>{formattedDaily}</strong>
          </span>
        ),
        pulse: false
      },
      normal: {
        gradient: 'linear-gradient(135deg, #4A90D9, #2E6BB0)',
        icon: '📊',
        badge: 'TERPANTAU',
        badgeBg: 'rgba(255,255,255,0.2)',
        title: 'Pengeluaran Normal',
        body: (
          <span>
            Sudah <strong>{percentUsed.toFixed(0)}%</strong> dari budget bulan ini. Masih on-track! Pertahankan di bawah <strong>{formattedDaily}/hari</strong> untuk {daysLeft} hari ke depan.
          </span>
        ),
        barColor: 'rgba(255,255,255,0.8)',
        barBg: 'rgba(255,255,255,0.2)',
        footer: (
          <span>
            📅 {daysLeft} hari tersisa &nbsp;|&nbsp; Sisa: <strong>{formattedRemaining}</strong>
          </span>
        ),
        pulse: false
      },
      warning: {
        gradient: 'linear-gradient(135deg, #EF9F27, #C97F10)',
        icon: '⚠️',
        badge: 'PERHATIAN',
        badgeBg: 'rgba(255,255,255,0.2)',
        title: 'Mulai Hati-Hati!',
        body: (
          <span>
            Budget sudah <strong>{percentUsed.toFixed(0)}%</strong> terpakai. Proyeksi akhir bulan: <strong>{formattedProjected}</strong> — di atas budget! Kurangi pengeluaran mulai sekarang.
          </span>
        ),
        barColor: 'rgba(255,255,255,0.85)',
        barBg: 'rgba(255,255,255,0.2)',
        footer: (
          <span>
            ⏰ {daysLeft} hari lagi &nbsp;|&nbsp; Maks. <strong>{formattedDaily}/hari</strong> agar tidak jebol
          </span>
        ),
        pulse: false
      },
      danger: {
        gradient: 'linear-gradient(135deg, #D85A30, #B33A15)',
        icon: '🚨',
        badge: 'BAHAYA',
        badgeBg: 'rgba(255,255,255,0.15)',
        title: 'Budget Hampir Habis!',
        body: (
          <span>
            ⚡ Sudah <strong>{percentUsed.toFixed(0)}%</strong> terpakai dan masih <strong>{daysLeft} hari</strong> tersisa! Proyeksi akhir bulan: <strong>{formattedProjected}</strong>. Rem total pengeluaran sekarang!
          </span>
        ),
        barColor: 'rgba(255,255,255,0.9)',
        barBg: 'rgba(255,255,255,0.15)',
        footer: (
          <span>
            🔴 Sisa {formattedRemaining} untuk {daysLeft} hari — hanya <strong>{formattedDaily}/hari</strong>
          </span>
        ),
        pulse: true
      },
      over: {
        gradient: 'linear-gradient(135deg, #B33A15, #8B1E00)',
        icon: '💸',
        badge: 'OVER BUDGET',
        badgeBg: 'rgba(255,255,255,0.15)',
        title: 'Budget Bulan Ini Jebol!',
        body: (
          <span>
            Pengeluaran melebihi budget <strong>{percentUsed.toFixed(0)}%</strong>! Total <strong>{formatRupiah(monthTotal)}</strong> dari budget <strong>{formattedBudget}</strong>. Evaluasi dan rencanakan lebih ketat bulan depan.
          </span>
        ),
        barColor: '#ff6b6b',
        barBg: 'rgba(255,255,255,0.15)',
        footer: (
          <span>
            📋 <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setActiveTab('insights')}>Buka Wawasan AI untuk analisis lengkap →</span>
          </span>
        ),
        pulse: true
      }
    };
    return configs[state];
  }, [alarmState, formatRupiah, setActiveTab]);

  const extraTips = useMemo(() => {
    const { state, daysLeft, dailyIdeal, projected, remainingBudget } = alarmState;

    const tips = {
      safe: [
        { icon: '🎯', text: <>Pertahankan pengeluaran di bawah <strong>{formatRupiah(dailyIdeal)}/hari</strong></> },
        { icon: '💰', text: <>Coba sisihkan <strong>{formatRupiah(Math.round(remainingBudget * 0.2))}</strong> untuk tabungan bulan ini</> },
        { icon: '📅', text: <>Masih ada <strong>{daysLeft} hari</strong> ke depan — terus jaga pola ini!</> }
      ],
      normal: [
        { icon: '📊', text: <>Rata-rata ideal: <strong>{formatRupiah(dailyIdeal)}/hari</strong> untuk sisa bulan</> },
        { icon: '⚡', text: <>Proyeksi akhir bulan: <strong>{formatRupiah(projected)}</strong></> },
        { icon: '💡', text: <>Coba catat setiap pengeluaran kecil — sering jadi penyumbang terbesar!</> }
      ],
      warning: [
        { icon: '✂️', text: <>Kurangi pengeluaran harian menjadi maks. <strong>{formatRupiah(dailyIdeal)}</strong></> },
        { icon: '🚫', text: <>Tunda pembelian tidak mendesak sampai bulan depan</> },
        { icon: '📱', text: <>Cek halaman Wawasan AI untuk tahu kategori mana yang paling boros</> }
      ],
      danger: [
        { icon: '🛑', text: <>Hentikan pengeluaran non-esensial <strong>sekarang</strong></> },
        { icon: '🍱', text: <>Masak sendiri / beli makanan warung, hindari delivery & kafe</> },
        { icon: '📞', text: <>Kalau perlu, hubungi keluarga untuk tambahan darurat</> }
      ],
      over: [
        { icon: '📋', text: <>Catat semua pengeluaran bulan ini dan identifikasi yang bisa dipangkas</> },
        { icon: '🗓️', text: <>Buat rencana anggaran ketat untuk bulan depan sekarang</> },
        { icon: '💬', text: <>Diskusikan situasi keuangan dengan orang tua atau teman terpercaya</> }
      ]
    };
    return tips[state] || tips.normal;
  }, [alarmState, formatRupiah]);


  if (!isLoggedIn) {
    const handleLoginSubmitForm = (e: React.FormEvent) => {
      e.preventDefault();
      
      let errors: Record<string, string> = {};
      
      // Validasi nama
      const trimmedNama = loginForm.nama.trim();
      if (!trimmedNama) {
        errors.nama = 'Nama lengkap wajib diisi';
      } else if (trimmedNama.length < 2) {
        errors.nama = 'Nama minimal 2 karakter';
      }
      
      // Validasi email — WAJIB @gmail.com
      const trimmedEmail = loginForm.email.trim();
      if (!trimmedEmail) {
        errors.email = 'Email wajib diisi';
      } else if (!isValidGmail(trimmedEmail)) {
        errors.email = 'Harus menggunakan email @gmail.com';
      }
      
      // Validasi password
      if (!loginForm.password) {
        errors.password = 'Password wajib diisi';
      } else if (loginForm.password.length < 6) {
        errors.password = 'Password minimal 6 karakter';
      }
      
      // Validasi anggaran
      const budgetVal = parseInt(loginForm.budget) || 0;
      if (!budgetVal || budgetVal < 50000) {
        errors.budget = 'Anggaran minimal Rp 50.000';
      }
      
      if (Object.keys(errors).length > 0) {
        setLoginErrors(errors);
        return;
      }
      
      setIsSubmitLoading(true);
      
      setTimeout(() => {
        setIsSubmitLoading(false);
        
        const savedFoto = localStorage.getItem('tabunganaja_foto_profil');
        const profile = {
          nama: trimmedNama,
          name: trimmedNama,
          email: trimmedEmail,
          passwordHash: btoa(loginForm.password), // base64 encode sederhana
          budgetBulanan: budgetVal,
          fotoProfil: savedFoto || null,
          tanggalDaftar: new Date().toISOString().split('T')[0]
        };
        
        localStorage.setItem('tabunganaja_user', JSON.stringify(profile));
        localStorage.setItem('tabunganaja_monthly_budget', budgetVal.toString());
        localStorage.removeItem('tabunganaja_is_logged_out');
        
        // Save the account to saved accounts list for autofill feature
        let accounts = [];
        try {
          accounts = JSON.parse(localStorage.getItem('sakuPintar_savedAccounts') || '[]');
        } catch (e) {
          console.error('Error parsing sakuPintar_savedAccounts:', e);
        }
        if (!Array.isArray(accounts)) {
          accounts = [];
        }
        const existingIndex = accounts.findIndex((acc: any) => acc.nama.toLowerCase() === trimmedNama.toLowerCase());
        const newAccount = {
          nama: trimmedNama,
          email: trimmedEmail,
          passwordHash: btoa(loginForm.password),
          budget: budgetVal.toString()
        };
        if (existingIndex !== -1) {
          accounts[existingIndex] = newAccount;
        } else {
          accounts.push(newAccount);
        }
        localStorage.setItem('sakuPintar_savedAccounts', JSON.stringify(accounts));
        setSavedAccounts(accounts);
        
        setUserProfile(profile);
        setMonthlyBudget(budgetVal);
        initCalendarToCurrentMonth();
        setIsLoggedIn(true);
        showToast('Selamat Datang di SakuPintar!');
      }, 600);
    };

    return (
      <div id="loginPage" className="flex min-h-screen font-nunito bg-[#FAFAFA]" style={{ fontFamily: "'Nunito', sans-serif" }}>
        
        {/* PANEL KIRI: Branding */}
        <div className="login-brand-panel hidden md:flex">
          {/* Background dengan pola dekoratif */}
          <div className="login-brand-bg"></div>
          
          <div className="login-brand-content">
            {/* LOGO + NAMA: satu baris sejajar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              <div style={{
                width: '60px', height: '60px', flexShrink: 0,
                background: 'rgba(255,255,255,0.15)',
                border: '2px solid rgba(255,255,255,0.3)',
                borderRadius: '17px', padding: '8px', boxSizing: 'border-box',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <SakuPintarLogo size={40} bgColor="transparent" />
              </div>
              <div style={{
                fontSize: '34px', fontWeight: '800', color: 'white',
                lineHeight: '1.1', letterSpacing: '-0.5px',
                fontFamily: "'Playfair Display', 'Georgia', serif"
              }}>SakuPintar</div>
            </div>
            
            <p className="login-brand-tagline">Smart Spend Analyzer<br />untuk Mahasiswa Indonesia</p>
            
            {/* 3 feature highlights */}
            <div className="login-features">
              <div className="login-feature-item">
                <span className="login-feat-icon">✦</span>
                <span>Catat pengeluaran dengan bahasa sehari-hari</span>
              </div>
              <div className="login-feature-item">
                <span className="login-feat-icon">📊</span>
                <span>Visualisasi kalender heatmap spending harian</span>
              </div>
              <div className="login-feature-item">
                <span className="login-feat-icon">🤖</span>
                <span>Wawasan AI proaktif sebelum budget habis</span>
              </div>
            </div>
            
            {/* Dekorasi angka */}
            <div className="login-deco-text">Rp 0</div>
          </div>
        </div>
        
        {/* PANEL KANAN: Form */}
        <div className="login-form-panel flex-1">
          
          {/* Logo kecil untuk mobile */}
          <div className="login-mobile-logo flex md:hidden items-center" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '42px', height: '42px', flexShrink: 0,
              background: 'rgba(255,255,255,0.2)',
              border: '1.5px solid rgba(255,255,255,0.35)',
              borderRadius: '12px', padding: '5px', boxSizing: 'border-box',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <SakuPintarLogo size={30} bgColor="transparent" />
            </div>
            <span style={{ fontWeight: '800', fontSize: '20px', color: 'white', letterSpacing: '-0.3px' }}>SakuPintar</span>
          </div>
          
          <div className="login-form-container">
            
            <div className="login-form-header">
              <h2 className="login-form-title">Mulai perjalananmu</h2>
              <p className="login-form-subtitle">Isi data di bawah untuk mengakses dashboard keuanganmu</p>
            </div>
            
            <form onSubmit={handleLoginSubmitForm}>
              {/* Form fields */}
              <div className="login-fields">
                
                {/* Nama Lengkap */}
                <div className="login-field-group" id="fieldNama">
                  <label className="login-label">
                    <span className="login-label-icon">👤</span>
                    Nama Lengkap
                  </label>
                  <div className={`login-input-wrap ${loginErrors.nama ? 'error' : (loginForm.nama.length >= 2 ? 'success' : '')}`}>
                    <input 
                      type="text" 
                      id="inputNama" 
                      className="login-input"
                      placeholder="Nama lengkapmu..."
                      autoComplete="off"
                      list="namaDatalist"
                      value={loginForm.nama}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLoginForm(prev => ({ ...prev, nama: val }));
                        if (loginErrors.nama) {
                          setLoginErrors(prev => ({ ...prev, nama: '' }));
                        }
                        
                        // Check if selected name matches a saved account
                        const matchingAccount = savedAccounts.find(
                          acc => acc.nama && acc.nama.trim().toLowerCase() === val.trim().toLowerCase()
                        );
                        if (matchingAccount) {
                          let decodedPassword = '';
                          try {
                            decodedPassword = atob(matchingAccount.passwordHash);
                          } catch (err) {
                            decodedPassword = '';
                          }
                          setLoginForm({
                            nama: matchingAccount.nama,
                            email: matchingAccount.email || '',
                            password: decodedPassword,
                            budget: matchingAccount.budget ? String(matchingAccount.budget) : '',
                          });
                          // Clear all errors
                          setLoginErrors({});
                        }
                      }}
                    />
                    <datalist id="namaDatalist">
                      {savedAccounts.map((acc, index) => (
                        <option key={index} value={acc.nama} />
                      ))}
                    </datalist>
                  </div>
                  {loginErrors.nama && (
                    <div className="login-field-error visible" id="errorNama">
                      ⚠ {loginErrors.nama}
                    </div>
                  )}
                </div>
                
                {/* Email */}
                <div className="login-field-group" id="fieldEmail">
                  <label className="login-label">
                    <span className="login-label-icon">📧</span>
                    Email Gmail
                  </label>
                  <div className={`login-input-wrap ${loginErrors.email ? 'error' : (isValidGmail(loginForm.email) ? 'success' : '')}`}>
                    <input 
                      type="text" 
                      id="inputEmail" 
                      className="login-input"
                      placeholder="namamu@gmail.com"
                      autoComplete="email"
                      value={loginForm.email}
                      onChange={(e) => {
                        setLoginForm(prev => ({ ...prev, email: e.target.value }));
                        if (loginErrors.email) {
                          setLoginErrors(prev => ({ ...prev, email: '' }));
                        }
                      }}
                    />
                    {showSuffix && (
                      <span className="login-input-suffix" id="emailSuffix" style={{ display: 'block' }}>@gmail.com</span>
                    )}
                  </div>
                  {loginErrors.email && (
                    <div className="login-field-error visible" id="errorEmail">
                      ⚠ {loginErrors.email}
                    </div>
                  )}
                  <div className="login-field-hint">Harus menggunakan email @gmail.com</div>
                </div>
                
                {/* Password */}
                <div className="login-field-group" id="fieldPassword">
                  <label className="login-label">
                    <span className="login-label-icon">🔒</span>
                    Password
                  </label>
                  <div className={`login-input-wrap ${loginErrors.password ? 'error' : (loginForm.password.length >= 6 ? 'success' : '')}`}>
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      id="inputPassword" 
                      className="login-input"
                      placeholder="Minimal 6 karakter..."
                      autoComplete="new-password"
                      value={loginForm.password}
                      onChange={(e) => {
                        setLoginForm(prev => ({ ...prev, password: e.target.value }));
                        if (loginErrors.password) {
                          setLoginErrors(prev => ({ ...prev, password: '' }));
                        }
                      }}
                    />
                    <button 
                      type="button" 
                      className="login-toggle-pw" 
                      onClick={() => setShowPassword(v => !v)}
                      title="Tampilkan/sembunyikan password"
                    >
                      {showPassword ? '🙈' : '👁'}
                    </button>
                  </div>
                  {/* Password strength indicator */}
                  {pwStrength && (
                    <div className="pw-strength-bar" id="pwStrengthBar" style={{ display: 'block' }}>
                      <div className="pw-strength-fill" id="pwStrengthFill" style={{ width: pwStrength.pct, background: pwStrength.color }}></div>
                    </div>
                  )}
                  {pwStrength && (
                    <div className="login-field-hint" id="pwStrengthText" style={{ color: pwStrength.color }}>
                      {pwStrength.label}
                    </div>
                  )}
                  {loginErrors.password && (
                    <div className="login-field-error visible" id="errorPassword">
                      ⚠ {loginErrors.password}
                    </div>
                  )}
                </div>
                
                {/* Anggaran Bulanan */}
                <div className="login-field-group" id="fieldBudget">
                  <label className="login-label">
                    <span className="login-label-icon">💵</span>
                    Anggaran Bulanan
                  </label>
                  <div className={`login-input-wrap login-rp-wrap ${loginErrors.budget ? 'error' : (parseInt(loginForm.budget) >= 50000 ? 'success' : '')}`}>
                    <span className="login-rp-prefix">Rp</span>
                    <input 
                      type="number" 
                      id="inputBudget" 
                      className="login-input login-input-rp"
                      placeholder="Contoh: 1500000"
                      min="50000"
                      max="99999999"
                      value={loginForm.budget}
                      onChange={(e) => {
                        setLoginForm(prev => ({ ...prev, budget: e.target.value }));
                        if (loginErrors.budget) {
                          setLoginErrors(prev => ({ ...prev, budget: '' }));
                        }
                      }}
                    />
                  </div>
                  {loginErrors.budget && (
                    <div className="login-field-error visible" id="errorBudget">
                      ⚠ {loginErrors.budget}
                    </div>
                  )}
                  <div className="login-field-hint">Uang bulanan yang kamu terima (kiriman ortu / beasiswa)</div>
                </div>
                
              </div>
              
              {/* Submit button */}
              <button type="submit" className="login-submit-btn" id="loginSubmitBtn" disabled={isSubmitLoading}>
                {!isSubmitLoading ? (
                  <span id="loginBtnText">Mulai Kelola Keuangan →</span>
                ) : (
                  <span id="loginBtnLoader">⏳ Memproses...</span>
                )}
              </button>
            </form>
            
            {/* Catatan privasi */}
            <div className="login-privacy-note">
              <span>🔒</span>
              <span>Data tersimpan di perangkatmu saja. Tidak ada server. Tidak ada tracking.</span>
            </div>
            
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Custom Logout Modal Overlay */}
      {showLogoutModal && (
        <div id="logoutModal" className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[99999] p-4 animate-fade-in">
          <div className="bg-white rounded-[20px] p-8 max-w-[340px] w-full text-center shadow-2xl scale-up-animation">
            <div className="text-4xl mb-3 select-none">👋</div>
            <h4 className="text-lg font-extrabold text-slate-900 mb-2">
              Yakin ingin logout?
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Data transaksimu akan tetap tersimpan aman di perangkat ini dan bisa diakses kembali setelah login lagi.
            </p>
            <div className="flex gap-3">
              <button 
                id="cancelLogoutBtn"
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-black transition cursor-pointer"
              >
                Batal
              </button>
              <button 
                id="confirmLogoutBtn"
                type="button"
                onClick={() => {
                  setShowLogoutModal(false);
                  localStorage.setItem('tabunganaja_is_logged_out', 'true');
                  
                  setLoginForm({
                    nama: '',
                    email: '',
                    password: '',
                    budget: '',
                  });
                  
                  setIsLoggedIn(false);
                  showToast('Sampai jumpa lagi!', 'success');
                }}
                className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black transition shadow-md shadow-rose-100 cursor-pointer"
              >
                Ya, Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE TOP NAVBAR */}
      <div id="mobileNavbar" ref={mobileNavbarRef} style={{ display: 'none' }}>
        <div className="mobile-logo flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: "34px", height: "34px", flexShrink: 0, background: "#1D9E75", borderRadius: "9px", padding: "4px", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <SakuPintarLogo size={26} bgColor="transparent" />
          </div>
          <span style={{ fontSize: "16px", fontWeight: "800", color: "#1D9E75" }}>SakuPintar</span>
        </div>
        
        <div style={{ position: 'relative' }}>
          <button 
            id="mobileMenuBtn" 
            onClick={() => setIsMobileMenuOpen(prev => !prev)}
            className={`cursor-pointer ${isMobileMenuOpen ? 'active' : ''}`}
          >
            <span>Menu</span>
            <span className="arrow-icon" style={{ display: 'inline-block', transition: 'transform 0.2s' }}>▾</span>
          </button>
          
          <div id="mobileDropdown" className={isMobileMenuOpen ? 'open' : ''}>
            <div 
              className={`dropdown-item ${activeTab === 'dashboard' ? 'active' : ''}`} 
              onClick={() => {
                initCalendarToCurrentMonth();
                setActiveTab('dashboard');
                setIsMobileMenuOpen(false);
              }}
            >
              <span className="item-icon">📊</span> Dashboard
            </div>
            <div 
              className={`dropdown-item ${activeTab === 'transactions' ? 'active' : ''}`} 
              onClick={() => {
                setActiveTab('transactions');
                setIsMobileMenuOpen(false);
              }}
            >
              <span className="item-icon">📋</span> Transaksi
            </div>
            <div 
              className={`dropdown-item ${activeTab === 'insights' ? 'active' : ''}`} 
              onClick={() => {
                setActiveTab('insights');
                setIsMobileMenuOpen(false);
              }}
            >
              <span className="item-icon">✨</span> Wawasan AI
            </div>
            <div className="dropdown-divider"></div>
            <div 
              className={`dropdown-item ${activeTab === 'settings' ? 'active' : ''}`} 
              onClick={() => {
                setActiveTab('settings');
                setIsMobileMenuOpen(false);
              }}
            >
              <span className="item-icon">⚙️</span> Pengaturan
            </div>
            <div className="dropdown-divider"></div>
            <div 
              className="dropdown-item logout-item" 
              onClick={() => {
                setIsMobileMenuOpen(false);
                handleLogout();
              }}
            >
              <span className="item-icon">↪</span> Logout
            </div>
          </div>
        </div>
      </div>

      <div className="app-container">
        {/* --- SIDEBAR PANEL --- */}
        <aside className="sidebar">
          <div className="sidebar-logo-area">
            <SakuPintarLogo size={40} bgColor="transparent" />
            <div>
              <div className="logo-text">SakuPintar</div>
              <div className="logo-tagline uppercase">Smart Spend Analyzer</div>
            </div>
          </div>

          {/* Navigation list */}
          <nav className="nav-section nav-menu flex-1 space-y-1">
            <button 
              type="button"
              onClick={() => {
                initCalendarToCurrentMonth();
                setActiveTab('dashboard');
              }}
              className={`nav-item w-full flex items-center gap-3 transition text-left cursor-pointer ${activeTab === 'dashboard' ? 'active' : ''}`}
            >
              <CalendarIcon className="nav-icon w-5 h-5" />
              <span>Dashboard</span>
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab('transactions')}
              className={`nav-item w-full flex items-center gap-3 transition text-left cursor-pointer ${activeTab === 'transactions' ? 'active' : ''}`}
            >
              <TrendingDown className="nav-icon w-5 h-5" />
              <span>Transaksi</span>
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab('insights')}
              className={`nav-item w-full flex items-center gap-3 transition text-left cursor-pointer ${activeTab === 'insights' ? 'active' : ''}`}
            >
              <Sparkles className="nav-icon w-5 h-5" />
              <span>Wawasan AI</span>
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`nav-item w-full flex items-center gap-3 transition text-left cursor-pointer ${activeTab === 'settings' ? 'active' : ''}`}
            >
              <Settings className="nav-icon w-5 h-5" />
              <span>Pengaturan</span>
            </button>
          </nav>

          {/* User profile section di sidebar bawah */}
          <div className="user-profile-section mt-auto">
            <div className="user-profile-top">
              {userProfile.fotoProfil ? (
                <img 
                  src={userProfile.fotoProfil} 
                  alt="Profile Avatar" 
                  className="user-avatar object-cover shadow-sm bg-slate-200"
                />
              ) : (
                <div className="user-avatar text-xs font-bold">
                  {((userProfile.nama || userProfile.name || 'U').split(' ').map((n: string) => n[0]).join('').substring(0,2).toUpperCase())}
                </div>
              )}
              <div className="user-info">
                <h4 className="user-name">{userProfile.nama || userProfile.name}</h4>
                <p className="user-email">{userProfile.email}</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={handleLogout}
              className="btn-logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* --- MAIN PAGE VIEW --- */}
        <main className="main-content">
          <div className="max-w-[1100px] mx-auto w-full">
            {/* TOP COMPACT HEADER HEADER BASED ON ACTIVE TAB */}
            {activeTab === 'dashboard' && (
              <div className="page-header-card">
                <div className="header-left">
                  <div className="header-label">Dashboard Finansial</div>
                  <div className="header-title">Selamat Datang kembali, <span className="highlight">{((userProfile.nama || userProfile.name || 'User').split(' ')[0])}!</span></div>
                </div>
                <div className="header-right">
                  <span className="today-dot" style={{ background: '#1D9E75' }}></span>
                  Hari ini: {formattedTodayDate}
                </div>
              </div>
            )}

            {/* Banner Alert Toast / Feedback banner */}
        {toastMessage && (
          <div className={`p-4 mb-4 rounded-xl flex items-center gap-3 shadow-md animate-fade-in transition duration-300 ${toastMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-l-4 border-emerald-500' : 'bg-rose-50 text-rose-800 border-l-4 border-rose-500'}`}>
            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <span className="font-bold text-sm">{toastMessage.text}</span>
          </div>
        )}

        {/* Alarm Boros List Area */}
        {alarms.length > 0 && (
          <div className="mb-6 space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-rose-500 animate-bounce" />
                <span className="font-extrabold text-sm text-rose-500 uppercase tracking-wide">Pemberitahuan Alarm Boros</span>
              </div>
              <button 
                onClick={() => setAlarms([])} 
                className="text-xs text-slate-400 hover:text-slate-600 font-bold hover:underline"
              >
                Hapus Semua ({alarms.length})
              </button>
            </div>
            {alarms.map((al) => (
              <div 
                key={al.id} 
                className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-bold leading-normal shadow-sm ${al.type === 'danger' ? 'bg-rose-50/80 text-rose-800 border-rose-100 hover:bg-rose-50' : 'bg-amber-50/80 text-amber-800 border-amber-100 hover:bg-amber-50'}`}
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${al.type === 'danger' ? 'text-rose-500' : 'text-amber-500'}`} />
                  <span>{al.message}</span>
                </div>
                <button 
                  onClick={() => setAlarms(prev => prev.filter(x => x.id !== al.id))}
                  className="p-1 hover:bg-black/5 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Render content based on active nav Tab */}
        {activeTab === 'dashboard' && (
          <div id="dashboardPage" className="dashboard-page">
            {/* ROW 1: METRIC CARDS */}
            <section className="metric-cards-row">
              <div className="metric-card flex items-center gap-4 bg-white">
                <div className="p-4 bg-rose-50 rounded-xl text-[#D85A30] flex-shrink-0 animate-pulse">
                  <TrendingDown className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <span className="metric-label block">Pengeluaran Bulan Ini</span>
                  <h3 className="metric-value text-[#D85A30]">{formatRupiah(totalPengeluaranBulanIni)}</h3>
                  <p className="metric-sub">
                    Diambil dari total bulan {monthNames[currentMonth]}
                  </p>
                </div>
              </div>

              <div className="metric-card flex items-center gap-4 bg-white">
                <div className="p-4 bg-[#F0FAF7] rounded-xl text-[#1D9E75] flex-shrink-0">
                  <Wallet className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <span className="metric-label block">Sisa Anggaran Bulanan</span>
                  <h3 className="metric-value text-[#1D9E75]">{formatRupiah(sisaBudgetBulanan)}</h3>
                  <p className="metric-sub">
                    Batas limit bulanan: {formatRupiah(monthlyBudget)}
                  </p>
                </div>
              </div>

              <div className="metric-card flex items-center gap-4 bg-white font-semibold">
                <div className="p-4 bg-slate-50 rounded-xl text-slate-600 flex-shrink-0">
                  <CalendarIcon className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <span className="metric-label block">Rata-Rata Harian</span>
                  <h3 className="metric-value text-slate-800">{formatRupiah(rataRataHarian)}</h3>
                  <p className="metric-sub">
                    Dibandingkan target harian: {formatRupiah(dailyBudget)}
                  </p>
                </div>
              </div>
            </section>

            {/* ROW 2: CALENDAR + RIGHT PANEL */}
            <section className="calendar-row">
              {/* KOLOM KIRI: Kalender + Alarm Boros (di-stack vertikal) */}
              <div className="calendar-left-col">
                {/* Calendar Container */}
                <div className="card calendar-card">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2 flex-wrap">
                      Kalender Spend Harian
                      
                      <div ref={monthPickerRef} className="relative inline-block select-none" id="calendarHeaderPicker">
                        <button 
                          id="calendarMonthYearBtn" 
                          onClick={toggleMonthPicker} 
                          className="month-year-btn"
                          type="button"
                        >
                          <span id="calendarMonthLabel">{monthNames[currentMonth].toUpperCase()} {currentYear}</span>
                          <span className="picker-arrow">▼</span>
                        </button>
                        
                        <div id="monthYearPicker" className={`month-year-picker ${isMonthPickerOpen ? 'open' : ''}`} style={pickerStyle}>
                          <div className="picker-header">
                            <button 
                              type="button"
                              className="picker-nav"
                              onClick={() => {
                                const minYear = new Date().getFullYear() - 5;
                                setPickerYear(prev => Math.max(minYear, prev - 1));
                              }}
                            >
                              ‹
                            </button>
                            <span className="picker-year-label">{pickerYear}</span>
                            <button 
                              type="button"
                              className="picker-nav"
                              onClick={() => {
                                const maxYear = new Date().getFullYear() + 1;
                                setPickerYear(prev => Math.min(maxYear, prev + 1));
                              }}
                            >
                              ›
                            </button>
                          </div>
                          <div className="picker-months-grid">
                            {['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'].map((m, idx) => {
                              const isActive = idx === currentMonth && pickerYear === currentYear;
                              return (
                                <button 
                                  key={m}
                                  type="button"
                                  className={`picker-month-btn ${isActive ? 'active' : ''}`}
                                  onClick={() => {
                                    setCurrentMonth(idx);
                                    setCurrentYear(pickerYear);
                                    setIsMonthPickerOpen(false);
                                  }}
                                >
                                  {m}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </h3>
                    <p className="text-xs text-slate-400">Pilih tanggal kalender untuk mencatat/melihat pengeluaran rinci.</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handlePrevMonth}
                      className="p-2 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 rounded-xl transition shadow-sm"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={handleNextMonth}
                      className="p-2 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 rounded-xl transition shadow-sm"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Calendar Column headers headings */}
                <div className="grid grid-columns-7 grid-template-7 repeat(7, 1fr) gap-4 text-center text-[10px] font-black text-slate-400 tracking-wider mb-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                  {columnHeaders.map((hdr, idx) => (
                    <div key={idx} className="pb-2">{hdr}</div>
                  ))}
                </div>

                {/* Grid layout for days (BUG #1 SOURCE WRAPPER FIXED) */}
                <div className="calendar-grid-wrapper">
                  <div className="calendar-grid">
                    {calendarCells.map((val, idx) => {
                      if (val === null) {
                        return (
                          <div 
                            key={`empty-${idx}`} 
                            className="calendar-cell bg-slate-50/50 border border-slate-100 cursor-not-allowed opacity-40" 
                          />
                        );
                      }

                      const fullDateStr = formatDateString(currentYear, currentMonth, val);
                      const isSelected = selectedDate === fullDateStr;
                      
                      // Total spend on this matched day
                      const daySpend = spendingByDayMap[fullDateStr] || 0;
                      
                      // Check logic based dynamically on budget totals
                      const isToday = fullDateStr === getTodayDate();
                      
                      let bgStyle = 'bg-white border border-slate-100 hover:bg-slate-50 hover:border-slate-300 text-slate-700';
                      let textSpendColor = 'text-slate-400';
                      
                      if (daySpend > 0) {
                        if (daySpend < dailyBudget * 0.5) {
                          bgStyle = 'text-white border-transparent hover:brightness-95';
                          bgStyle += ' bg-[#639922]'; // Hemat Green
                          textSpendColor = 'text-white/85';
                        } else if (daySpend >= dailyBudget * 0.5 && daySpend <= dailyBudget) {
                          bgStyle = 'text-white border-transparent hover:brightness-95';
                          bgStyle += ' bg-[#EF9F27]'; // Normal Amber
                          textSpendColor = 'text-white/85';
                        } else {
                          bgStyle = 'text-white border-transparent hover:brightness-95';
                          bgStyle += ' bg-[#D85A30]'; // Over Coral
                          textSpendColor = 'text-white/85';
                        }
                      }

                      return (
                        <div
                          key={`cell-${val}`}
                          onClick={() => setSelectedDate(fullDateStr)}
                          className={`calendar-cell relative group ${bgStyle} ${isSelected ? 'ring-2 ring-[#1D9E75] scale-[1.03] z-10 shadow-sm' : ''} ${isToday ? 'font-bold' : ''}`}
                          style={isToday ? { border: '2px solid #1D9E75' } : {}}
                        >
                          {/* Day Number */}
                          <span className="text-[14px] font-extrabold block">{val}</span>
                          
                          {/* Total limit tag if exists */}
                          {daySpend > 0 && (
                            <span className={`text-[9px] font-bold block mt-0.5 tracking-tight ${textSpendColor}`}>
                              {formatShort(daySpend)}
                            </span>
                          )}

                          {/* Tooltip on hover state */}
                          <div className="absolute bottom-[calc(100%+4px)] left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2.5 rounded-lg font-bold opacity-0 group-hover:opacity-100 pointer-events-none transition duration-150 whitespace-nowrap z-30 shadow-lg">
                            {fullDateStr} : {daySpend > 0 ? formatRupiah(daySpend) : '0 rupiah'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Calendar Legend indicators bar */}
                <div className="calendar-legend border-t border-slate-100">
                  <div className="legend-row">
                    <div className="legend-item">
                      <span className="legend-color-box bg-slate-100 border border-slate-200"></span>
                      <span>Tdk Ada Transaksi</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-color-box bg-[#639922]"></span>
                      <span>Hemat (&lt; 50%)</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-color-box bg-[#EF9F27]"></span>
                      <span>Sedang (50%-100%)</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-color-box bg-[#D85A30]"></span>
                      <span>Boros (&gt; 100%)</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-color-box border-2 border-[#1D9E75] bg-white"></span>
                      <span>Hari Ini ({(() => {
                        const now = new Date();
                        const bulanPendek = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
                        return `${now.getDate()} ${bulanPendek[now.getMonth()]}`;
                      })()})</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Alarm Boros langsung di bawah kalender */}
              <div 
                ref={alarmCardRef}
                id="alarmBorosCard" 
                className={`alarm-boros-card ${
                  alarmCardHeight < 160 
                    ? 'alarm-compact' 
                    : alarmCardHeight <= 260 
                      ? 'alarm-normal' 
                      : 'alarm-wide'
                }`}
              >
                <div 
                  className="alarm-inner" 
                  style={{ 
                    background: alarmConfig.gradient, 
                    animation: alarmConfig.pulse ? 'alarmPulse 2s ease-in-out infinite' : undefined 
                  }}
                >
                  <div className="alarm-left">
                    <div className="alarm-icon">{alarmConfig.icon}</div>
                    <div className="alarm-text">
                      <div className="alarm-badge" style={{ background: alarmConfig.badgeBg }}>{alarmConfig.badge}</div>
                      <div className="alarm-title">{alarmConfig.title}</div>
                      <div className="alarm-body">{alarmConfig.body}</div>
                      
                      {/* Extra context for wide mode */}
                      <div className="alarm-extra">
                        <div className="alarm-divider"></div>
                        <div className="alarm-tips-title">💡 Yang bisa kamu lakukan:</div>
                        <div className="alarm-tips-list">
                          {extraTips.map((tip, idx) => (
                            <div key={idx} className="alarm-tip-item">
                              <span className="alarm-tip-icon">{tip.icon}</span>
                              <span className="alarm-tip-text">{tip.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="alarm-right">
                    <div className="alarm-percent">{alarmState.percentUsed.toFixed(0)}<span>%</span></div>
                    <div className="alarm-bar-bg" style={{ background: alarmConfig.barBg }}>
                      <div className="alarm-bar-fill" style={{ width: `${Math.min(alarmState.percentUsed, 100)}%`, background: alarmConfig.barColor }}></div>
                    </div>
                    <div className="alarm-footer">{alarmConfig.footer}</div>
                  </div>
                </div>
              </div>

            </div>

            {/* Dynamic right sidebar: Detail Selected Date Spend + Catat Cepat AI Input */}
            <div className="flex flex-col gap-4 right-panel">
                {/* 1. Quick Budget Config Slider Card */}
                <div className="card">
                  <h4 className="font-extrabold text-[#1D9E75] text-sm mb-1 uppercase tracking-wider">
                    Atur Anggaran Harian (Batas)
                  </h4>
                  <p className="text-xs text-slate-400 mb-3">Tentukan target harian untuk indikator visual kalender.</p>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500">Anggaran Harian:</span>
                      <span className="text-sm font-black text-[#1D9E75] bg-[#F0FAF7] border border-[#D1EFE5] px-2.5 py-1 rounded-lg">
                        {formatRupiah(dailyBudget)}
                      </span>
                    </div>
                    <input 
                      type="range"
                      min="30000"
                      max="300000"
                      step="10000"
                      value={dailyBudget}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setDailyBudget(val);
                        localStorage.setItem('tabunganaja_daily_budget', val.toString());
                      }}
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#1D9E75]"
                    />
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <span>Rp 30k</span>
                      <span>Rp 150k</span>
                      <span>Rp 300k</span>
                    </div>
                  </div>
                </div>

                {/* 2. Catat Cepat AI Box */}
                <div className="card">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-extrabold text-[#1D9E75] text-sm uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#1D9E75] fill-emerald-100 animate-pulse" />
                      Catat Cepat (AI)
                    </h4>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    Ketik atau ucapkan pengeluaran bahasa sehari-hari. Akan diparse otomatis.
                  </p>

                  {/* Tab Switcher: Ketik / Suara */}
                  <div className="input-mode-tabs mb-4">
                    <button 
                      id="tab-text" 
                      onClick={() => setCurrentInputMode('text')}
                      className={`mode-tab ${currentInputMode === 'text' ? 'active' : ''}`}
                    >
                      ⌨️ Ketik
                    </button>
                    <button 
                      id="tab-voice" 
                      onClick={() => setCurrentInputMode('voice')}
                      className={`mode-tab ${currentInputMode === 'voice' ? 'active' : ''}`}
                      title={!isVoiceSupported ? 'Browser tidak mendukung voice input' : ''}
                      style={!isVoiceSupported ? { opacity: 0.5 } : {}}
                    >
                      🎙️ Suara
                    </button>
                  </div>

                  {/* MODE TEXT (default) */}
                  {currentInputMode === 'text' && (
                    <div id="catcepat-text-mode">
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          id="inputCatat"
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSubmitTransaksi();
                            }
                          }}
                          placeholder="Contoh: Makan bakso urat 15 ribu..."
                          disabled={isLoading}
                          className="flex-1 px-3.5 py-2.5 border border-slate-200 focus:border-[#1D9E75] focus:outline-none rounded-xl text-sm font-semibold text-slate-700 bg-slate-50/50 focus:bg-white disabled:opacity-60 disabled:cursor-not-allowed transition"
                        />
                        <button 
                          id="btnKirim"
                          onClick={handleSubmitTransaksi}
                          disabled={isLoading || !inputText.trim()}
                          className="p-2.5 bg-[#1D9E75] hover:bg-[#157355] font-extrabold text-white rounded-xl shadow-md shadow-emerald-50 hover:shadow-emerald-100 transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoading ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                          ) : (
                            <Send className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                        Contoh: <i>"Beli kopi boba isi 25rb"</i> atau <i>"2 mangkok mie ayam 30ribu"</i>
                      </p>
                    </div>
                  )}

                  {/* MODE VOICE */}
                  {currentInputMode === 'voice' && (
                    <div id="catcepat-voice-mode" className="flex flex-col items-center py-4 gap-3">
                      {voicePermissionError ? (
                        <div id="voicePermissionBox" className="bg-[#FFF5F0] border-2 border-[#F5C9B8] rounded-[16px] p-5 text-center w-full max-w-sm">
                          <div className="text-3xl mb-2">🔒</div>
                          <div className="text-sm font-extrabold text-[#D85A30] mb-1.5 uppercase tracking-wide">Izin Mikrofon Diperlukan</div>
                          <div className="text-xs text-slate-500 leading-relaxed mb-4">
                            Untuk menggunakan voice input, izinkan akses mikrofon di browser kamu.<br /><br />
                            <strong>Cara mengizinkan:</strong><br />
                            • Klik ikon 🔒 atau 🎙️ di address bar browser<br />
                            • Pilih <strong>"Izinkan"</strong> untuk Mikrofon<br />
                            • Refresh atau klik tombol di bawah untuk mencoba lagi
                          </div>
                          <button 
                            type="button"
                            onClick={() => {
                              setVoicePermissionError(false);
                              setVoiceStatusText('Tap untuk mulai bicara');
                              setVoiceStatusColor('');
                              toggleVoiceRecording();
                            }}
                            className="px-5 py-2.5 bg-[#1D9E75] hover:bg-[#157355] text-white rounded-xl text-sm font-black transition cursor-pointer"
                          >
                            Coba Lagi
                          </button>
                        </div>
                      ) : (
                        <>
                          {/* Tombol mikrofon besar */}
                          <button 
                            id="voiceMicBtn"
                            type="button"
                            onClick={toggleVoiceRecording}
                            className={`voice-mic-btn ${isRecording ? 'recording' : 'idle'}`}
                            title="Tap untuk mulai/berhenti merekam suara"
                          >
                            {isRecording ? '⏹' : '🎙️'}
                          </button>
                          
                          {/* Status text */}
                          <p 
                            id="voiceStatusText" 
                            className="voice-status-text font-bold" 
                            style={voiceStatusColor ? { color: voiceStatusColor } : {}}
                          >
                            {voiceStatusText}
                          </p>
                          
                          {/* Area hasil voice */}
                          {voiceTranscript && (
                            <div id="voiceResultArea" className="w-full">
                              <div className="voice-transcript-box">
                                <p className="voice-transcript-label">Hasil deteksi:</p>
                                <p id="voiceTranscriptPreview" className="voice-transcript-text">
                                  {voiceTranscript}
                                </p>
                              </div>
                              <div className="voice-action-btns">
                                <button 
                                  type="button"
                                  onClick={() => {
                                    setVoiceTranscript('');
                                    setVoiceStatusText('Tap untuk mulai bicara');
                                  }} 
                                  className="btn-retry"
                                  disabled={isLoading}
                                >
                                  🔄 Coba Lagi
                                </button>
                                <button 
                                  type="button"
                                  onClick={submitVoiceTransaksi} 
                                  disabled={isLoading}
                                  className="btn-voice-save flex items-center justify-center gap-1.5"
                                >
                                  {isLoading ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>✓ Simpan Transaksi</>
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                          
                          <p className="voice-hint">
                            Ucapkan dengan jelas, contoh:<br />
                            <b>"makan siang dua puluh ribu"</b>
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. Selected Day Detailed List Card */}
                <div className="card detail-panel">
                  {/* Header panel dengan warna gradient */}
                  <div className="detail-panel-header">
                    <div className="detail-header-top">
                      <div>
                        <div className="detail-label">RINCIAN SPEND</div>
                        <div className="detail-date" id="detailDateTitle">
                          {(() => {
                            try {
                              const dateObj = new Date(selectedDate + 'T00:00:00');
                              const dayNames = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
                              const monthNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
                              return `${dayNames[dateObj.getDay()]}, ${dateObj.getDate()} ${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
                            } catch (e) {
                              return selectedDate;
                            }
                          })()}
                        </div>
                      </div>
                      <button 
                        type="button"
                        className="detail-close-btn" 
                        onClick={() => setSelectedDate(getTodayDate())} 
                        title="Kembali ke Hari Ini"
                      >
                        ✕
                      </button>
                    </div>
                    
                    {/* Summary bar */}
                    <div className="detail-summary-bar">
                      <div className="detail-summary-item">
                        <span className="detail-summary-label">Total Hari Ini</span>
                        <span className="detail-summary-value" id="detailTotalAmount">
                          {formatRupiah(transactions.filter(t => t.date === selectedDate).reduce((sum, t) => sum + t.amount, 0))}
                         </span>
                      </div>
                      <div className="detail-summary-divider"></div>
                      <div className="detail-summary-item">
                        <span className="detail-summary-label">Jml Transaksi</span>
                        <span className="detail-summary-value" id="detailTransaksiCount">
                          {transactions.filter(t => t.date === selectedDate).length} item
                        </span>
                      </div>
                      <div className="detail-summary-divider"></div>
                      <div className="detail-summary-item">
                        <span className="detail-summary-label">Status</span>
                        <span className={`detail-status-badge ${(() => {
                          const total = transactions.filter(t => t.date === selectedDate).reduce((sum, t) => sum + t.amount, 0);
                          const pct = dailyBudget > 0 ? (total / dailyBudget) * 100 : 0;
                          if (total === 0) return 'hemat';
                          if (pct >= 100) return 'boros';
                          if (pct >= 50) return 'sedang';
                          return 'hemat';
                        })()}`} id="detailStatusBadge">
                          {(() => {
                            const total = transactions.filter(t => t.date === selectedDate).reduce((sum, t) => sum + t.amount, 0);
                            const pct = dailyBudget > 0 ? (total / dailyBudget) * 100 : 0;
                            if (total === 0) return 'Hemat';
                            if (pct >= 100) return 'Boros';
                            if (pct >= 50) return 'Sedang';
                            return 'Hemat';
                          })()}
                        </span>
                       </div>
                    </div>
                  </div>
                  
                  {/* Daftar transaksi */}
                  <div className="detail-transaksi-list" id="detailTransaksiList">
                    {transactions.filter(t => t.date === selectedDate).length === 0 ? (
                      <div className="detail-empty">
                        <div className="detail-empty-icon">📭</div>
                        <p>Belum ada transaksi<br />pada tanggal ini.</p>
                      </div>
                    ) : (
                      transactions.filter(t => t.date === selectedDate).map(t => {
                        const categoryIcons: Record<string, string> = {
                          'Makan': '🍽️', 'Transport': '🚌', 'Minuman': '☕',
                           'Jajan': '🍿', 'Belanja': '🛍️', 'Hiburan': '🎬', 'Lainnya': '📦'
                         };
                        const categoryColors: Record<string, { bg: string; color: string }> = {
                          'Makan':    { bg: '#FFF3E8', color: '#E8722A' },
                          'Transport':{ bg: '#E8F4FF', color: '#2E7FC4' },
                          'Minuman':  { bg: '#FFF8E8', color: '#C4872E' },
                          'Jajan':    { bg: '#FFF0F8', color: '#C42E87' },
                          'Belanja':  { bg: '#F0F8FF', color: '#2E87C4' },
                          'Hiburan':  { bg: '#F0FFF4', color: '#2EC47F' },
                          'Lainnya':  { bg: '#F5F5F5', color: '#888888' }
                        };
                        const cfg = categoryColors[t.category] || categoryColors['Lainnya'];
                        const icon = categoryIcons[t.category] || '📦';
                        return (
                          <div key={t.id} className="detail-item-card">
                            <div className="detail-item-icon-wrap" style={{ backgroundColor: cfg.bg }}>
                              {icon}
                            </div>
                            <div className="detail-item-info">
                              <div className="detail-item-name">{t.item}</div>
                              <div className="detail-item-meta">
                                <span className="detail-item-cat" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                                  {t.category}
                                </span>
                                <span className="detail-item-time">{t.time || '00:00'}</span>
                              </div>
                            </div>
                            <div className="detail-item-right">
                              <div className="detail-item-amount" style={{ color: cfg.color }}>
                                {formatRupiah(t.amount)}
                              </div>
                              <button 
                                className="detail-item-hapus" 
                                onClick={() => handleDeleteTransaction(t.id)} 
                                title="Hapus"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  
                  {/* Form tambah manual di tanggal ini */}
                  <form onSubmit={handleManualAdd} className="detail-add-form">
                    <div className="detail-add-title">
                      <span className="detail-add-icon">＋</span>
                      CATAT MANUAL PADA TANGGAL INI
                    </div>
                    <div className="detail-form-fields">
                      <input 
                        type="text" 
                        placeholder="Nama Item..." 
                        value={manualItem}
                        onChange={(e) => setManualItem(e.target.value)}
                        className="detail-input"
                      />
                      <input 
                        type="text" 
                        placeholder="Harga (Rp)..." 
                        value={manualAmount}
                        onChange={(e) => setManualAmount(e.target.value.replace(/[^0-9]/g, ''))}
                        className="detail-input"
                      />
                    </div>
                    <div className="detail-form-bottom">
                      <select 
                        value={manualCategory}
                        onChange={(e) => setManualCategory(e.target.value)}
                        className="detail-select"
                      >
                        <option value="Makan">🍽️ Makan</option>
                        <option value="Transport">🚌 Transport</option>
                        <option value="Minuman">☕ Minuman</option>
                        <option value="Jajan">🍿 Jajan</option>
                        <option value="Belanja">🛍️ Belanja</option>
                        <option value="Hiburan">🎬 Hiburan</option>
                        <option value="Lainnya">📦 Lainnya</option>
                      </select>
                      <button type="submit" className="detail-save-btn">
                        ＋ Kirim Simpan
                      </button>
                    </div>
                  </form>
                  
                  {/* Tombol kembali ke Hari Ini */}
                  <button 
                    type="button"
                    onClick={() => setSelectedDate(getTodayDate())} 
                    className="detail-back-btn"
                  >
                    ← Kembali ke Catat Cepat
                  </button>
                </div>

              </div>
            </section>

            {/* ROW 3: CHART + INSIGHT */}
            <section className="chart-row">
              {/* Graphic container */}
              <div className="card chart-slider-card">
                <div className="chart-slider-header">
                  <div>
                    <h3 className="chart-slider-title font-extrabold text-slate-800 text-base">
                      {activeChartSlide === 0 && "Grafik Pengeluaran Mingguan"}
                      {activeChartSlide === 1 && "Grafik Pengeluaran Bulanan"}
                      {activeChartSlide === 2 && "Distribusi Status Pengeluaran"}
                    </h3>
                    <p className="chart-slider-subtitle text-xs text-slate-400">
                      {activeChartSlide === 0 && "Total belanja berdasarkan penanggalan hari aktif dalam minggu ini."}
                      {activeChartSlide === 1 && "Total belanja per tanggal dalam bulan ini."}
                      {activeChartSlide === 2 && "Seberapa hemat atau boros kamu bulan ini?"}
                    </p>
                  </div>
                  
                  <div className="chart-nav-wrap">
                    {/* Dots */}
                    <div className="chart-dots mr-2">
                      <span 
                        className={`chart-dot ${activeChartSlide === 0 ? 'active' : ''}`} 
                        onClick={() => setActiveChartSlide(0)}
                      />
                      <span 
                        className={`chart-dot ${activeChartSlide === 1 ? 'active' : ''}`} 
                        onClick={() => setActiveChartSlide(1)}
                      />
                      <span 
                        className={`chart-dot ${activeChartSlide === 2 ? 'active' : ''}`} 
                        onClick={() => setActiveChartSlide(2)}
                      />
                    </div>
                    
                    {/* Buttons */}
                    <button 
                      type="button" 
                      className="chart-nav-btn hover:bg-emerald-500 hover:text-white"
                      onClick={() => setActiveChartSlide(prev => (prev === 0 ? 2 : prev - 1))}
                    >
                      ‹
                    </button>
                    <button 
                      type="button" 
                      className="chart-nav-btn hover:bg-emerald-500 hover:text-white"
                      onClick={() => setActiveChartSlide(prev => (prev === 2 ? 0 : prev + 1))}
                    >
                      ›
                    </button>
                  </div>
                </div>
                
                <div className="chart-slides-viewport">
                  <div 
                    className="chart-slides-track" 
                    style={{ transform: `translateX(-${activeChartSlide * 100}%)` }}
                  >
                    {/* SLIDE 1: Weekly */}
                    <div className="chart-slide">
                      <div className="chart-container" style={{ height: "240px", position: "relative" }}>
                        {currentMonthTransactions.length === 0 ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/50 border border-dashed border-slate-200 rounded-xl p-4">
                            <HelpCircle className="w-8 h-8 text-slate-300 mb-2" />
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Belum Ada Riwayat Spending</p>
                            <p className="text-[10px] text-slate-400 text-center max-w-[250px]">
                              Tuliskan pembelian kamu atau tambahkan data manual di grid kalender untuk melihat update grafik mingguan.
                            </p>
                          </div>
                        ) : (
                          <Bar data={weeklyChartData} options={chartOptions} />
                        )}
                      </div>
                    </div>
                    
                    {/* SLIDE 2: Monthly */}
                    <div className="chart-slide">
                      <div className="chart-container" style={{ height: "240px", position: "relative" }}>
                        {currentMonthTransactions.length === 0 ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/50 border border-dashed border-slate-200 rounded-xl p-4">
                            <HelpCircle className="w-8 h-8 text-slate-300 mb-2" />
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Belum Ada Riwayat Spending</p>
                            <p className="text-[10px] text-slate-400 text-center max-w-[250px]">
                              Tuliskan pembelian kamu atau tambahkan data manual di grid kalender untuk melihat update grafik bulanan.
                            </p>
                          </div>
                        ) : (
                          <Bar data={monthlyChartData} options={monthlyChartOptions} />
                        )}
                      </div>
                    </div>
                    
                    {/* SLIDE 3: Distribution */}
                    <div className="chart-slide">
                      <div className="chart-container" style={{ height: "240px", position: "relative" }}>
                        {currentMonthTransactions.length === 0 ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/50 border border-dashed border-slate-200 rounded-xl p-4">
                            <HelpCircle className="w-8 h-8 text-slate-300 mb-2" />
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Belum Ada Riwayat Spending</p>
                            <p className="text-[10px] text-slate-400 text-center max-w-[250px]">
                              Tuliskan pembelian kamu atau tambahkan data manual di grid kalender untuk melihat update distribusi status.
                            </p>
                          </div>
                        ) : (
                          <div className="distribution-layout">
                            <div className="donut-wrap">
                              <Doughnut data={distributionChartData} options={distributionChartOptions} />
                              <div className="donut-center-label">
                                <div className="donut-pct">{distributionMetrics.dominantPct}%</div>
                                <div className="donut-status" style={{ color: distributionMetrics.dominantColor }}>
                                  {distributionMetrics.dominantStatus}
                                </div>
                              </div>
                            </div>
                            
                            <div className="distribution-legend">
                              <div className="dist-item">
                                <div className="dist-color" style={{ backgroundColor: "#10B981" }} />
                                <div className="flex-1">
                                  <div className="flex justify-between">
                                    <span className="dist-label">Hemat (&lt;50% Budget)</span>
                                    <span className="dist-pct" style={{ color: "#10B981" }}>{distributionMetrics.hematPct}%</span>
                                  </div>
                                  <p className="dist-desc">Kamu menghemat budget secara luar biasa pada hari-hari ini.</p>
                                </div>
                              </div>
                              
                              <div className="dist-item">
                                <div className="dist-color" style={{ backgroundColor: "#F59E0B" }} />
                                <div className="flex-1">
                                  <div className="flex justify-between">
                                    <span className="dist-label">Sedang (50%-100%)</span>
                                    <span className="dist-pct" style={{ color: "#F59E0B" }}>{distributionMetrics.sedangPct}%</span>
                                  </div>
                                  <p className="dist-desc">Pengeluaran harian cukup terjaga di bawah batas aman.</p>
                                </div>
                              </div>
                              
                              <div className="dist-item">
                                <div className="dist-color" style={{ backgroundColor: "#EF4444" }} />
                                <div className="flex-1">
                                  <div className="flex justify-between">
                                    <span className="dist-label">Boros (&gt;100% Budget)</span>
                                    <span className="dist-pct" style={{ color: "#EF4444" }}>{distributionMetrics.borosPct}%</span>
                                  </div>
                                  <p className="dist-desc">Pengeluaran harian melampaui limit target yang ditentukan.</p>
                                </div>
                              </div>
                              
                              <div className="dist-summary text-[11px] text-slate-400 font-medium">
                                Dari {daysInCurrentMonth} hari di bulan ini, kamu sudah mencatat transaksi pada {distributionMetrics.activeDays} hari.
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>


            </section>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="page-transaksi space-y-6">
            <div className="page-header-card">
              <div className="header-left">
                <div className="header-label">Riwayat Transaksi</div>
                <div className="header-title">Daftar Semua Transaksi</div>
              </div>
              <div className="header-right">Total: {filteredTransactions.length} Pembelian</div>
            </div>

            <section className="card p-6">
              <div className="border-b border-slate-100 pb-5 mb-5">
                <h3 className="font-extrabold text-lg text-slate-800">Penyaringan & Pencarian</h3>
                <p className="text-xs text-slate-400">Temukan pengeluaran harian Anda dengan cepat berdasarkan nama atau kategori.</p>
              </div>

              {/* Redesigned Search & Filter Toolbar */}
              <div className="transaksi-toolbar">
                <div className="search-box">
                  <span className="search-icon">🔍</span>
                  <input 
                    type="text" 
                    placeholder="Cari transaksi..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="filter-wrapper">
                  <span className="filter-label">Kategori</span>
                  <select 
                    value={filterCategory} 
                    onChange={(e) => setFilterCategory(e.target.value)} 
                    className="filter-select bg-transparent outline-none cursor-pointer"
                  >
                    <option value="Semua">Semua</option>
                    <option value="Makan">🍽️ Makan</option>
                    <option value="Transport">🚌 Transport</option>
                    <option value="Minuman">☕ Minuman</option>
                    <option value="Jajan">🍿 Jajan</option>
                    <option value="Belanja">🛍️ Belanja</option>
                    <option value="Hiburan">🎬 Hiburan</option>
                    <option value="Lainnya">📦 Lainnya</option>
                  </select>
                </div>
              </div>

              {/* Redesigned Card-Based Transactions List */}
              {filteredTransactions.length === 0 ? (
                <div className="transaksi-empty">
                  <div className="empty-icon">🔍</div>
                  <p className="font-extrabold text-slate-500 uppercase tracking-wide">Pencarian Tidak Ditemukan</p>
                  <p className="text-xs text-slate-400 mt-1">Cobalah kata kunci pencarian atau kategori filter lainnya.</p>
                </div>
              ) : (
                <>
                  <div className="transaksi-list" id="transaksiList">
                    {filteredTransactions.map(t => {
                      const categoryIcons: Record<string, string> = {
                        'Makan': '🍽️', 'Transport': '🚌', 'Minuman': '☕',
                        'Jajan': '🍿', 'Belanja': '🛍️', 'Hiburan': '🎬', 'Lainnya': '📦'
                      };
                      const categoryColors: Record<string, string> = {
                        'Makan': '#FFF3E8,#E8722A', 'Transport': '#E8F4FF,#2E7FC4',
                        'Minuman': '#FFF8E8,#C4872E', 'Jajan': '#FFF0F8,#C42E87',
                        'Belanja': '#F0F8FF,#2E87C4', 'Hiburan': '#F0FFF4,#2EC47F', 'Lainnya': '#F5F5F5,#888888'
                      };
                      const [bgColor, textColor] = (categoryColors[t.category] || '#F5F5F5,#888888').split(',');
                      const icon = categoryIcons[t.category] || '📦';
                      
                      let dateStr = t.date;
                      try {
                        const dateObj = new Date(t.date);
                        if (!isNaN(dateObj.getTime())) {
                          dateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                        }
                      } catch (e) {}

                      return (
                        <div key={t.id} className="transaksi-row">
                          <div className="t-icon-wrap" style={{ background: bgColor }}>
                            <span className="t-icon">{icon}</span>
                          </div>
                          <div className="t-info">
                            <div className="t-name">{t.item}</div>
                            <div className="t-meta flex items-center gap-2 flex-wrap">
                              <span className="t-date">📅 {dateStr}</span>
                              <span className="t-time">⏰ {t.time || '00:00'}</span>
                              <span className="t-badge" style={{ background: bgColor, color: textColor }}>{t.category}</span>
                            </div>
                          </div>
                          <div className="t-right flex flex-col items-end gap-1">
                            <div className="t-amount">Rp {t.amount.toLocaleString('id-ID')}</div>
                            <button 
                              className="t-hapus" 
                              onClick={() => handleDeleteTransaction(t.id)} 
                              title="Hapus"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary Footer */}
                  <div className="transaksi-footer">
                    <span id="transaksiCount">Menampilkan {filteredTransactions.length} transaksi</span>
                    <span id="transaksiTotal" className="footer-total">
                      Total: Rp {filteredTransactions.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                </>
              )}
            </section>
          </div>
        )}

        {activeTab === 'insights' && (
          <div id="page-wawasan" className="page-wawasan space-y-6">
            <div className="page-header-card">
              <div className="header-left">
                <div className="header-label">Wawasan AI</div>
                <div className="header-title">Analisis Finansial Cerdas</div>
              </div>
              <div className="header-right" style={{ color: '#1D9E75' }}>✦ AI Aktif</div>
            </div>

            {/* HERO CARD — mirip Alarm Boros tapi lebih besar dan detail */}
            <div 
              id="wawasanHeroCard" 
              className="wawasan-hero-card"
              style={{
                borderRadius: '20px',
                padding: '36px 40px',
                marginBottom: '24px',
                color: 'white',
                background: alarmConfig.gradient // Gunakan gradient tersinkronisasi dari alarmConfig!
              }}
            >
              {/* Row atas: badge state + persentase besar */}
              <div className="wawasan-hero-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div id="wStateBadge" style={{ background: 'rgba(255,255,255,0.2)', padding: '6px 16px', borderRadius: '50px', fontSize: '11px', fontWeight: 800, display: 'inline-block', marginBottom: '12px', border: '1px solid rgba(255,255,255,0.3)' }}>
                    STATUS: {financialSummary.badgeText}
                  </div>
                  <h2 id="wStateLabel" style={{ fontSize: '24px', fontWeight: 850, margin: 0, lineHeight: 1.2 }}>
                    {financialSummary.stateLabel}
                  </h2>
                </div>
                
                <div id="wPctBig" style={{ fontSize: '46px', fontWeight: 900, lineHeight: 1 }}>
                  {financialSummary.pctUsed}%
                </div>
              </div>
              
              {/* Deskripsi wawasan AI/Alarm (sinkron dengan alarm) */}
              <p id="wInsightText" style={{ fontSize: '15px', fontWeight: 600, lineHeight: 1.6, margin: '0 0 24px 0', opacity: 0.95 }}>
                {financialSummary.insightText}
              </p>
              
              {/* Row 3 kolom statistik pendukung */}
              <div className="wawasan-stats-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '20px' }}>
                <div>
                  <span style={{ fontSize: '11px', opacity: 0.8, fontWeight: 700, textTransform: 'uppercase' }}>Rata-rata/Hari</span>
                  <span id="wDailyAvg" style={{ display: 'block', fontSize: '16px', fontWeight: 800, marginTop: '4px' }}>
                    {formatRupiah(Math.round(financialSummary.dailyAvg))}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '11px', opacity: 0.8, fontWeight: 700, textTransform: 'uppercase' }}>Proyeksi Akhir Bulan</span>
                  <span id="wProjected" style={{ display: 'block', fontSize: '16px', fontWeight: 800, marginTop: '4px' }}>
                    {formatRupiah(financialSummary.proyeksi)}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '11px', opacity: 0.8, fontWeight: 700, textTransform: 'uppercase' }}>Hari Terboros</span>
                  <span id="wBorosDay" style={{ display: 'block', fontSize: '16px', fontWeight: 800, marginTop: '4px' }}>
                    {financialSummary.borosDay}
                  </span>
                </div>
              </div>
            </div>

            {/* Redesigned Two-Column Diagnostic & Wawasan Grid */}
            <div className="wawasan-grid">
              {/* Kiri (60%) */}
              <div className="flex flex-col gap-4">
                {/* Card "Status Budget" */}
                <div className="wawasan-insight-card">
                  <span className="insight-emoji">📈</span>
                  <div className="insight-status">Sisa Anggaran</div>
                  <div className="insight-title">
                    {financialSummary.sisa >= 0 
                      ? `Anda menghemat ${formatRupiah(financialSummary.sisa)} bulan ini!` 
                      : `Anggaran bulanan over limit sebesar ${formatRupiah(Math.abs(financialSummary.sisa))}!`
                    }
                  </div>
                  <div className="insight-body">
                    {financialSummary.insightText}
                  </div>
                  
                  {/* Budget meter progress bar */}
                  <div className="mt-4">
                    <div className="budget-meter">
                      <div className="budget-meter-fill" style={{ width: `${Math.min(100, financialSummary.pctUsed)}%` }}></div>
                    </div>
                    <div className="budget-meter-label">
                      <span>Terpakai: {financialSummary.pctUsed}% ({formatRupiah(financialSummary.totalMonth)})</span>
                      <span>Limit: {formatRupiah(financialSummary.monthlyBudget)}</span>
                    </div>
                  </div>
                </div>

                {/* Card "Sebaran Kategori" */}
                <div className="kategori-card">
                  <h4 className="card-title">Sebaran Pengeluaran Kategori</h4>
                  <div className="space-y-4">
                    {(() => {
                      const totalSum = financialSummary.sortedCats.reduce((acc, [_, val]) => acc + val, 0) || 1;
                      const maxVal = Math.max(...financialSummary.sortedCats.map(([_, val]) => val), 1);
                      
                      if (financialSummary.sortedCats.length === 0) {
                        return (
                          <p className="text-xs text-slate-400 font-bold text-center py-6">
                            Belum ada riwayat kategori pengeluaran bulan ini.
                          </p>
                        );
                      }

                      const kategoriConfig: Record<string, { icon: string; color: string }> = {
                        'Belanja': { icon: '🛍️', color: '#2E87C4' },
                        'Makan':   { icon: '🍽️', color: '#E8722A' },
                        'Hiburan': { icon: '🎬', color: '#2EC47F' },
                        'Transport':{ icon: '🚌', color: '#7F77DD' },
                        'Minuman': { icon: '☕', color: '#C4872E' },
                        'Jajan':   { icon: '🍿', color: '#C42E87' },
                        'Lainnya': { icon: '📦', color: '#888888' }
                      };

                      return financialSummary.sortedCats.map(([cat, val]) => {
                        const cfg = kategoriConfig[cat] || { icon: '📦', color: '#888888' };
                        const pct = Math.round((val / totalSum) * 100);
                        const barWidth = Math.max(4, Math.round((val / maxVal) * 100));

                        return (
                          <div key={cat} className="kategori-item">
                            <span className="kategori-emoji">{cfg.icon}</span>
                            <div className="kategori-info">
                              <div className="kategori-name-row">
                                <span className="kategori-name">{cat}</span>
                                <span className="kategori-pct">{pct}%</span>
                              </div>
                              <div className="kategori-bar-bg">
                                <div className="kategori-bar-fill" style={{ width: `${barWidth}%`, background: cfg.color }}></div>
                              </div>
                            </div>
                            <span className="text-[13px] font-bold text-slate-700 whitespace-nowrap ml-2">
                              {formatRupiah(val)}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>

              {/* Kanan (40%) */}
              <div className="wawasan-right">
                {/* Card "Tips Pintar" */}
                <div className="tips-card">
                  <h4 className="card-title">Tips Manajemen Keuangan</h4>
                  <div className="space-y-3">
                    <div className="tip-item">
                      <span className="tip-icon">💡</span>
                      <p className="tip-text">Manfaatkan filter kalender harian untuk memplot batas maksimal pengeluaran harian Anda secara ketat.</p>
                    </div>
                    <div className="tip-item">
                      <span className="tip-icon">🍿</span>
                      <p className="tip-text">Faktor pemicu boros terbesar seringkali berupa jajan makanan ringan. Batasi budget Kategori "Jajan"!</p>
                    </div>
                    <div className="tip-item">
                      <span className="tip-icon">🛡️</span>
                      <p className="tip-text">Simpan uang di awal bulan minimal sebesar 20% dari total penghasilan sebelum mengalokasikan budget belanja.</p>
                    </div>
                  </div>
                </div>

                {/* Card "AI Memantau" */}
                <div className="ai-monitor-card">
                  <div className="ai-monitor-header">
                    <span className="ai-monitor-title">Sistem Pemantauan AI</span>
                    <span className="ai-status-badge">
                      <span className="ai-status-dot"></span>
                      Aktif
                    </span>
                  </div>
                  <p className="ai-monitor-text">
                    Total pengeluaran Anda bulan ini tercatat sebesar <b>{formatRupiah(financialSummary.totalMonth)}</b>. Anggaran maksimal ditargetkan <b>{formatRupiah(financialSummary.monthlyBudget)}</b>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="page-pengaturan space-y-6">
            <div className="page-header-card">
              <div className="header-left">
                <div className="header-label">Pengaturan</div>
                <div className="header-title">Preferensi & Alokasi Anggaran</div>
              </div>
              <div className="header-right">Versi 1.1.0</div>
            </div>

            <div style={{ maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: '20px', padding: '0 0 40px 0', width: '100%' }}>

              {/* ═══════════════════════════════════════
                   CARD 1: PROFIL PENGGUNA
              ═══════════════════════════════════════ */}
              <div style={{ background: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>

                {/* Banner header teal */}
                <div style={{ background: 'linear-gradient(135deg,#1D9E75,#159060)', padding: '24px 28px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ fontSize: '28px' }}>👤</div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'white', marginBottom: '3px' }}>Profil Pengguna</div>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>Kelola nama, email, dan foto tampilan akun kamu</div>
                  </div>
                </div>

                {/* Body */}
                <div style={{ padding: '28px' }}>

                  {/* Foto + nama + email */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #F0F0F0', flexWrap: 'wrap' }}>
                    
                    {/* Avatar */}
                    <div style={{ position: 'relative', flexShrink: 0, cursor: 'pointer' }} onClick={() => document.getElementById('inputFotoProfil')?.click()}>
                      <div id="settingsAvatar" style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'linear-gradient(135deg,#1D9E75,#7F77DD)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 800, color: 'white', overflow: 'hidden', border: '3px solid #E8F5F0' }}>
                        {userProfile.fotoProfil ? (
                          <img 
                            src={userProfile.fotoProfil} 
                            alt="Profil preview" 
                            referrerPolicy="no-referrer"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                          />
                        ) : (
                          ((userProfile.nama || userProfile.name || 'U').split(' ').map((n: string) => n[0]).join('').substring(0,2).toUpperCase())
                        )}
                      </div>
                      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', opacity: 0, transition: 'opacity 0.2s' }} onMouseOver={(e) => (e.currentTarget.style.opacity = '1')} onMouseOut={(e) => (e.currentTarget.style.opacity = '0')}>📷</div>
                    </div>
                    <input 
                      type="file" 
                      id="inputFotoProfil" 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        if (file.size > 2 * 1024 * 1024) {
                          alert('Ukuran foto maksimal 2MB ya!');
                          return;
                        }

                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const base64 = event.target?.result as string;
                          const updated = { ...userProfile, fotoProfil: base64 };
                          setUserProfile(updated);
                          localStorage.setItem('tabunganaja_user', JSON.stringify(updated));
                          localStorage.setItem('tabunganaja_foto_profil', base64);
                          showToast('Foto profil berhasil diunggah!');
                        };
                        reader.readAsDataURL(file);
                      }}
                    />

                    {/* Info + tombol */}
                    <div style={{ flex: 1, minWidth: '160px' }}>
                      <div id="settingsDisplayName" style={{ fontSize: '22px', fontWeight: 800, color: '#1a1a1a', marginBottom: '4px' }}>
                        {userProfile.nama || userProfile.name || 'Nama User'}
                      </div>
                      <div id="settingsDisplayEmail" style={{ fontSize: '14px', color: '#999', marginBottom: '14px' }}>
                        {userProfile.email || 'email@gmail.com'}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button 
                          onClick={() => document.getElementById('inputFotoProfil')?.click()} 
                          style={{ padding: '9px 18px', border: '2px solid #1D9E75', borderRadius: '10px', background: 'white', color: '#1D9E75', fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                          onMouseOver={(e) => { e.currentTarget.style.background = '#1D9E75'; e.currentTarget.style.color = 'white'; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#1D9E75'; }}
                        >
                          📷 Ganti Foto
                        </button>
                        {userProfile.fotoProfil && (
                          <button 
                            id="btnHapusFoto" 
                            onClick={() => {
                              if (confirm('Hapus foto profil?')) {
                                const updated = { ...userProfile, fotoProfil: null };
                                setUserProfile(updated);
                                localStorage.setItem('tabunganaja_user', JSON.stringify(updated));
                                localStorage.removeItem('tabunganaja_foto_profil');
                                showToast('Foto profil dihapus.');
                              }
                            }} 
                            style={{ padding: '9px 14px', border: '2px solid #FADDDA', borderRadius: '10px', background: '#FFF5F5', color: '#D85A30', fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseOver={(e) => { e.currentTarget.style.background = '#D85A30'; e.currentTarget.style.color = 'white'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = '#FFF5F5'; e.currentTarget.style.color = '#D85A30'; }}
                          >
                            🗑️ Hapus
                          </button>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: '#ccc', marginTop: '8px' }}>JPG/PNG maks. 2MB · Tersimpan di perangkat kamu</div>
                    </div>
                  </div>

                  {/* Field Nama */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', color: '#bbb', marginBottom: '8px' }}>NAMA LENGKAP</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', background: '#F8F8F8', borderRadius: '12px', border: '1.5px solid #EEEEEE' }}>
                      <span style={{ fontSize: '16px' }}>🔒</span>
                      <span id="displayNama" style={{ fontSize: '15px', fontWeight: 600, color: '#444', flex: 1 }}>
                        {userProfile.nama || userProfile.name || '—'}
                      </span>
                      <span style={{ fontSize: '11px', color: '#ccc', whiteSpace: 'nowrap' }}>Terkunci</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#ccc', marginTop: '5px', paddingLeft: '4px' }}>Tidak dapat diubah setelah registrasi</div>
                  </div>

                  {/* Field Email */}
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', color: '#bbb', marginBottom: '8px' }}>EMAIL</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', background: '#F8F8F8', borderRadius: '12px', border: '1.5px solid #EEEEEE' }}>
                      <span style={{ fontSize: '16px' }}>🔒</span>
                      <span id="displayEmail" style={{ fontSize: '15px', fontWeight: 600, color: '#444', flex: 1 }}>
                        {userProfile.email || '—'}
                      </span>
                      <span style={{ fontSize: '11px', color: '#ccc', whiteSpace: 'nowrap' }}>Terkunci</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#ccc', marginTop: '5px', paddingLeft: '4px' }}>Tidak dapat diubah setelah registrasi</div>
                  </div>

                </div>
              </div>

              {/* ═══════════════════════════════════════
                   CARD 2: ANGGARAN BULANAN
              ═══════════════════════════════════════ */}
              <div style={{ background: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>

                {/* Banner header amber */}
                <div style={{ background: 'linear-gradient(135deg,#EF9F27,#C97F10)', padding: '24px 28px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ fontSize: '28px' }}>💰</div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'white', marginBottom: '3px' }}>Anggaran Bulanan</div>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)' }}>Tentukan batas maksimal pengeluaran kamu setiap bulan</div>
                  </div>
                </div>

                {/* Body */}
                <div style={{ padding: '28px' }}>

                  <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', color: '#bbb', marginBottom: '10px' }}>TARGET ANGGARAN BULANAN</div>

                  {/* Input Rp */}
                  <div style={{ display: 'flex', border: '2px solid #E8E8E8', borderRadius: '14px', overflow: 'hidden', marginBottom: '8px', transition: 'border-color 0.2s' }} id="anggaranInputWrap">
                    <div style={{ padding: '15px 18px', background: '#FFFBF0', fontSize: '15px', fontWeight: 800, color: '#C97F10', borderRight: '2px solid #E8E8E8', flexShrink: 0 }}>Rp</div>
                    <input 
                      type="number" 
                      id="inputAnggaran" 
                      placeholder="Contoh: 2000000" 
                      min="100000" 
                      max="50000000"
                      style={{ flex: 1, padding: '15px 18px', border: 'none', outline: 'none', fontSize: '20px', fontWeight: 700, color: '#1a1a1a', background: 'white' }}
                      value={settingsBudgetInput}
                      onChange={(e) => {
                        setSettingsBudgetInput(e.target.value);
                      }}
                      onFocus={() => {
                        const wrap = document.getElementById('anggaranInputWrap');
                        if (wrap) wrap.style.borderColor = '#EF9F27';
                      }}
                      onBlur={() => {
                        const wrap = document.getElementById('anggaranInputWrap');
                        if (wrap) wrap.style.borderColor = '#E8E8E8';
                      }}
                    />
                  </div>

                  <div id="anggaranPreview" style={{ fontSize: '13px', color: '#999', marginBottom: '20px', paddingLeft: '4px' }}>
                    = {formatRupiah(parseInt(settingsBudgetInput) || 0)}
                  </div>

                  <button 
                    onClick={() => {
                      const val = parseInt(settingsBudgetInput);
                      if (!val || val < 100000) { 
                        alert('Anggaran minimal Rp 100.000!'); 
                        return; 
                      }
                      localStorage.setItem('tabunganaja_monthly_budget', val.toString());
                      
                      const storedUser = localStorage.getItem('tabunganaja_user');
                      if (storedUser) {
                        const user = JSON.parse(storedUser);
                        user.budgetBulanan = val;
                        localStorage.setItem('tabunganaja_user', JSON.stringify(user));
                        setUserProfile(user);
                      }
                      
                      setMonthlyBudget(val);
                      setBudgetSaveStatus('saved');
                      showToast('Anggaran bulanan berhasil diperbarui!');
                      setTimeout(() => {
                        setBudgetSaveStatus('idle');
                      }, 2000);
                    }} 
                    id="btnSimpanAnggaran"
                    style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg,#EF9F27,#C97F10)', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: 800, cursor: 'pointer', marginBottom: '16px', transition: 'all 0.2s', letterSpacing: '0.3px' }}
                    onMouseOver={(e) => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    {budgetSaveStatus === 'saved' ? '✅ Tersimpan!' : '💾 Simpan Perubahan Anggaran'}
                  </button>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px', background: '#FFFBF0', borderRadius: '12px', borderLeft: '4px solid #EF9F27' }}>
                    <span style={{ fontSize: '18px', flexShrink: 0 }}>💡</span>
                    <span style={{ fontSize: '13px', color: '#666', lineHeight: 1.6 }}>Perubahan anggaran langsung mempengaruhi <strong>kalender heatmap</strong>, <strong>alarm boros</strong>, dan <strong>wawasan AI</strong> kamu.</span>
                  </div>

                </div>
              </div>

              {/* ═══════════════════════════════════════
                   CARD 3: DANGER ZONE
              ═══════════════════════════════════════ */}
              <div style={{ background: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1.5px solid #FADDDA' }}>

                {/* Banner header merah */}
                <div style={{ background: 'linear-gradient(135deg,#D85A30,#B33A15)', padding: '24px 28px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ fontSize: '28px' }}>⚠️</div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'white', marginBottom: '3px' }}>Danger Zone</div>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)' }}>Tindakan di bawah ini <strong style={{ color: 'white' }}>tidak dapat dibatalkan</strong></div>
                  </div>
                </div>

                {/* Body */}
                <div style={{ padding: '28px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '18px 20px', background: '#FFF5F5', border: '1.5px solid #FADDDA', borderRadius: '14px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#D85A30', marginBottom: '6px' }}>🗑️ Reset Semua Transaksi</div>
                      <div style={{ fontSize: '13px', color: '#999', lineHeight: 1.5 }}>Menghapus seluruh riwayat pengeluaran yang pernah kamu catat. Data tidak dapat dipulihkan.</div>
                    </div>
                    <button 
                      onClick={() => {
                        // Konfirmasi pertama
                        const step1 = confirm(
                          '⚠️ PERHATIAN!\n\n' +
                          'Kamu akan menghapus SEMUA riwayat transaksi.\n' +
                          'Tindakan ini TIDAK DAPAT dibatalkan!\n\n' +
                          'Lanjutkan?'
                        );
                        if (!step1) return;

                        // Konfirmasi kedua
                        const step2 = confirm(
                          '🔴 KONFIRMASI TERAKHIR\n\n' +
                          'Semua data transaksi akan dihapus permanen.\n' +
                          'Apakah kamu benar-benar yakin?'
                        );
                        if (!step2) return;

                        // Hapus semua kemungkinan key transaksi
                        Object.keys(localStorage).forEach((key) => {
                          if (key.toLowerCase().includes('transaction') || key.toLowerCase().includes('transaksi')) {
                            localStorage.removeItem(key);
                          }
                        });

                        localStorage.setItem('sakupintar_transactions', '[]');
                        localStorage.setItem('tabunganaja_transactions', '[]');

                        // Feedback
                        alert('✅ Semua transaksi berhasil dihapus!');

                        // Refresh halaman demi reset sempurna
                        window.location.reload();
                      }}
                      style={{ padding: '12px 22px', background: 'white', border: '2px solid #D85A30', borderRadius: '10px', color: '#D85A30', fontSize: '14px', fontWeight: 700, cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                      onMouseOver={(e) => { e.currentTarget.style.background = '#D85A30'; e.currentTarget.style.color = 'white'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#D85A30'; }}
                    >
                      🗑️ Reset Data
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
        </div>
      </main>
    </div>
    </>
  );
}
