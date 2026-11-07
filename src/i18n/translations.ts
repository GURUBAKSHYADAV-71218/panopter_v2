import type { Language, Translations } from '@/types'

const en: Translations = {
  nav: {
    dashboard: 'Dashboard',
    investigations: 'Investigations',
    documents: 'Documents',
    findings: 'Findings',
    relationships: 'Relationships',
    timeline: 'Timeline',
    reports: 'Reports',
    settings: 'Settings',
  },
  common: {
    loading: 'Loading...',
    error: 'An error occurred',
    retry: 'Retry',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    confirm: 'Confirm',
    dismiss: 'Dismiss',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    view: 'View',
    edit: 'Edit',
    search: 'Search',
    filter: 'Filter',
    sort: 'Sort',
    export: 'Export',
    download: 'Download',
    noData: 'No data available',
    success: 'Success',
  },
  status: {
    needsReview: 'Needs Review',
    confirmed: 'Confirmed',
    dismissed: 'Dismissed',
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
    cancelled: 'Cancelled',
  },
  priority: {
    low: 'Low',
    moderate: 'Moderate',
    high: 'High',
    critical: 'Critical',
  },
}

const hi: Translations = {
  nav: {
    dashboard: 'डैशबोर्ड',
    investigations: 'जांच',
    documents: 'दस्तावेज़',
    findings: 'निष्कर्ष',
    relationships: 'संबंध',
    timeline: 'समयरेखा',
    reports: 'रिपोर्ट',
    settings: 'सेटिंग्स',
  },
  common: {
    loading: 'लोड हो रहा है...',
    error: 'एक त्रुटि हुई',
    retry: 'पुनः प्रयास करें',
    cancel: 'रद्द करें',
    save: 'सहेजें',
    delete: 'हटाएं',
    confirm: 'पुष्टि करें',
    dismiss: 'खारिज करें',
    close: 'बंद करें',
    back: 'वापस',
    next: 'अगला',
    view: 'देखें',
    edit: 'संपादित करें',
    search: 'खोज',
    filter: 'फ़िल्टर',
    sort: 'क्रमबद्ध',
    export: 'निर्यात',
    download: 'डाउनलोड',
    noData: 'कोई डेटा उपलब्ध नहीं',
    success: 'सफलता',
  },
  status: {
    needsReview: 'समीक्षा आवश्यक',
    confirmed: 'पुष्टि हुई',
    dismissed: 'खारिज',
    pending: 'लंबित',
    processing: 'प्रक्रिया में',
    completed: 'पूर्ण',
    failed: 'विफल',
    cancelled: 'रद्द',
  },
  priority: {
    low: 'कम',
    moderate: 'मध्यम',
    high: 'उच्च',
    critical: 'अत्यंत महत्वपूर्ण',
  },
}

export const translations: Record<Language, Translations> = { en, hi }

export function getTranslations(lang: Language): Translations {
  return translations[lang] ?? translations.en
}
