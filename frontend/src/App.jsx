import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, Users, PlusCircle, CheckCircle2, Clock, 
  Phone, AlertCircle, RefreshCw, X, CalendarDays, ClipboardList, Wallet, Send,
  User, FileText, CalendarPlus, UserCircle, Stethoscope, Building2, AtSign, TrendingUp,
  ChevronLeft, ChevronRight, ChevronDown, Sun, Moon, Monitor, Check, Pencil, Ban
} from 'lucide-react';
import { dentalApi } from './api';
import translations, { languageNames, supportedLanguages } from './translations';

const clinicServices = ['Tish tozalash', 'Plomba', 'Implant', 'Tish olish', 'Ko‘rik'];
const getLocalDateTimeValue = (value = new Date()) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};
const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const formatDate = (dateString) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}.${month}.${year}`;
};
const getInitialLanguage = () => {
  try {
    const savedLanguage = window.localStorage.getItem('app_lang');
    if (supportedLanguages.includes(savedLanguage)) return savedLanguage;
  } catch (error) {
    console.warn('Could not read the saved language preference:', error);
  }

  const telegramLanguage = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code
    ?.slice(0, 2)
    .toLowerCase();
  return supportedLanguages.includes(telegramLanguage) ? telegramLanguage : 'uz';
};
const formatBalance = (value, language, currency) => {
  const balance = Number(value || 0);
  const formatted = Math.abs(balance).toLocaleString(language === 'uz' ? 'uz-UZ' : language);
  return `${balance > 0 ? '+' : balance < 0 ? '-' : ''}${formatted} ${currency}`;
};
const formatDateTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day}.${month}.${year} ${hours}:${minutes}`;
};

