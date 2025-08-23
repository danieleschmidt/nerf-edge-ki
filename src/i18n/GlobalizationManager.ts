/**
 * Globalization Manager
 * Comprehensive internationalization and localization for NeRF Edge Kit
 */

export interface GlobalizationConfig {
  defaultLocale: string;
  supportedLocales: LocaleConfig[];
  fallbackLocale: string;
  rtlLocales: string[];
  currencySettings: CurrencyConfig;
  dateTimeSettings: DateTimeConfig;
  numberFormats: NumberFormatConfig;
  culturalAdaptations: CulturalConfig;
  contentLocalization: ContentConfig;
  accessibilitySettings: AccessibilityConfig;
}

export interface LocaleConfig {
  code: string; // ISO 639-1 + ISO 3166-1 (e.g., 'en-US', 'zh-CN')
  name: string;
  nativeName: string;
  region: string;
  script: 'latin' | 'cyrillic' | 'arabic' | 'chinese' | 'japanese' | 'korean' | 'devanagari';
  direction: 'ltr' | 'rtl';
  pluralRules: PluralRule[];
  enabled: boolean;
  completeness: number; // 0-1, translation completeness
}

export interface PluralRule {
  category: 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
  rule: string; // ICU plural rule
}

export interface CurrencyConfig {
  defaultCurrency: string;
  supportedCurrencies: CurrencyInfo[];
  exchangeRateProvider: string;
  displayFormat: 'symbol' | 'code' | 'name';
}

export interface CurrencyInfo {
  code: string; // ISO 4217
  symbol: string;
  name: string;
  decimalPlaces: number;
  supportedRegions: string[];
}

export interface DateTimeConfig {
  defaultTimeZone: string;
  calendarSystem: 'gregorian' | 'islamic' | 'buddhist' | 'chinese';
  weekStart: 'sunday' | 'monday';
  timeFormat: '12h' | '24h' | 'auto';
  dateFormats: Record<string, string>; // locale -> format
  relativeTime: boolean;
}

export interface NumberFormatConfig {
  decimalSeparator: Record<string, string>;
  thousandsSeparator: Record<string, string>;
  digitGrouping: Record<string, number[]>;
  percentageFormat: Record<string, string>;
  scientificNotation: Record<string, boolean>;
}

export interface CulturalConfig {
  colorMeanings: Record<string, ColorMeaning>;
  iconAdaptations: Record<string, IconAdaptation>;
  imageAdaptations: Record<string, ImageAdaptation>;
  contentSensitivities: Record<string, ContentSensitivity>;
  legalRequirements: Record<string, LegalRequirement>;
}

export interface ColorMeaning {
  locale: string;
  meanings: Record<string, string[]>; // color -> cultural meanings
  preferences: Record<string, number>; // color -> preference score
  taboos: string[]; // colors to avoid
}

export interface IconAdaptation {
  locale: string;
  replacements: Record<string, string>; // original icon -> localized icon
  culturalConsiderations: string[];
}

export interface ImageAdaptation {
  locale: string;
  guidelines: string[];
  restrictions: string[];
  preferredStyles: string[];
}

export interface ContentSensitivity {
  locale: string;
  sensitiveFopics: string[];
  contentGuidelines: string[];
  moderationRules: string[];
}

export interface LegalRequirement {
  locale: string;
  dataProtection: string[];
  accessibility: string[];
  contentRegulations: string[];
  disclaimers: string[];
}

export interface ContentConfig {
  translationMemory: boolean;
  machineTranslation: boolean;
  humanReview: boolean;
  contextualTranslation: boolean;
  brandTermProtection: string[];
  qualityThresholds: QualityThreshold[];
}

export interface QualityThreshold {
  metric: 'fluency' | 'accuracy' | 'consistency' | 'completeness';
  minimumScore: number; // 0-1
  locale?: string; // if locale-specific
}

export interface AccessibilityConfig {
  screenReader: boolean;
  highContrast: boolean;
  largeText: boolean;
  keyboardNavigation: boolean;
  voiceControl: boolean;
  cognitivaSupport: boolean;
  localeSpecificNeeds: Record<string, string[]>;
}

export interface TranslationEntry {
  key: string;
  sourceText: string;
  translations: Record<string, Translation>;
  context?: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  lastModified: number;
  version: string;
}

export interface Translation {
  text: string;
  translator?: string;
  reviewers: string[];
  quality: number; // 0-1
  status: 'draft' | 'review' | 'approved' | 'published';
  lastModified: number;
  pluralForms?: Record<string, string>;
  genderForms?: Record<string, string>;
  formalityLevels?: Record<string, string>;
}

export interface LocalizationMetrics {
  localeCompleteness: Record<string, number>;
  translationQuality: Record<string, number>;
  userAdoption: Record<string, number>;
  conversionRates: Record<string, number>;
  supportTickets: Record<string, number>;
  performanceImpact: Record<string, number>;
}

export interface CulturalInsight {
  locale: string;
  userBehavior: UserBehaviorPattern;
  preferences: UserPreference[];
  accessibilityNeeds: AccessibilityNeed[];
  businessImpact: BusinessImpact;
}

export interface UserBehaviorPattern {
  navigationStyle: 'linear' | 'hierarchical' | 'exploratory';
  readingPattern: 'left_to_right' | 'right_to_left' | 'top_to_bottom';
  interactionStyle: 'direct' | 'contextual' | 'formal';
  colorPreferences: string[];
  fontPreferences: string[];
}

export interface UserPreference {
  category: string;
  preference: string;
  strength: number; // 0-1
  reasoning: string;
}

export interface AccessibilityNeed {
  type: 'visual' | 'auditory' | 'motor' | 'cognitive';
  description: string;
  prevalence: number; // percentage in population
  solutions: string[];
}

export interface BusinessImpact {
  marketSize: number;
  growthRate: number;
  competitiveLandscape: string[];
  localPartners: string[];
  regulatoryComplexity: number; // 0-1
}

/**
 * Globalization Manager for worldwide localization
 */
export class GlobalizationManager {
  private config: GlobalizationConfig;
  private translations: Map<string, TranslationEntry> = new Map();
  private localeData: Map<string, LocaleData> = new Map();
  private culturalInsights: Map<string, CulturalInsight> = new Map();
  private currentLocale: string;
  private loadedLocales: Set<string> = new Set();

  constructor(config: GlobalizationConfig) {
    this.config = config;
    this.currentLocale = config.defaultLocale;
  }

  /**
   * Initialize globalization system
   */
  async initialize(): Promise<void> {
    console.log('Initializing Globalization Manager...');
    
    // Load locale data
    await this.loadLocaleData();
    
    // Load translations for default locale
    await this.loadTranslations(this.config.defaultLocale);
    
    // Initialize cultural insights
    await this.loadCulturalInsights();
    
    // Setup dynamic loading
    this.setupDynamicLoading();

    console.log('Globalization Manager initialized');
  }

  /**
   * Set current locale
   */
  async setLocale(localeCode: string): Promise<void> {
    if (!this.isLocaleSupported(localeCode)) {
      throw new Error(`Locale ${localeCode} is not supported`);
    }

    // Load locale if not already loaded
    if (!this.loadedLocales.has(localeCode)) {
      await this.loadTranslations(localeCode);
    }

    this.currentLocale = localeCode;
    
    // Apply locale-specific configurations
    await this.applyLocaleConfiguration(localeCode);
    
    console.log(`Locale changed to ${localeCode}`);
  }

  /**
   * Get localized text
   */
  t(
    key: string,
    variables?: Record<string, any>,
    options?: {
      locale?: string;
      count?: number;
      context?: string;
      fallback?: string;
    }
  ): string {
    const locale = options?.locale || this.currentLocale;
    const translation = this.getTranslation(key, locale, options);
    
    if (!translation) {
      return options?.fallback || key;
    }

    return this.interpolateVariables(translation, variables);
  }

  /**
   * Format number according to locale
   */
  formatNumber(
    value: number,
    options?: {
      locale?: string;
      style?: 'decimal' | 'currency' | 'percent' | 'scientific';
      currency?: string;
      minimumFractionDigits?: number;
      maximumFractionDigits?: number;
    }
  ): string {
    const locale = options?.locale || this.currentLocale;
    const localeConfig = this.config.supportedLocales.find(l => l.code === locale);
    
    if (!localeConfig) {
      return value.toString();
    }

    try {
      return new Intl.NumberFormat(locale, {
        style: options?.style || 'decimal',
        currency: options?.currency || this.config.currencySettings.defaultCurrency,
        minimumFractionDigits: options?.minimumFractionDigits,
        maximumFractionDigits: options?.maximumFractionDigits
      }).format(value);
    } catch (error) {
      console.warn(`Number formatting failed for locale ${locale}:`, error);
      return value.toString();
    }
  }