function LanguageDropdown({ language, onChange, t }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const languageCodes = { uz: 'UZ', ru: 'RU', en: 'EN' };

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) setIsOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={t('chooseLanguage')}
        className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-100/90 px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs backdrop-blur-md transition-colors hover:bg-slate-200/90 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:bg-slate-700/90"
      >
        <span aria-hidden="true">🌐</span>
        {languageCodes[language]}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div
          role="menu"
          aria-label={t('chooseLanguage')}
          className="absolute right-0 z-50 mt-1 w-36 rounded-2xl border border-white/60 bg-white/85 py-1 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/85"
        >
          {supportedLanguages.map((lang) => (
            <button
              key={lang}
              type="button"
              role="menuitemradio"
              aria-checked={language === lang}
              onClick={() => {
                onChange(lang);
                setIsOpen(false);
              }}
              className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition hover:bg-slate-50 dark:hover:bg-slate-700 ${
                language === lang ? 'font-semibold text-sky-700' : 'text-slate-700'
              }`}
            >
              {languageNames[lang]}
              {language === lang && <CheckCircle2 className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ThemeDropdown({ theme, onChange, t }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const options = [
    { value: 'light', label: 'themeLight', Icon: Sun },
    { value: 'dark', label: 'themeDark', Icon: Moon },
    { value: 'system', label: 'themeSystem', Icon: Monitor },
  ];
  const activeOption = options.find((option) => option.value === theme) || options[2];
  const ActiveIcon = activeOption.Icon;

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) setIsOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={t('theme')}
        title={t(activeOption.label)}
        className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-100/90 p-2 text-slate-700 shadow-xs backdrop-blur-md transition-colors hover:bg-slate-200/90 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:bg-slate-700/90"
      >
        <ActiveIcon className="h-4 w-4" />
      </button>
      {isOpen && (
        <div
          role="menu"
          aria-label={t('theme')}
          className="absolute right-0 z-50 mt-1.5 w-36 rounded-xl border border-slate-100 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
        >
          {options.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={theme === value}
              onClick={() => {
                onChange(value);
                setIsOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 ${
                theme === value ? 'font-semibold text-sky-700 dark:text-sky-300' : 'text-slate-700 dark:text-slate-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="flex-1">{t(label)}</span>
              {theme === value && <Check className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('today'); // 'today' | 'patients' | 'add'
  const [language, setLanguage] = useState(getInitialLanguage);
  const [theme, setTheme] = useState(() => {
    try {
      const savedTheme = window.localStorage.getItem('app_theme');
      return ['light', 'dark', 'system'].includes(savedTheme) ? savedTheme : 'system';
    } catch (error) {
      console.warn('Could not read the saved theme preference:', error);
      return 'system';
    }
  });
  const t = (key, values = {}) => {
    const text = translations[language][key] || translations.uz[key] || key;
    return Object.entries(values).reduce(
      (result, [name, value]) => result.replaceAll(`{${name}}`, value),
      text
    );
  };
  const formatMoney = (value) =>
    `${Number(value || 0).toLocaleString(language === 'uz' ? 'uz-UZ' : language)} ${t('currency')}`;
  const locale = language === 'uz' ? 'uz-UZ' : language === 'ru' ? 'ru-RU' : 'en-US';

  useEffect(() => {
    document.documentElement.lang = language;
    try {
      window.localStorage.setItem('app_lang', language);
    } catch (error) {
      console.warn('Could not save the language preference:', error);
    }
  }, [language]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      document.documentElement.classList.toggle(
        'dark',
        theme === 'dark' || (theme === 'system' && mediaQuery.matches)
      );
    };

    applyTheme();
    if (theme === 'system') mediaQuery.addEventListener('change', applyTheme);
    try {
      window.localStorage.setItem('app_theme', theme);
    } catch (error) {
      console.warn('Could not save the theme preference:', error);
    }

    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, [theme]);
  const [todayData, setTodayData] = useState({ results: [], count: 0 });
  const [stats, setStats] = useState(null);
  const [selectedDate, setSelectedDate] = useState(getLocalDateString);
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);
  const [createPatientError, setCreatePatientError] = useState('');
  const [newPatient, setNewPatient] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    telegram_username: '',
    birth_date: '',
    medical_notes: ''
  });
  const patientRequestId = useRef(0);
  const dashboardRequestId = useRef(0);
  const datePickerRef = useRef(null);
  const lastObservedDate = useRef(getLocalDateString());
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientDetails, setPatientDetails] = useState(null);
  const [patientDetailsLoading, setPatientDetailsLoading] = useState(false);
  const [patientDetailsError, setPatientDetailsError] = useState('');
  const [patientServiceTab, setPatientServiceTab] = useState('planned');
  const [serviceActionId, setServiceActionId] = useState(null);
  const [serviceError, setServiceError] = useState('');
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [isCreatingAppointment, setIsCreatingAppointment] = useState(false);
  const [appointmentEdit, setAppointmentEdit] = useState(null);
  const [appointmentEditError, setAppointmentEditError] = useState('');
  const [isSavingAppointment, setIsSavingAppointment] = useState(false);
  const [appointmentActionId, setAppointmentActionId] = useState(null);
  const [reminderActionId, setReminderActionId] = useState(null);

  // Yangi qabul formasi holati
  const [newAppt, setNewAppt] = useState({
    patient_id: '',
    appointment_time: getLocalDateTimeValue(),
    complaint_or_note: '',
    procedure_name: '',
    price: '',
    customService: false
  });

  // Telegram WebApp kengaytirish
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    let midnightTimeout;

    const handleDateRollover = () => {
      const currentDate = getLocalDateString();
      const previousDate = lastObservedDate.current;
      if (currentDate !== previousDate) {
        lastObservedDate.current = currentDate;
        setSelectedDate((date) => date === previousDate ? currentDate : date);
        return true;
      }
      return false;
    };

    const scheduleMidnightRefresh = () => {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 0, 0);
      midnightTimeout = window.setTimeout(() => {
        handleDateRollover();
        scheduleMidnightRefresh();
      }, nextMidnight.getTime() - now.getTime() + 50);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (!handleDateRollover()) {
          fetchDashboardData(selectedDate);
        }
      }
    };

    scheduleMidnightRefresh();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearTimeout(midnightTimeout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [selectedDate]);

  const fetchDashboardData = async (date = selectedDate) => {
    const requestId = ++dashboardRequestId.current;
    setLoading(true);
    try {
      const [appointmentsRes, statsRes] = await Promise.all([
        dentalApi.getAppointmentsForDate(date),
        dentalApi.getStats(date)
      ]);
      if (requestId === dashboardRequestId.current) {
        const appointments = appointmentsRes.data.results || appointmentsRes.data;
        setTodayData({
          date,
          count: appointmentsRes.data.count ?? appointments.length,
          results: appointments
        });
        setStats(statsRes.data);
      }
      return true;
    } catch (err) {
      console.error("Ma'lumot yuklashda xatolik:", err);
      return false;
    } finally {
      if (requestId === dashboardRequestId.current) {
        setLoading(false);
      }
    }
  };

  const fetchPatients = async (query = '') => {
    const requestId = ++patientRequestId.current;
    try {
      const res = await dentalApi.getPatients(query);
      if (requestId === patientRequestId.current) {
        setPatients(res.data.results || res.data);
      }
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const results = await Promise.all([
        fetchPatients(searchQuery),
        fetchDashboardData(selectedDate),
        selectedPatient ? refreshPatientDetails(selectedPatient.id) : Promise.resolve(true),
      ]);
      if (results.some((result) => result === false)) {
        console.error('Refresh did not complete successfully for all data sources.');
      }
    } catch (error) {
      console.error("Yangilashda xatolik:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'patients' || activeTab === 'add') {
      fetchPatients(searchQuery);
    }
  }, [activeTab, searchQuery]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await dentalApi.updateAppointmentStatus(id, newStatus);
      fetchDashboardData();
    } catch (err) {
      alert(t('statusUpdateFailed'));
    }
  };

  const openAppointmentEdit = (appointment) => {
    const treatment = appointment.treatments?.find((item) => !item.is_paid)
      || appointment.treatments?.[0]
      || null;
    setAppointmentEditError('');
    setAppointmentEdit({
      appointment,
      appointment_time: getLocalDateTimeValue(appointment.appointment_time),
      complaint_or_note: appointment.complaint_or_note || '',
      treatment_id: treatment?.id || '',
      procedure_name: treatment?.procedure_name || '',
      price: treatment?.price ?? '',
      customService: Boolean(treatment && !clinicServices.includes(treatment.procedure_name)),
      hasTreatment: Boolean(treatment)
    });
  };

  const handleSaveAppointmentEdit = async (event) => {
    event.preventDefault();
    if (!appointmentEdit || isSavingAppointment) return;

    setAppointmentEditError('');
    setIsSavingAppointment(true);
    try {
      const payload = {
        appointment_time: appointmentEdit.appointment_time,
        complaint_or_note: appointmentEdit.complaint_or_note,
      };
      if (appointmentEdit.procedure_name.trim() && appointmentEdit.price !== '') {
        payload.treatment_id = appointmentEdit.treatment_id || undefined;
        payload.procedure_name = appointmentEdit.procedure_name.trim();
        payload.price = appointmentEdit.price;
      }

      await dentalApi.updateAppointment(appointmentEdit.appointment.id, payload);
    } catch (error) {
      console.error("Qabulni tahrirlashda xatolik:", error);
      const responseData = error.response?.data;
      setAppointmentEditError(
        responseData
          ? Object.values(responseData).flat().join(' ')
          : t('appointmentUpdateFailed')
      );
      setIsSavingAppointment(false);
      return;
    }

    setAppointmentEdit(null);
    try {
      const refreshResults = await Promise.all([
        fetchDashboardData(selectedDate),
        patientDetails?.id === appointmentEdit.appointment.patient.id
          ? refreshPatientDetails(patientDetails.id)
          : Promise.resolve(true)
      ]);
      if (refreshResults.some((result) => result === false)) {
        window.alert(t('appointmentSavedRefreshFailed'));
      }
    } catch (error) {
      console.error("Qabul saqlandi, ammo ma'lumotlarni yangilashda xatolik:", error);
      window.alert(t('appointmentSavedRefreshFailed'));
    } finally {
      setIsSavingAppointment(false);
    }
  };

  const handleCancelAppointment = async (appointment) => {
    if (appointment.status === 'CANCELLED' || appointmentActionId !== null) return;
    if (!window.confirm(t('confirmCancelAppointment'))) return;

    setAppointmentActionId(appointment.id);
    try {
      await dentalApi.cancelAppointment(appointment.id);
    } catch (error) {
      console.error("Qabulni bekor qilishda xatolik:", error);
      window.alert(t('appointmentCancelFailed'));
      setAppointmentActionId(null);
      return;
    }

    try {
      const refreshResults = await Promise.all([
        fetchDashboardData(selectedDate),
        patientDetails?.id === appointment.patient.id
          ? refreshPatientDetails(patientDetails.id)
          : Promise.resolve(true)
      ]);
      if (refreshResults.some((result) => result === false)) {
        window.alert(t('appointmentSavedRefreshFailed'));
      }
    } catch (error) {
      console.error("Qabul bekor qilindi, ammo ma'lumotlarni yangilashda xatolik:", error);
      window.alert(t('appointmentSavedRefreshFailed'));
    } finally {
      setAppointmentActionId(null);
    }
  };

  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    if (!newAppt.patient_id || !newAppt.appointment_time || !newAppt.procedure_name.trim() || !newAppt.price) {
      alert(t('appointmentFieldsRequired'));
      return;
    }
    setIsCreatingAppointment(true);
    try {
      await dentalApi.planPatientService({
        patient_id: newAppt.patient_id,
        appointment_time: newAppt.appointment_time,
        complaint_or_note: newAppt.complaint_or_note,
        procedure_name: newAppt.procedure_name.trim(),
        price: newAppt.price
      });
      await fetchPatients(searchQuery);
      alert(t('appointmentCreated'));
      setNewAppt({
        patient_id: '',
        appointment_time: getLocalDateTimeValue(),
        complaint_or_note: '',
        procedure_name: '',
        price: '',
        customService: false
      });
      setActiveTab('today');
      await fetchDashboardData();
    } catch (err) {
      console.error("Qabul va xizmatni saqlashda xatolik:", err);
      alert(t('appointmentSaveFailed'));
    } finally {
      setIsCreatingAppointment(false);
    }
  };

  const handleCreatePatient = async (e) => {
    e.preventDefault();
    setCreatePatientError('');
    setIsCreatingPatient(true);

    try {
      await dentalApi.createPatient({
        ...newPatient,
        telegram_username: newPatient.telegram_username.trim().replace(/^@/, '') || null,
        birth_date: newPatient.birth_date || null,
        medical_notes: newPatient.medical_notes.trim()
      });

      setIsPatientModalOpen(false);
      setNewPatient({
        first_name: '',
        last_name: '',
        phone: '',
        telegram_username: '',
        birth_date: '',
        medical_notes: ''
      });
      setSearchQuery('');

      const refreshed = await fetchPatients('');
      if (!refreshed) {
        alert(t('patientRefreshFailed'));
      }
    } catch (err) {
      console.error("Bemorni saqlashda xatolik:", err);
      const responseData = err.response?.data;
      const message = typeof responseData === 'string'
        ? responseData
        : responseData
          ? Object.values(responseData).flat().join(' ')
          : t('patientSaveFailed');
      setCreatePatientError(message);
    } finally {
      setIsCreatingPatient(false);
    }
  };

  const closePatientModal = () => {
    if (isCreatingPatient) return;
    setIsPatientModalOpen(false);
    setCreatePatientError('');
  };

  const openPatientDetails = async (patient) => {
    setSelectedPatient(patient);
    setPatientDetails(null);
    setPatientDetailsError('');
    setPatientDetailsLoading(true);
    setPatientServiceTab('planned');
    setServiceError('');

    try {
      const response = await dentalApi.getPatient(patient.id);
      setPatientDetails(response.data);
    } catch (err) {
      console.error("Bemor ma'lumotlarini yuklashda xatolik:", err);
      setPatientDetailsError(t('patientLoadFailed'));
    } finally {
      setPatientDetailsLoading(false);
    }
  };

  const refreshPatientDetails = async (patientId) => {
    const [patientResponse, patientsRefreshed] = await Promise.all([
      dentalApi.getPatient(patientId),
      fetchPatients(searchQuery)
    ]);
    setPatientDetails(patientResponse.data);
    return patientsRefreshed;
  };

  const handleSendAppointmentReminder = async (appointment) => {
    if (reminderActionId !== null) return;
    if (!appointment.patient?.telegram_linked) {
      window.alert(t('telegramLinkRequired'));
      return;
    }

    setReminderActionId(appointment.id);
    let response;
    try {
      response = await dentalApi.sendAppointmentReminder(
        appointment.id,
        window.Telegram?.WebApp?.initData || ''
      );
    } catch (error) {
      console.error('Telegram eslatmasini yuborishda xatolik:', error);
      window.alert(error.response?.data?.error || t('reminderSendFailed'));
      setReminderActionId(null);
      return;
    }

    setTodayData((current) => ({
      ...current,
      results: current.results.map((item) =>
        item.id === appointment.id ? { ...item, reminder_sent_at: response.data.reminder_sent_at } : item
      )
    }));
    setPatientDetails((current) => current ? ({
      ...current,
      appointments: current.appointments.map((item) =>
        item.id === appointment.id ? { ...item, reminder_sent_at: response.data.reminder_sent_at } : item
      )
    }) : current);

    try {
      const refreshResults = await Promise.all([
        fetchDashboardData(selectedDate),
        patientDetails?.id === appointment.patient.id
          ? refreshPatientDetails(patientDetails.id)
          : Promise.resolve(true)
      ]);
      if (refreshResults.some((result) => result === false)) {
        window.alert(t('reminderSentRefreshFailed'));
      }
    } catch (error) {
      console.error("Eslatma yuborildi, ammo ma'lumotlarni yangilashda xatolik:", error);
      window.alert(t('reminderSentRefreshFailed'));
    } finally {
      setReminderActionId(null);
    }
  };

  const handleCompleteTreatment = async (treatmentId) => {
    if (!selectedPatient) return;
    setServiceError('');
    setServiceActionId(treatmentId);
    try {
      await dentalApi.updateTreatmentStatus(treatmentId, 'COMPLETED');
      await refreshPatientDetails(selectedPatient.id);
    } catch (err) {
      console.error("Xizmat holatini yangilashda xatolik:", err);
      setServiceError(t('serviceCompleteFailed'));
    } finally {
      setServiceActionId(null);
    }
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    if (!patientDetails || !paymentTarget) return;

    setPaymentError('');
    setIsSavingPayment(true);
    try {
      if (paymentTarget.type === 'deposit') {
        await dentalApi.topUpBalance({
          patient: patientDetails.id,
          amount_paid: paymentAmount,
          note: t('topUpBalance')
        });
      } else if (paymentTarget.type === 'treatment') {
        await dentalApi.payTreatment(paymentTarget.treatment.id);
      } else {
        return;
      }

    } catch (err) {
      console.error("To'lovni saqlashda xatolik:", err);
      const responseData = err.response?.data;
      setPaymentError(
        responseData
          ? Object.values(responseData).flat().join(' ')
          : t('paymentSaveFailed')
      );
      setIsSavingPayment(false);
      return;
    }

    setPaymentTarget(null);
    setPaymentAmount('');
    try {
      const [patientRefreshed, dashboardRefreshed] = await Promise.all([
        refreshPatientDetails(patientDetails.id),
        fetchDashboardData()
      ]);
      if (!patientRefreshed || !dashboardRefreshed) {
        window.alert(t('paymentSavedRefreshFailed'));
      }
    } catch (err) {
      console.error("To'lov saqlandi, ammo ma'lumotlarni yangilashda xatolik:", err);
      window.alert(t('paymentSavedRefreshFailed'));
    } finally {
      setIsSavingPayment(false);
    }
  };

  const openAppointmentPayment = async (appointment) => {
    setPatientDetails(null);
    setPatientDetailsError('');
    setPatientDetailsLoading(true);
    setPatientServiceTab('planned');
    setServiceError('');
    setPaymentError('');
    setPaymentAmount('');
    setPaymentTarget({ type: 'appointment', appointment });

    try {
      const response = await dentalApi.getPatient(appointment.patient.id);
      setPatientDetails(response.data);
    } catch (err) {
      console.error("To'lov uchun bemor ma'lumotlarini yuklashda xatolik:", err);
      setPaymentTarget(null);
      setPatientDetailsError(t('patientLoadFailed'));
    } finally {
      setPatientDetailsLoading(false);
    }
  };

  const closePaymentModal = () => {
    if (isSavingPayment) return;
    setPaymentTarget(null);
    setPaymentAmount('');
    setPaymentError('');
  };

  const closePatientDetails = () => {
    if (serviceActionId !== null || isSavingPayment) return;
    setSelectedPatient(null);
    setPatientDetails(null);
    setServiceError('');
    setPaymentTarget(null);
  };

  const patientTreatments = patientDetails?.appointments?.flatMap((appointment) =>
    (appointment.treatments || []).map((treatment) => ({
      ...treatment,
      appointment_time: appointment.appointment_time
    }))
  ) || [];
  const visibleTreatments = patientTreatments.filter((treatment) =>
    patientServiceTab === 'planned'
      ? treatment.status === 'PLANNED'
      : treatment.status === 'COMPLETED'
  );

  return (
    <div className="app-shell flex h-dvh flex-col overflow-hidden bg-[#F2F4F7] font-sans text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      <header className="app-header fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-white/85 shadow-sm backdrop-blur-xl transition-colors duration-200 dark:border-white/10 dark:bg-slate-900/85">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))]">
          <div>
            <h1 className="text-lg font-bold text-sky-600 dark:text-sky-400">Dental CRM</h1>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('doctorDashboard')}</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeDropdown theme={theme} onChange={setTheme} t={t} />
            <LanguageDropdown language={language} onChange={setLanguage} t={t} />
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              aria-label={t('refreshData')}
              className="rounded-2xl border border-slate-200 bg-slate-100/90 p-2 text-slate-700 shadow-xs backdrop-blur-md transition-colors hover:bg-slate-200/90 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:bg-slate-700/90"
            >
              <RefreshCw className={`h-5 w-5 ${isRefreshing || loading ? 'animate-spin text-sky-600' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Asosiy kontent */}
      <main className={`mx-auto min-h-0 w-full max-w-md flex-1 overflow-y-auto overscroll-y-contain px-4 pt-[calc(5rem+env(safe-area-inset-top))] pb-[calc(4rem+max(0.75rem,env(safe-area-inset-bottom))+0.75rem)] text-slate-900 dark:text-slate-100 ${
        activeTab === 'add'
          ? 'flex flex-col items-center justify-center'
          : 'flex flex-col space-y-3'
      }`}>
        {activeTab === 'patients' && (
          <div className="flex items-center gap-3">
            <div className="relative min-w-0 flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchPatients')}
                className="patients-search w-full rounded-2xl border border-white/60 bg-white/50 px-3.5 py-2.5 text-sm text-slate-800 shadow-xs backdrop-blur-md placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500 dark:border-white/10 dark:bg-slate-800/50 dark:text-slate-100 dark:placeholder:text-slate-400"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setCreatePatientError('');
                setIsPatientModalOpen(true);
              }}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-sky-700 active:scale-95"
            >
              <PlusCircle className="h-4 w-4" />
              <span>{t('addPatient')}</span>
            </button>
          </div>
        )}
        {activeTab === 'today' && (
          <div className="space-y-3">
            <div className="glass-card flex items-center justify-between gap-2 rounded-2xl p-2">
              <button
                type="button"
                onClick={() => {
                  const date = new Date(`${selectedDate}T00:00:00`);
                  date.setDate(date.getDate() - 1);
                  setSelectedDate(getLocalDateString(date));
                }}
                aria-label={t('previousDay')}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-50 active:scale-95"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <div className="relative flex min-h-11 flex-1 flex-col items-center justify-center rounded-xl px-2 text-center">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-sky-600" />
                  <span className="text-sm font-bold text-slate-800">{formatDate(selectedDate)}</span>
                  {selectedDate === getLocalDateString() && (
                    <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                      {t('todayBadge')}
                    </span>
                  )}
                </div>
                <input
                  ref={datePickerRef}
                  type="date"
                  value={selectedDate}
                  onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                  aria-label={t('selectDate')}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  const date = new Date(`${selectedDate}T00:00:00`);
                  date.setDate(date.getDate() + 1);
                  setSelectedDate(getLocalDateString(date));
                }}
                aria-label={t('nextDay')}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-50 active:scale-95"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            {selectedDate !== getLocalDateString() && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setSelectedDate(getLocalDateString())}
                  className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                >
                  {t('backToToday')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* STATISTIKA BLOKI */}
        {activeTab === 'today' && stats && (
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card rounded-2xl p-3">
              <span className="text-xs text-slate-400">
                {selectedDate === getLocalDateString() ? t('todayAppointments') : t('appointmentCount')}
              </span>
              <p className="text-xl font-bold text-slate-700">{stats.today?.total_appointments || 0}</p>
            </div>
            <div className="glass-card rounded-2xl p-3">
              <span className="text-xs text-slate-400">
                {selectedDate === getLocalDateString() ? t('todayRevenue') : t('dailyRevenue')}
              </span>
              <p className="text-xl font-bold text-emerald-600">
                {formatMoney(stats.today?.income)}
              </p>
            </div>
          </div>
        )}

        {/* EKRAN 1: BUGUNGI QABULLAR */}
        {activeTab === 'today' && (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              {selectedDate === getLocalDateString()
                ? t('todayAppointments')
                : t('appointmentsForDate', { date: formatDate(selectedDate) })}
            </h2>
            {todayData.results?.length === 0 ? (
              <div className="glass-card rounded-2xl border-dashed p-6 text-center text-slate-500">
                {selectedDate === getLocalDateString()
                  ? t('noAppointmentsToday')
                  : t('noAppointmentsDate')}
              </div>
            ) : (
              todayData.results?.map((item) => (
                <div key={item.id} className={`glass-card space-y-2 rounded-2xl p-4 transition-all duration-200 active:scale-[0.99] ${
                  item.status === 'CANCELLED' ? 'opacity-60' : ''
                }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-base text-slate-800">{item.patient?.full_name}</h3>
                      <div className="flex items-center text-xs text-slate-500 mt-0.5">
                        <Phone className="w-3.5 h-3.5 mr-1" />
                        {item.patient?.phone}
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-2 py-1 rounded bg-sky-50 text-sky-600">
                      {new Date(item.appointment_time).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {item.treatments?.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {item.treatments.map((treatment) => (
                        <span
                          key={treatment.id}
                          className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-sky-100 bg-sky-50/80 px-2.5 py-1 text-xs font-medium text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-300"
                        >
                          <span aria-hidden="true">🦷</span>
                          <span>{treatment.procedure_name}</span>
                          <span aria-hidden="true">•</span>
                          <span>{formatMoney(treatment.price)}</span>
                        </span>
                      ))}
                    </div>
                  ) : item.complaint_or_note ? (
                    <p className="rounded bg-slate-50 p-2 text-xs text-slate-600">
                      {item.complaint_or_note}
                    </p>
                  ) : null}

                  <div className="flex items-center justify-between gap-2 border-t pt-2">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      item.status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-700'
                        : item.status === 'CANCELLED'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-amber-100 text-amber-700'
                    }`}>
                      {t(item.status === 'COMPLETED' ? 'completed' : item.status === 'CANCELLED' ? 'cancelled' : 'pending')}
                    </span>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {item.reminder_sent_at && (
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                          {t('reminded')}
                        </span>
                      )}
                      {!item.reminder_sent_at && item.status !== 'CANCELLED' && (
                        <button
                          type="button"
                          onClick={() => handleSendAppointmentReminder(item)}
                          disabled={reminderActionId !== null}
                          title={!item.patient?.telegram_linked ? t('telegramLinkRequired') : undefined}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-medium text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:bg-sky-500/20"
                        >
                          {reminderActionId === item.id
                            ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            : <Send className="h-3.5 w-3.5" />}
                          {t(item.patient?.telegram_linked ? 'sendReminder' : 'telegramNotLinked')}
                        </button>
                      )}
                      {item.status !== 'COMPLETED' && item.status !== 'CANCELLED' && (
                        <button 
                          type="button"
                          onClick={() => handleStatusChange(item.id, 'COMPLETED')}
                          className="flex items-center text-xs bg-emerald-600 text-white px-2.5 py-1.5 rounded-lg active:scale-95"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          {t('finish')}
                        </button>
                      )}
                      {item.status !== 'CANCELLED' && (
                        <>
                          <button
                            type="button"
                            onClick={() => openAppointmentEdit(item)}
                            disabled={appointmentActionId !== null}
                            className="inline-flex items-center gap-1 rounded-xl border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-medium text-sky-700 transition hover:bg-sky-100 disabled:opacity-60 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:bg-sky-500/20"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            {t('edit')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancelAppointment(item)}
                            disabled={appointmentActionId !== null}
                            className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-60 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
                          >
                            {appointmentActionId === item.id
                              ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              : <Ban className="h-3.5 w-3.5" />}
                            {t('cancelAppointment')}
                          </button>
                          <button
                            type="button"
                            onClick={() => openAppointmentPayment(item)}
                            disabled={isSavingPayment}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200/60 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-all hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                          >
                            <Wallet className="h-3.5 w-3.5" />
                            {t('makePayment')}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* EKRAN 2: BEMORLAR RO'YXATI */}
        {activeTab === 'patients' && (
          <div className="patients-list space-y-2.5 pt-0">
              {patients.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => openPatientDetails(p)}
                  className="glass-card flex w-full items-center justify-between rounded-2xl p-3 text-left transition-all duration-200 hover:border-sky-200 hover:shadow-md active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                >
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{p.full_name}</p>
                    <p className="text-xs text-slate-400">{p.phone}</p>
                  </div>
                  <div className="text-right">
                    <span className="mb-1 block text-xs text-slate-400">{t('balance')}</span>
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      Number(p.balance_due || 0) < 0
                        ? 'bg-rose-50 text-rose-600'
                        : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      {formatBalance(p.balance_due, language, t('currency'))}
                    </span>
                    {Number(p.unpaid_services_count || 0) > 0 && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                        <AlertCircle className="h-3 w-3" />
                        {language === 'en' && Number(p.unpaid_services_count) === 1
                          ? t('unpaidService')
                          : t('unpaidServices', { count: p.unpaid_services_count })}
                      </span>
                    )}
                  </div>
                </button>
              ))}
          </div>
        )}

        {/* EKRAN 3: YANGI QABUL QO'SHISH */}
        {activeTab === 'add' && (
          <form onSubmit={handleCreateAppointment} className="glass-card appointment-form w-full max-w-md space-y-3 rounded-3xl p-4.5 shadow-xl">
            <header>
              <h2 className="text-lg font-bold text-slate-800">{t('newAppointmentTitle')}</h2>
              <p className="text-[11px] text-slate-400">{t('appointmentSubtitle')}</p>
            </header>
            
            <div>
              <label htmlFor="appointment-patient" className="mb-1 block text-[11px] font-semibold text-slate-600">
                {t('selectPatient')}
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select 
                  id="appointment-patient"
                  value={newAppt.patient_id}
                  onChange={(e) => setNewAppt({ ...newAppt, patient_id: e.target.value })}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100"
                  required
                >
                  <option value="">{t('selectPatientOption')}</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name} ({p.phone})</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="appointment-time" className="mb-1 block text-[11px] font-semibold text-slate-600">
                {t('appointmentTime')}
              </label>
              <div className="relative">
                <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input 
                  id="appointment-time"
                  type="datetime-local" 
                  value={newAppt.appointment_time}
                  onChange={(e) => setNewAppt({ ...newAppt, appointment_time: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 items-end gap-2 rounded-2xl border border-slate-200/70 bg-white/20 p-2.5 dark:border-slate-700/60 dark:bg-slate-800/40">
              <div className={newAppt.customService ? 'col-span-2' : ''}>
                <label htmlFor="appointment-service" className="mb-1 block text-[11px] font-semibold text-slate-600">
                  {t('service')}
                </label>
                <div className="relative">
                  <ClipboardList className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    id="appointment-service"
                    value={newAppt.customService ? '__custom__' : newAppt.procedure_name}
                    onChange={(e) => {
                      const customService = e.target.value === '__custom__';
                      setNewAppt({
                        ...newAppt,
                        customService,
                        procedure_name: customService ? '' : e.target.value
                      });
                    }}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-2 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100"
                    required
                  >
                    <option value="">{t('selectService')}</option>
                    {clinicServices.map((service, index) => (
                      <option key={service} value={service}>
                        {t(['serviceCleaning', 'serviceFilling', 'serviceImplant', 'serviceExtraction', 'serviceCheckup'][index])}
                      </option>
                    ))}
                    <option value="__custom__">{t('customService')}</option>
                  </select>
                </div>
              </div>

              <div className={newAppt.customService ? '' : 'hidden'}>
                  <label htmlFor="appointment-service-name" className="mb-1 block text-[11px] font-semibold text-slate-600">
                    {t('serviceName')}
                  </label>
                  <input
                    id="appointment-service-name"
                    type="text"
                    value={newAppt.procedure_name}
                    onChange={(e) => setNewAppt({ ...newAppt, procedure_name: e.target.value })}
                    placeholder={t('exampleTreatment')}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder:text-slate-400"
                    required={newAppt.customService}
                    disabled={!newAppt.customService}
                  />
              </div>

              <div>
                <label htmlFor="appointment-service-price" className="mb-1 block text-[11px] font-semibold text-slate-600">
                  {t('servicePrice')}
                </label>
                <input
                  id="appointment-service-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newAppt.price}
                  onChange={(e) => setNewAppt({ ...newAppt, price: e.target.value })}
                  placeholder={t('examplePrice')}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder:text-slate-400"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="appointment-note" className="mb-1 block text-[11px] font-semibold text-slate-600">
                {t('noteComplaint')}
              </label>
              <div className="relative">
                <FileText className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <textarea 
                  id="appointment-note"
                  rows="2"
                  placeholder={t('exampleNote')}
                  value={newAppt.complaint_or_note}
                  onChange={(e) => setNewAppt({ ...newAppt, complaint_or_note: e.target.value })}
                  className="h-16 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder:text-slate-400"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isCreatingAppointment}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-sky-700 active:scale-[0.99]"
            >
              {isCreatingAppointment
                ? <RefreshCw className="h-4 w-4 animate-spin" />
                : <CalendarPlus className="h-4 w-4" />}
              {isCreatingAppointment ? t('saving') : t('saveAppointment')}
            </button>
          </form>
        )}

        {activeTab === 'profile' && (
          <section className="flex flex-col transition-transform duration-300 ease-out">
            <header className="mt-2 mb-4 px-1">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('profile')}</h2>
              <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">{t('profileSubtitle')}</p>
            </header>

            <div className="glass-card mb-3 overflow-hidden rounded-3xl">
              <div className="bg-linear-to-br from-sky-600 to-blue-700 p-5 text-white">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
                    <UserCircle className="h-8 w-8" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-sky-100">{t('doctor')}</p>
                    <h3 className="truncate text-lg font-bold">
                      {[
                        window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name,
                        window.Telegram?.WebApp?.initDataUnsafe?.user?.last_name
                      ].filter(Boolean).join(' ') || t('doctor')}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-slate-100 px-4">
                <div className="flex items-center gap-3 py-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                    <Stethoscope className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs text-slate-400">{t('specialist')}</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-700">{t('dentist')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 py-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs text-slate-400">{t('clinic')}</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-700">Dental CRM</p>
                  </div>
                </div>
                {window.Telegram?.WebApp?.initDataUnsafe?.user?.username && (
                  <div className="flex items-center gap-3 py-4">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <AtSign className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400">{t('telegramAccount')}</p>
                      <p className="mt-0.5 truncate text-sm font-semibold text-slate-700">
                        @{window.Telegram.WebApp.initDataUnsafe.user.username}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="glass-card mb-3 flex items-center justify-between gap-4 rounded-2xl p-4">
              <div>
                <p className="text-sm font-medium text-slate-500">{t('monthlyRevenue')}</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-600">
                  {formatMoney(stats?.monthly_revenue)}
                </p>
                <p className="mt-1 text-xs text-slate-400">{t('currentCalendarMonth')}</p>
              </div>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <TrendingUp className="h-6 w-6" />
              </span>
            </div>

            <div className="glass-card rounded-2xl p-4">
              <h3 className="font-semibold text-slate-800">{t('aboutApp')}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {t('aboutAppText')}
              </p>
            </div>

          </section>
        )}
      </main>

      {selectedPatient && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/30 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={closePatientDetails}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="patient-details-title"
            className="glass-modal max-h-[94dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl p-4 shadow-2xl sm:max-h-[90vh] sm:rounded-3xl sm:p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="mb-4 flex items-start justify-between">
              <div>
                <h2 id="patient-details-title" className="text-lg font-bold text-slate-800">
                  {t('patientCard')}
                </h2>
                <p className="mt-1 text-sm text-slate-500">{t('personalAndServices')}</p>
              </div>
              <button
                type="button"
                onClick={closePatientDetails}
                disabled={serviceActionId !== null || isSavingPayment}
                aria-label={t('closePatientCard')}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            {patientDetailsLoading ? (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-white py-12 text-sm text-slate-500">
                <RefreshCw className="h-4 w-4 animate-spin" />
                {t('loading')}
              </div>
            ) : patientDetailsError ? (
              <div role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
                {patientDetailsError}
              </div>
            ) : patientDetails && (
              <div className="space-y-4">
                <div className="glass-card rounded-2xl p-4">
                  <h3 className="text-lg font-bold text-slate-800">{patientDetails.full_name}</h3>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-400">{t('phone')}</p>
                      <p className="mt-0.5 font-medium text-slate-700">{patientDetails.phone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">{t('birthDate')}</p>
                      <p className="mt-0.5 font-medium text-slate-700">
                        {patientDetails.birth_date
                          ? new Date(`${patientDetails.birth_date}T00:00:00`).toLocaleDateString(locale)
                          : t('notEntered')}
                      </p>
                    </div>
                    {patientDetails.telegram_username && (
                      <div className="col-span-2">
                        <p className="text-xs text-slate-400">{t('telegram_username')}</p>
                        <a
                          href={`https://t.me/${encodeURIComponent(patientDetails.telegram_username.replace(/^@/, ''))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-0.5 inline-flex items-center gap-1.5 font-medium text-sky-600 transition hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                        >
                          <Send className="h-3.5 w-3.5" />
                          @{patientDetails.telegram_username.replace(/^@/, '')}
                        </a>
                      </div>
                    )}
                    <div className={`col-span-2 flex flex-col items-start justify-between gap-2 rounded-lg px-3 py-2 sm:flex-row sm:items-center ${
                      Number(patientDetails.balance_due || 0) < 0
                        ? 'bg-rose-50'
                        : 'bg-emerald-50'
                    }`}>
                      <div>
                        <p className={`text-xs ${
                          Number(patientDetails.balance_due || 0) < 0 ? 'text-rose-700' : 'text-emerald-700'
                        }`}>{t('patientBalance')}</p>
                        <p className={`mt-0.5 font-bold ${
                          Number(patientDetails.balance_due || 0) < 0 ? 'text-rose-600' : 'text-emerald-600'
                        }`}>
                          {formatBalance(patientDetails.balance_due, language, t('currency'))}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentAmount('');
                          setPaymentError('');
                          setPaymentTarget({ type: 'deposit' });
                        }}
                        className="flex shrink-0 items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                      >
                        <PlusCircle className="h-4 w-4" />
                        {t('topUpBalance')}
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <p className="text-xs text-slate-400">{t('medicalNotes')}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                      {patientDetails.medical_notes || t('noNotes')}
                    </p>
                  </div>
                </div>

                <section className="space-y-2.5">
                  <h3 className="font-semibold text-slate-800">{t('appointments')}</h3>
                  {patientDetails.appointments?.map((appointment) => (
                    <article
                      key={appointment.id}
                      className={`glass-card rounded-2xl p-3 ${
                        appointment.status === 'CANCELLED' ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800">
                            {formatDateTime(appointment.appointment_time)}
                          </p>
                          {appointment.complaint_or_note && (
                            <p className="mt-1 whitespace-pre-wrap text-xs text-slate-500">
                              {appointment.complaint_or_note}
                            </p>
                          )}
                        </div>
                        <span className={`shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold ${
                          appointment.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : appointment.status === 'CANCELLED'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-amber-50 text-amber-700'
                        }`}>
                          {t(appointment.status === 'COMPLETED'
                            ? 'completed'
                            : appointment.status === 'CANCELLED'
                              ? 'cancelled'
                              : 'pending')}
                        </span>
                      </div>
                      {appointment.reminder_sent_at && (
                        <div className="mt-2 flex justify-end">
                          <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                            {t('reminded')}
                          </span>
                        </div>
                      )}
                      {appointment.status !== 'CANCELLED' && (
                        <div className="mt-2 flex justify-end gap-2 border-t border-slate-200/70 pt-2 dark:border-slate-700">
                          {!appointment.reminder_sent_at && (
                            <button
                              type="button"
                              onClick={() => handleSendAppointmentReminder(appointment)}
                              disabled={reminderActionId !== null}
                              title={!appointment.patient?.telegram_linked ? t('telegramLinkRequired') : undefined}
                              className="inline-flex items-center gap-1 rounded-xl border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-medium text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:bg-sky-500/20"
                            >
                              {reminderActionId === appointment.id
                                ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                : <Send className="h-3.5 w-3.5" />}
                              {t(appointment.patient?.telegram_linked ? 'sendReminder' : 'telegramNotLinked')}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openAppointmentEdit(appointment)}
                            disabled={appointmentActionId !== null}
                            className="inline-flex items-center gap-1 rounded-xl border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-medium text-sky-700 transition hover:bg-sky-100 disabled:opacity-60 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:bg-sky-500/20"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            {t('edit')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancelAppointment(appointment)}
                            disabled={appointmentActionId !== null}
                            className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-60 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
                          >
                            {appointmentActionId === appointment.id
                              ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              : <Ban className="h-3.5 w-3.5" />}
                            {t('cancelAppointment')}
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                </section>

                <h3 className="font-semibold text-slate-800">{t('services')}</h3>
                <div className="grid grid-cols-2 rounded-xl bg-slate-200/70 p-1">
                  <button
                    type="button"
                    onClick={() => setPatientServiceTab('planned')}
                    className={`rounded-lg px-2 py-2 text-xs font-medium transition sm:text-sm ${
                      patientServiceTab === 'planned' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    {t('plannedServices')} ({patientTreatments.filter((treatment) => treatment.status === 'PLANNED').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPatientServiceTab('completed')}
                    className={`rounded-lg px-2 py-2 text-xs font-medium transition sm:text-sm ${
                      patientServiceTab === 'completed' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    {t('providedServices')} ({patientTreatments.filter((treatment) => treatment.status === 'COMPLETED').length})
                  </button>
                </div>

                {serviceError && (
                  <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {serviceError}
                  </p>
                )}

                {visibleTreatments.length ? (
                  <div className="space-y-2">
                    {visibleTreatments.map((treatment) => (
                      <article key={treatment.id} className="glass-card rounded-2xl p-3 transition-all duration-200 active:scale-[0.99]">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="font-semibold text-slate-800">{treatment.procedure_name}</h4>
                            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                              <CalendarDays className="h-3.5 w-3.5" />
                              {formatDateTime(
                                patientServiceTab === 'planned'
                                  ? treatment.appointment_time
                                  : treatment.performed_at
                              )}
                            </p>
                            <p className="mt-1 text-sm font-bold text-slate-700">
                              {formatMoney(treatment.price)}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-stretch gap-2">
                            {patientServiceTab === 'planned' && (
                              <button
                                type="button"
                                onClick={() => handleCompleteTreatment(treatment.id)}
                                disabled={serviceActionId !== null || isSavingPayment}
                                className="flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                              >
                                {serviceActionId === treatment.id
                                  ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                  : <CheckCircle2 className="h-3.5 w-3.5" />}
                                {t('finish')}
                              </button>
                            )}
                            {treatment.is_paid ? (
                              <button
                                type="button"
                                disabled
                                className="flex cursor-not-allowed items-center justify-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-2 text-xs font-semibold text-emerald-700"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {t('paid')}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setPaymentError('');
                                  setPaymentTarget({ type: 'treatment', treatment });
                                }}
                                disabled={isSavingPayment || serviceActionId !== null}
                                className="flex items-center justify-center gap-1 rounded-lg bg-sky-600 px-2.5 py-2 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
                              >
                                <Wallet className="h-3.5 w-3.5" />
                                {t('pay')}
                              </button>
                            )}
                            {patientServiceTab === 'completed' && (
                              <span className="flex items-center justify-center gap-1 text-xs text-slate-500">
                                <ClipboardList className="h-3.5 w-3.5" />
                                {t('treatmentDone')}
                              </span>
                            )}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
                    <p className="text-sm text-slate-500">
                      {patientServiceTab === 'planned'
                        ? t('noPlannedServices')
                        : t('noProvidedServices')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {appointmentEdit && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm"
          onClick={() => !isSavingAppointment && setAppointmentEdit(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-appointment-title"
            className="glass-modal max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 id="edit-appointment-title" className="font-bold text-slate-800">
                  {t('editAppointment')}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {appointmentEdit.appointment.patient?.full_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAppointmentEdit(null)}
                disabled={isSavingAppointment}
                aria-label={t('closeModal')}
                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <form onSubmit={handleSaveAppointmentEdit} className="space-y-3">
              <div>
                <label htmlFor="edit-appointment-time" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  {t('appointmentTime')}
                </label>
                <input
                  id="edit-appointment-time"
                  type="datetime-local"
                  value={appointmentEdit.appointment_time}
                  onChange={(event) => setAppointmentEdit({
                    ...appointmentEdit,
                    appointment_time: event.target.value
                  })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  required
                />
              </div>

              {appointmentEdit.appointment.treatments?.length > 1 && (
                <div>
                  <label htmlFor="edit-appointment-treatment" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    {t('serviceToEdit')}
                  </label>
                  <select
                    id="edit-appointment-treatment"
                    value={appointmentEdit.treatment_id}
                    onChange={(event) => {
                      const treatment = appointmentEdit.appointment.treatments.find(
                        (item) => item.id === Number(event.target.value)
                      );
                      setAppointmentEdit({
                        ...appointmentEdit,
                        treatment_id: treatment.id,
                        procedure_name: treatment.procedure_name,
                        price: treatment.price,
                        customService: !clinicServices.includes(treatment.procedure_name),
                        hasTreatment: true
                      });
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {appointmentEdit.appointment.treatments.map((treatment) => (
                      <option key={treatment.id} value={treatment.id}>
                        {treatment.procedure_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="edit-appointment-service" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  {t('service')}
                </label>
                <select
                  id="edit-appointment-service"
                  value={appointmentEdit.customService ? '__custom__' : appointmentEdit.procedure_name}
                  disabled={Boolean(appointmentEdit.appointment.treatments?.find(
                    (item) => item.id === Number(appointmentEdit.treatment_id)
                  )?.is_paid)}
                  onChange={(event) => {
                    const customService = event.target.value === '__custom__';
                    setAppointmentEdit({
                      ...appointmentEdit,
                      customService,
                      procedure_name: customService ? '' : event.target.value,
                      hasTreatment: true
                    });
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-sky-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">{t('selectService')}</option>
                  {clinicServices.map((service, index) => (
                    <option key={service} value={service}>
                      {t(['serviceCleaning', 'serviceFilling', 'serviceImplant', 'serviceExtraction', 'serviceCheckup'][index])}
                    </option>
                  ))}
                  <option value="__custom__">{t('customService')}</option>
                </select>
                {appointmentEdit.customService && (
                  <input
                    type="text"
                    value={appointmentEdit.procedure_name}
                    onChange={(event) => setAppointmentEdit({
                      ...appointmentEdit,
                      procedure_name: event.target.value,
                      hasTreatment: true
                    })}
                    placeholder={t('exampleTreatment')}
                    disabled={Boolean(appointmentEdit.appointment.treatments?.find(
                      (item) => item.id === Number(appointmentEdit.treatment_id)
                    )?.is_paid)}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    required
                  />
                )}
              </div>

              <div>
                <label htmlFor="edit-appointment-price" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  {t('servicePrice')}
                </label>
                <input
                  id="edit-appointment-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={appointmentEdit.price}
                  onChange={(event) => setAppointmentEdit({
                    ...appointmentEdit,
                    price: event.target.value,
                    hasTreatment: true
                  })}
                  disabled={Boolean(appointmentEdit.appointment.treatments?.find(
                    (item) => item.id === Number(appointmentEdit.treatment_id)
                  )?.is_paid)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  required
                />
                {appointmentEdit.appointment.treatments?.find(
                  (item) => item.id === Number(appointmentEdit.treatment_id)
                )?.is_paid && (
                  <p className="mt-1 text-xs text-slate-500">{t('paidServiceEditNotice')}</p>
                )}
              </div>

              <div>
                <label htmlFor="edit-appointment-note" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  {t('noteComplaint')}
                </label>
                <textarea
                  id="edit-appointment-note"
                  rows="3"
                  value={appointmentEdit.complaint_or_note}
                  onChange={(event) => setAppointmentEdit({
                    ...appointmentEdit,
                    complaint_or_note: event.target.value
                  })}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              {appointmentEditError && (
                <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {appointmentEditError}
                </p>
              )}
              <button
                type="submit"
                disabled={isSavingAppointment}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingAppointment && <RefreshCw className="h-4 w-4 animate-spin" />}
                {isSavingAppointment ? t('saving') : t('save')}
              </button>
            </form>
          </section>
        </div>
      )}

      {paymentTarget && patientDetails && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm"
          onClick={closePaymentModal}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-modal-title"
            className="glass-modal max-h-[90dvh] w-full max-w-sm overflow-y-auto rounded-3xl p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 id="payment-modal-title" className="font-bold text-slate-800">
                  {paymentTarget.type === 'deposit'
                    ? t('topUpBalance')
                    : paymentTarget.type === 'appointment'
                      ? t('appointmentPayment')
                      : t('paymentForService')}
                </h2>
                <p className="mt-1 text-xs text-slate-500">{patientDetails.full_name}</p>
              </div>
              <button
                type="button"
                onClick={closePaymentModal}
                disabled={isSavingPayment}
                aria-label={t('closePayment')}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <form onSubmit={handleSavePayment} className="space-y-4">
              {paymentTarget.type === 'appointment' ? (
                <div className="space-y-2 rounded-xl border border-slate-200/70 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                  <p className="text-xs font-medium text-slate-500">{t('appointmentServices')}</p>
                  {paymentTarget.appointment.treatments?.length > 0 ? (
                    paymentTarget.appointment.treatments.map((treatment) => (
                      <div key={treatment.id} className="flex items-center justify-between gap-3 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-700 dark:text-slate-200">
                            {treatment.procedure_name}
                          </p>
                          <p className="text-xs text-slate-500">{formatMoney(treatment.price)}</p>
                        </div>
                        {treatment.is_paid ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {t('paid')}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentError('');
                              setPaymentTarget({ type: 'treatment', treatment });
                            }}
                            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-sky-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-700"
                          >
                            <Wallet className="h-3.5 w-3.5" />
                            {t('pay')}
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-600 dark:text-slate-300">{t('noAppointmentServices')}</p>
                  )}
                </div>
              ) : paymentTarget.type === 'deposit' ? (
                <>
                  <div className={`rounded-xl p-3 ${
                    Number(patientDetails.balance_due || 0) < 0
                      ? 'bg-rose-50 dark:bg-rose-500/10'
                      : 'bg-emerald-50 dark:bg-emerald-500/10'
                  }`}>
                    <p className={`text-xs ${
                      Number(patientDetails.balance_due || 0) < 0
                        ? 'text-rose-700 dark:text-rose-400'
                        : 'text-emerald-700 dark:text-emerald-400'
                    }`}>{t('currentBalance')}</p>
                    <p className={`mt-1 font-bold ${
                      Number(patientDetails.balance_due || 0) < 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {formatBalance(patientDetails.balance_due, language, t('currency'))}
                    </p>
                  </div>
                  <div>
                    <label htmlFor="deposit-amount" className="mb-1 block text-sm font-medium text-slate-600">
                      {t('depositAmount')}
                    </label>
                    <input
                      id="deposit-amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      required
                      autoFocus
                    />
                  </div>
                  {Number(paymentAmount) > 0 && (
                    <div className={`rounded-xl p-3 ${
                      Number(patientDetails.balance_due || 0) + Number(paymentAmount) < 0
                        ? 'bg-rose-50 dark:bg-rose-500/10'
                        : 'bg-emerald-50 dark:bg-emerald-500/10'
                    }`}>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{t('balanceAfterDeposit')}</p>
                      <p className={`mt-1 font-semibold ${
                        Number(patientDetails.balance_due || 0) + Number(paymentAmount) < 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {formatBalance(Number(patientDetails.balance_due || 0) + Number(paymentAmount), language, t('currency'))}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="font-semibold text-slate-800">{paymentTarget.treatment.procedure_name}</p>
                    <p className="mt-1 text-sm font-bold text-slate-700">
                      {formatMoney(paymentTarget.treatment.price)}
                    </p>
                  </div>
                  <div className="space-y-2 rounded-xl bg-slate-50 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">{t('currentBalance')}</span>
                      <span className="font-semibold text-slate-700">
                        {formatBalance(patientDetails.balance_due, language, t('currency'))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-2">
                      <span className="text-slate-500">{t('balanceAfterPayment')}</span>
                      <span className={`font-bold ${
                        Number(patientDetails.balance_due || 0) - Number(paymentTarget.treatment.price || 0) < 0
                          ? 'text-rose-600'
                          : 'text-emerald-600'
                      }`}>
                        {formatBalance(
                          Number(patientDetails.balance_due || 0) - Number(paymentTarget.treatment.price || 0),
                          language,
                          t('currency')
                        )}
                      </span>
                    </div>
                  </div>
                  {Number(patientDetails.balance_due || 0) - Number(paymentTarget.treatment.price || 0) < 0 && (
                    <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                      {t('debtWarning')}
                    </p>
                  )}
                </>
              )}

              {paymentError && (
                <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {paymentError}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closePaymentModal}
                  disabled={isSavingPayment}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {t('cancel')}
                </button>
                {paymentTarget.type !== 'appointment' && (
                  <button
                    type="submit"
                    disabled={
                      isSavingPayment ||
                      (paymentTarget.type === 'deposit' && Number(paymentAmount) <= 0)
                    }
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-sky-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingPayment && <RefreshCw className="h-4 w-4 animate-spin" />}
                    {isSavingPayment
                      ? t('saving')
                      : paymentTarget.type === 'deposit'
                        ? t('topUpBalance')
                        : t('confirmPayment')}
                  </button>
                )}
              </div>
            </form>
          </section>
        </div>
      )}

      {isPatientModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm"
          onClick={closePatientModal}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-patient-title"
            className="glass-modal max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 id="new-patient-title" className="text-lg font-bold text-slate-800">
                  {t('addPatientTitle')}
                </h2>
                <p className="mt-1 text-sm text-slate-500">{t('enterPatientInfo')}</p>
              </div>
              <button
                type="button"
                onClick={closePatientModal}
                disabled={isCreatingPatient}
                aria-label={t('closeModal')}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePatient} className="space-y-3">
              <div>
                <label htmlFor="patient-first-name" className="mb-1 block text-sm font-medium text-slate-600">
                  {t('firstName')} <span className="text-rose-500">*</span>
                </label>
                <input
                  id="patient-first-name"
                  type="text"
                  value={newPatient.first_name}
                  onChange={(e) => setNewPatient({ ...newPatient, first_name: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  autoComplete="given-name"
                  required
                />
              </div>

              <div>
                <label htmlFor="patient-last-name" className="mb-1 block text-sm font-medium text-slate-600">
                  {t('lastName')} <span className="text-rose-500">*</span>
                </label>
                <input
                  id="patient-last-name"
                  type="text"
                  value={newPatient.last_name}
                  onChange={(e) => setNewPatient({ ...newPatient, last_name: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  autoComplete="family-name"
                  required
                />
              </div>

              <div>
                <label htmlFor="patient-phone" className="mb-1 block text-sm font-medium text-slate-600">
                  {t('phoneNumber')} <span className="text-rose-500">*</span>
                </label>
                <input
                  id="patient-phone"
                  type="tel"
                  placeholder={t('phoneExample')}
                  value={newPatient.phone}
                  onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  autoComplete="tel"
                  required
                />
              </div>

              <div>
                <label htmlFor="patient-telegram-username" className="mb-1 block text-sm font-medium text-slate-600">
                  {t('telegram_username')}
                </label>
                <div className="relative">
                  <Send className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="patient-telegram-username"
                    type="text"
                    placeholder={t('telegramUsernamePlaceholder')}
                    value={newPatient.telegram_username}
                    onChange={(e) => setNewPatient({ ...newPatient, telegram_username: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
                    autoComplete="off"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="patient-birth-date" className="mb-1 block text-sm font-medium text-slate-600">
                  {t('birthDate')}
                </label>
                <input
                  id="patient-birth-date"
                  type="date"
                  value={newPatient.birth_date}
                  onChange={(e) => setNewPatient({ ...newPatient, birth_date: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div>
                <label htmlFor="patient-medical-notes" className="mb-1 block text-sm font-medium text-slate-600">
                  {t('medicalRecords')}
                </label>
                <textarea
                  id="patient-medical-notes"
                  rows="3"
                  value={newPatient.medical_notes}
                  onChange={(e) => setNewPatient({ ...newPatient, medical_notes: e.target.value })}
                  className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              {createPatientError && (
                <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {createPatientError}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={closePatientModal}
                  disabled={isCreatingPatient}
                  className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isCreatingPatient}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreatingPatient && <RefreshCw className="h-4 w-4 animate-spin" />}
                  {isCreatingPatient ? t('saving') : t('save')}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Pastki navigatsiya paneli (Bottom Navigation) */}
      <nav className="app-bottom-nav fixed inset-x-4 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md items-center justify-around rounded-3xl border border-white/50 bg-white/70 px-4 py-2 shadow-xl shadow-black/10 backdrop-blur-2xl transition-colors duration-200 dark:border-white/10 dark:bg-slate-900/70">
        <button 
          onClick={() => setActiveTab('today')}
          className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl py-1 text-xs transition-all duration-200 ${activeTab === 'today' ? 'bg-sky-500/10 font-semibold text-sky-600 dark:text-sky-300' : 'text-slate-400'}`}
        >
          <Calendar className="w-5 h-5 mb-0.5" />
          {t('today')}
        </button>
        <button 
          onClick={() => setActiveTab('add')}
          className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl py-1 text-xs transition-all duration-200 ${activeTab === 'add' ? 'bg-sky-500/10 font-semibold text-sky-600 dark:text-sky-300' : 'text-slate-400'}`}
        >
          <PlusCircle className="w-5 h-5 mb-0.5" />
          {t('newAppointment')}
        </button>
        <button 
          onClick={() => setActiveTab('patients')}
          className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl py-1 text-xs transition-all duration-200 ${activeTab === 'patients' ? 'bg-sky-500/10 font-semibold text-sky-600 dark:text-sky-300' : 'text-slate-400'}`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          {t('patients')}
        </button>
        <button 
          onClick={() => setActiveTab('profile')}
          className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl py-1 text-xs transition-all duration-200 ${activeTab === 'profile' ? 'bg-sky-500/10 font-semibold text-sky-600 dark:text-sky-300' : 'text-slate-400'}`}
        >
          <UserCircle className="w-5 h-5 mb-0.5" />
          {t('profile')}
        </button>
      </nav>
    </div>
  );
}