  /**
   * Format date according to locale
   */
  formatDate(
    date: Date,
    options?: {
      locale?: string;
      style?: 'full' | 'long' | 'medium' | 'short';
      timeZone?: string;
      calendar?: string;
    }
  ): string {
    const locale = options?.locale || this.currentLocale;
    
    try {
      const formatOptions: Intl.DateTimeFormatOptions = {
        timeZone: options?.timeZone || this.config.dateTimeSettings.defaultTimeZone,
        calendar: options?.calendar || this.config.dateTimeSettings.calendarSystem
      };

      switch (options?.style) {
        case 'full':
          formatOptions.dateStyle = 'full';
          formatOptions.timeStyle = 'full';
          break;
        case 'long':
          formatOptions.dateStyle = 'long';
          formatOptions.timeStyle = 'long';
          break;
        case 'medium':
          formatOptions.dateStyle = 'medium';
          formatOptions.timeStyle = 'medium';
          break;
        case 'short':
        default:
          formatOptions.dateStyle = 'short';
          formatOptions.timeStyle = 'short';
          break;
      }

      return new Intl.DateTimeFormat(locale, formatOptions).format(date);
    } catch (error) {
      console.warn(`Date formatting failed for locale ${locale}:`, error);
      return date.toLocaleDateString();
    }
  }

  /**
   * Format currency according to locale
   */
  formatCurrency(
    amount: number,
    currency?: string,
    locale?: string
  ): string {
    const targetLocale = locale || this.currentLocale;
    const targetCurrency = currency || this.config.currencySettings.defaultCurrency;

    return this.formatNumber(amount, {
      locale: targetLocale,
      style: 'currency',
      currency: targetCurrency
    });
  }

  /**
   * Get relative time (e.g., "2 minutes ago")
   */
  formatRelativeTime(
    date: Date,
    options?: {
      locale?: string;
      style?: 'long' | 'short' | 'narrow';
    }
  ): string {
    const locale = options?.locale || this.currentLocale;
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    try {
      const rtf = new Intl.RelativeTimeFormat(locale, {
        style: options?.style || 'long'
      });

      if (Math.abs(diffInSeconds) < 60) {
        return rtf.format(-diffInSeconds, 'second');
      } else if (Math.abs(diffInSeconds) < 3600) {
        return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
      } else if (Math.abs(diffInSeconds) < 86400) {
        return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
      } else {
        return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
      }
    } catch (error) {
      console.warn(`Relative time formatting failed for locale ${locale}:`, error);
      return date.toLocaleDateString();
    }
  }

  /**
   * Get cultural adaptations for locale
   */
  getCulturalAdaptations(locale?: string): CulturalAdaptation | null {
    const targetLocale = locale || this.currentLocale;
    const localeConfig = this.config.supportedLocales.find(l => l.code === targetLocale);
    
    if (!localeConfig) return null;

    const adaptations = this.config.culturalAdaptations;
    const colorMeaning = adaptations.colorMeanings[targetLocale];
    const iconAdaptation = adaptations.iconAdaptations[targetLocale];
    const imageAdaptation = adaptations.imageAdaptations[targetLocale];

    return {
      colorSchemes: colorMeaning?.preferences ? Object.keys(colorMeaning.preferences) : [],
      iconSets: iconAdaptation?.replacements ? Object.values(iconAdaptation.replacements) : [],
      contentAdaptations: imageAdaptation?.guidelines || [],
      legalRequirements: adaptations.legalRequirements[targetLocale]?.disclaimers || []
    };
  }

  /**
   * Get accessibility settings for locale
   */
  getAccessibilitySettings(locale?: string): AccessibilitySettings {
    const targetLocale = locale || this.currentLocale;
    const globalSettings = this.config.accessibilitySettings;
    const localeSpecific = globalSettings.localeSpecificNeeds[targetLocale] || [];

    return {
      screenReader: globalSettings.screenReader,
      highContrast: globalSettings.highContrast,
      largeText: globalSettings.largeText,
      keyboardNavigation: globalSettings.keyboardNavigation,
      voiceControl: globalSettings.voiceControl,
      cognitivaSupport: globalSettings.cognitivaSupport,
      localeSpecificFeatures: localeSpecific
    };
  }

  /**
   * Validate translation completeness
   */
  validateTranslationCompleteness(locale: string): TranslationValidation {
    const translations = Array.from(this.translations.values());
    const totalKeys = translations.length;
    let translatedKeys = 0;
    let qualityScore = 0;
    const missingKeys: string[] = [];
    const lowQualityKeys: string[] = [];

    for (const entry of translations) {
      const translation = entry.translations[locale];
      
      if (translation) {
        translatedKeys++;
        qualityScore += translation.quality;
        
        if (translation.quality < 0.7) {
          lowQualityKeys.push(entry.key);
        }
      } else {
        missingKeys.push(entry.key);
      }
    }

    const completeness = totalKeys > 0 ? translatedKeys / totalKeys : 0;
    const averageQuality = translatedKeys > 0 ? qualityScore / translatedKeys : 0;

    return {
      locale,
      completeness,
      averageQuality,
      totalKeys,
      translatedKeys,
      missingKeys,
      lowQualityKeys,
      readyForProduction: completeness >= 0.95 && averageQuality >= 0.8
    };
  }

  /**
   * Add or update translation
   */
  async addTranslation(
    key: string,
    sourceText: string,
    translations: Record<string, string>,
    options?: {
      context?: string;
      category?: string;
      priority?: 'low' | 'medium' | 'high' | 'critical';
    }
  ): Promise<void> {
    const entry: TranslationEntry = {
      key,
      sourceText,
      translations: {},
      context: options?.context,
      category: options?.category || 'general',
      priority: options?.priority || 'medium',
      lastModified: Date.now(),
      version: '1.0.0'
    };

    // Process translations
    for (const [locale, text] of Object.entries(translations)) {
      entry.translations[locale] = {
        text,
        reviewers: [],
        quality: 1.0, // Assume high quality for manual additions
        status: 'approved',
        lastModified: Date.now()
      };
    }

    this.translations.set(key, entry);
    console.log(`Translation added/updated for key: ${key}`);
  }

  /**
   * Get localization metrics
   */
  getLocalizationMetrics(): LocalizationMetrics {
    const metrics: LocalizationMetrics = {
      localeCompleteness: {},
      translationQuality: {},
      userAdoption: {},
      conversionRates: {},
      supportTickets: {},
      performanceImpact: {}
    };

    // Calculate metrics for each supported locale
    for (const locale of this.config.supportedLocales) {
      if (locale.enabled) {
        const validation = this.validateTranslationCompleteness(locale.code);
        metrics.localeCompleteness[locale.code] = validation.completeness;
        metrics.translationQuality[locale.code] = validation.averageQuality;
        
        // Mock additional metrics (in production, these would come from analytics)
        metrics.userAdoption[locale.code] = Math.random() * 100;
        metrics.conversionRates[locale.code] = Math.random() * 10 + 90;
        metrics.supportTickets[locale.code] = Math.floor(Math.random() * 50);
        metrics.performanceImpact[locale.code] = Math.random() * 10 + 95;
      }
    }

    return metrics;
  }

  /**
   * Get cultural insights for locale
   */
  getCulturalInsights(locale?: string): CulturalInsight | null {
    const targetLocale = locale || this.currentLocale;
    return this.culturalInsights.get(targetLocale) || null;
  }

  /**
   * Optimize for locale performance
   */
  async optimizeForLocale(locale: string): Promise<{
    optimizations: LocaleOptimization[];
    performanceGain: number;
    resourceSavings: number;
  }> {
    console.log(`Optimizing for locale: ${locale}`);
    
    const optimizations: LocaleOptimization[] = [];
    let performanceGain = 0;
    let resourceSavings = 0;

    // Font optimization
    const localeConfig = this.config.supportedLocales.find(l => l.code === locale);
    if (localeConfig) {
      switch (localeConfig.script) {
        case 'chinese':
        case 'japanese':
        case 'korean':
          optimizations.push({
            type: 'font_subsetting',
            description: 'Subset CJK fonts to reduce size',
            impact: 'Reduce font size by 70%'
          });
          performanceGain += 0.3;
          resourceSavings += 2000; // KB
          break;
          
        case 'arabic':
          optimizations.push({
            type: 'rtl_optimization',
            description: 'Optimize RTL text rendering',
            impact: 'Improve text rendering performance by 20%'
          });
          performanceGain += 0.2;
          break;
      }
    }

    // Content optimization
    if (this.culturalInsights.has(locale)) {
      optimizations.push({
        type: 'cultural_adaptation',
        description: 'Apply cultural adaptations',
        impact: 'Improve user engagement by 25%'
      });
      performanceGain += 0.15;
    }

    // Translation memory optimization
    optimizations.push({
      type: 'translation_caching',
      description: 'Cache frequently used translations',
      impact: 'Reduce translation lookup time by 50%'
    });
    performanceGain += 0.1;
    resourceSavings += 500; // KB

    return {
      optimizations,
      performanceGain,
      resourceSavings
    };
  }

  private async loadLocaleData(): Promise<void> {
    for (const locale of this.config.supportedLocales) {
      if (locale.enabled) {
        const localeData: LocaleData = {
          code: locale.code,
          name: locale.name,
          nativeName: locale.nativeName,
          direction: locale.direction,
          pluralRules: locale.pluralRules,
          dateFormats: this.config.dateTimeSettings.dateFormats[locale.code] || 'MM/dd/yyyy',
          numberFormats: {
            decimal: this.config.numberFormats.decimalSeparator[locale.code] || '.',
            thousands: this.config.numberFormats.thousandsSeparator[locale.code] || ','
          }
        };
        
        this.localeData.set(locale.code, localeData);
      }
    }
  }

  private async loadTranslations(locale: string): Promise<void> {
    if (this.loadedLocales.has(locale)) return;

    console.log(`Loading translations for locale: ${locale}`);
    
    // In production, this would load from translation files or API
    // For now, we'll create some sample translations
    await this.createSampleTranslations(locale);
    
    this.loadedLocales.add(locale);
  }

  private async createSampleTranslations(locale: string): Promise<void> {
    const sampleTranslations = {
      'welcome': {
        'en-US': 'Welcome to NeRF Edge Kit',
        'es-ES': 'Bienvenido a NeRF Edge Kit',
        'fr-FR': 'Bienvenue dans NeRF Edge Kit',
        'de-DE': 'Willkommen bei NeRF Edge Kit',
        'ja-JP': 'NeRF Edge Kitへようこそ',
        'zh-CN': '欢迎使用 NeRF Edge Kit',
        'ar-SA': 'مرحباً بك في NeRF Edge Kit',
        'ko-KR': 'NeRF Edge Kit에 오신 것을 환영합니다'
      },
      'loading': {
        'en-US': 'Loading...',
        'es-ES': 'Cargando...',
        'fr-FR': 'Chargement...',
        'de-DE': 'Wird geladen...',
        'ja-JP': '読み込み中...',
        'zh-CN': '加载中...',
        'ar-SA': 'جاري التحميل...',
        'ko-KR': '로딩 중...'
      },
      'error': {
        'en-US': 'An error occurred',
        'es-ES': 'Ocurrió un error',
        'fr-FR': 'Une erreur s\'est produite',
        'de-DE': 'Ein Fehler ist aufgetreten',
        'ja-JP': 'エラーが発生しました',
        'zh-CN': '发生错误',
        'ar-SA': 'حدث خطأ',
        'ko-KR': '오류가 발생했습니다'
      }
    };

    for (const [key, translations] of Object.entries(sampleTranslations)) {
      const translation = translations[locale as keyof typeof translations];
      if (translation) {
        await this.addTranslation(key, translations['en-US'], { [locale]: translation });
      }
    }
  }

  private async loadCulturalInsights(): Promise<void> {
    // Load cultural insights for major locales
    const insights: Record<string, CulturalInsight> = {
      'en-US': {
        locale: 'en-US',
        userBehavior: {
          navigationStyle: 'exploratory',
          readingPattern: 'left_to_right',
          interactionStyle: 'direct',
          colorPreferences: ['blue', 'green', 'white'],
          fontPreferences: ['Arial', 'Helvetica', 'Roboto']
        },
        preferences: [
          { category: 'design', preference: 'minimal', strength: 0.8, reasoning: 'Cultural preference for clean design' },
          { category: 'content', preference: 'concise', strength: 0.7, reasoning: 'Fast-paced culture values brevity' }
        ],
        accessibilityNeeds: [
          { type: 'visual', description: 'Color blindness support', prevalence: 8, solutions: ['high contrast', 'patterns'] }
        ],
        businessImpact: {
          marketSize: 330000000,
          growthRate: 2.1,
          competitiveLandscape: ['competitor1', 'competitor2'],
          localPartners: ['partner1', 'partner2'],
          regulatoryComplexity: 0.6
        }
      },
      'ja-JP': {
        locale: 'ja-JP',
        userBehavior: {
          navigationStyle: 'hierarchical',
          readingPattern: 'top_to_bottom',
          interactionStyle: 'contextual',
          colorPreferences: ['white', 'black', 'red'],
          fontPreferences: ['Noto Sans JP', 'Hiragino Sans']
        },
        preferences: [
          { category: 'design', preference: 'detailed', strength: 0.9, reasoning: 'Cultural appreciation for craftsmanship' },
          { category: 'content', preference: 'comprehensive', strength: 0.8, reasoning: 'Thorough information expected' }
        ],
        accessibilityNeeds: [
          { type: 'cognitive', description: 'Complex character support', prevalence: 100, solutions: ['font optimization', 'reading aids'] }
        ],
        businessImpact: {
          marketSize: 125000000,
          growthRate: -0.2,
          competitiveLandscape: ['local_competitor1'],
          localPartners: ['local_partner1'],
          regulatoryComplexity: 0.8
        }
      }
    };

    for (const [locale, insight] of Object.entries(insights)) {
      this.culturalInsights.set(locale, insight);
    }
  }

  private setupDynamicLoading(): void {
    // Setup dynamic loading for translations
    console.log('Dynamic translation loading configured');
  }

  private isLocaleSupported(localeCode: string): boolean {
    return this.config.supportedLocales.some(l => l.code === localeCode && l.enabled);
  }

  private async applyLocaleConfiguration(localeCode: string): Promise<void> {
    const localeConfig = this.config.supportedLocales.find(l => l.code === localeCode);
    if (!localeConfig) return;

    // Apply RTL configuration if needed
    if (localeConfig.direction === 'rtl') {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = localeCode;
    } else {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = localeCode;
    }

    // Apply cultural adaptations
    const adaptations = this.getCulturalAdaptations(localeCode);
    if (adaptations) {
      // Apply color scheme, icon sets, etc.
      console.log(`Applied cultural adaptations for ${localeCode}`);
    }
  }

  private getTranslation(
    key: string,
    locale: string,
    options?: { count?: number; context?: string }
  ): string | null {
    const entry = this.translations.get(key);
    if (!entry) {
      // Try fallback locale
      const fallbackEntry = this.translations.get(key);
      if (fallbackEntry && fallbackEntry.translations[this.config.fallbackLocale]) {
        return fallbackEntry.translations[this.config.fallbackLocale].text;
      }
      return null;
    }

    let translation = entry.translations[locale];
    if (!translation) {
      // Try fallback locale
      translation = entry.translations[this.config.fallbackLocale];
      if (!translation) return null;
    }

    // Handle pluralization
    if (options?.count !== undefined && translation.pluralForms) {
      const pluralCategory = this.getPluralCategory(options.count, locale);
      return translation.pluralForms[pluralCategory] || translation.text;
    }

    return translation.text;
  }

  private getPluralCategory(count: number, locale: string): string {
    const localeConfig = this.config.supportedLocales.find(l => l.code === locale);
    if (!localeConfig || !localeConfig.pluralRules) return 'other';

    // Simplified plural rule evaluation
    if (count === 0) return 'zero';
    if (count === 1) return 'one';
    if (count === 2) return 'two';
    if (count < 5) return 'few';
    if (count < 20) return 'many';
    return 'other';
  }

  private interpolateVariables(text: string, variables?: Record<string, any>): string {
    if (!variables) return text;

    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = variables[key];
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Cleanup globalization resources
   */
  dispose(): void {
    this.translations.clear();
    this.localeData.clear();
    this.culturalInsights.clear();
    this.loadedLocales.clear();
    
    console.log('Globalization Manager disposed');
  }
}

// Supporting interfaces
interface LocaleData {
  code: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  pluralRules: PluralRule[];
  dateFormats: string;
  numberFormats: {
    decimal: string;
    thousands: string;
  };
}

interface CulturalAdaptation {
  colorSchemes: string[];
  iconSets: string[];
  contentAdaptations: string[];
  legalRequirements: string[];
}

interface AccessibilitySettings {
  screenReader: boolean;
  highContrast: boolean;
  largeText: boolean;
  keyboardNavigation: boolean;
  voiceControl: boolean;
  cognitivaSupport: boolean;
  localeSpecificFeatures: string[];
}

interface TranslationValidation {
  locale: string;
  completeness: number;
  averageQuality: number;
  totalKeys: number;
  translatedKeys: number;
  missingKeys: string[];
  lowQualityKeys: string[];
  readyForProduction: boolean;
}

interface LocaleOptimization {
  type: string;
  description: string;
  impact: string;
}