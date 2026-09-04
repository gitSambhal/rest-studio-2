export type UIThemeId =
  | 'dark'
  | 'light'
  | 'cyberpunk'
  | 'midnight'
  | 'monokai'
  | 'dracula'
  | 'nordic'
  | 'solarized-light';

export interface UITheme {
  id: UIThemeId;
  name: string;
  category: 'dark' | 'light';
  description: string;
  iconType: 'palette' | 'sun' | 'zap' | 'moon' | 'terminal' | 'sparkles' | 'compass' | 'book';
  previewColors: {
    bg: string;
    surface: string;
    border: string;
    primary: string;
    text: string;
    accent: string;
    subtext: string;
  };
}

export const THEMES: UITheme[] = [
  {
    id: 'dark',
    name: 'Dark Slate',
    category: 'dark',
    description: 'Modern slate dark canvas with vibrant emerald accents',
    iconType: 'palette',
    previewColors: {
      bg: '#090d16',
      surface: '#0f172a',
      border: '#1e293b',
      primary: '#10b981',
      text: '#f8fafc',
      accent: '#38bdf8',
      subtext: '#94a3b8',
    },
  },
  {
    id: 'light',
    name: 'Light Crisp',
    category: 'light',
    description: 'Clean white background with slate borders & emerald highlights',
    iconType: 'sun',
    previewColors: {
      bg: '#f8fafc',
      surface: '#ffffff',
      border: '#e2e8f0',
      primary: '#059669',
      text: '#0f172a',
      accent: '#0284c7',
      subtext: '#64748b',
    },
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    category: 'dark',
    description: 'High-contrast violet canvas with glowing pink & cyan accents',
    iconType: 'zap',
    previewColors: {
      bg: '#090514',
      surface: '#130b24',
      border: '#3b1568',
      primary: '#ec4899',
      text: '#fdf2f8',
      accent: '#06b6d4',
      subtext: '#c084fc',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight OLED',
    category: 'dark',
    description: 'Pure pitch black #000000 canvas with royal violet accents',
    iconType: 'moon',
    previewColors: {
      bg: '#000000',
      surface: '#09090b',
      border: '#27272a',
      primary: '#8b5cf6',
      text: '#ffffff',
      accent: '#a78bfa',
      subtext: '#a1a1aa',
    },
  },
  {
    id: 'monokai',
    name: 'Monokai Pro',
    category: 'dark',
    description: 'Warm dark charcoal canvas with amber & coral red accents',
    iconType: 'terminal',
    previewColors: {
      bg: '#191919',
      surface: '#222222',
      border: '#383838',
      primary: '#f59e0b',
      text: '#f8f8f2',
      accent: '#ffd866',
      subtext: '#939290',
    },
  },
  {
    id: 'dracula',
    name: 'Dracula',
    category: 'dark',
    description: 'Classic dark blue-violet palette with pink & purple accents',
    iconType: 'sparkles',
    previewColors: {
      bg: '#1e1f29',
      surface: '#282a36',
      border: '#44475a',
      primary: '#ff79c6',
      text: '#f8f8f2',
      accent: '#bd93f9',
      subtext: '#6272a4',
    },
  },
  {
    id: 'nordic',
    name: 'Nordic Frost',
    category: 'dark',
    description: 'Cool arctic blue-gray with frost cyan & teal accents',
    iconType: 'compass',
    previewColors: {
      bg: '#1b222d',
      surface: '#242b38',
      border: '#3b4252',
      primary: '#38bdf8',
      text: '#eceff4',
      accent: '#88c0d0',
      subtext: '#8190a6',
    },
  },
  {
    id: 'solarized-light',
    name: 'Solarized Light',
    category: 'light',
    description: 'Warm solar ivory surface with deep teal & amber accents',
    iconType: 'book',
    previewColors: {
      bg: '#fdf6e3',
      surface: '#eee8d5',
      border: '#d3c6aa',
      primary: '#2aa198',
      text: '#073642',
      accent: '#b58900',
      subtext: '#586e75',
    },
  },
];

export function applyTheme(themeId: UIThemeId) {
  const allThemeClasses = [
    'light-theme',
    'theme-dark',
    'theme-light',
    'theme-cyberpunk',
    'theme-midnight',
    'theme-monokai',
    'theme-dracula',
    'theme-nordic',
    'theme-solarized-light',
  ];

  allThemeClasses.forEach((cls) => {
    document.documentElement.classList.remove(cls);
    document.body.classList.remove(cls);
  });

  const selectedTheme = THEMES.find((t) => t.id === themeId) || THEMES[0];

  if (selectedTheme.category === 'light') {
    document.documentElement.classList.add('light-theme');
    document.body.classList.add('light-theme');
  }

  document.documentElement.classList.add(`theme-${themeId}`);
  document.body.classList.add(`theme-${themeId}`);

  try {
    localStorage.setItem('reststudio_theme_preset', themeId);
    localStorage.setItem('reststudio_theme', selectedTheme.category);
    localStorage.setItem('restpulse_theme_preset', themeId);
  } catch (e) {}
}

export function getSavedTheme(): UIThemeId {
  try {
    const savedPreset = (localStorage.getItem('reststudio_theme_preset') || localStorage.getItem('restpulse_theme_preset')) as UIThemeId;
    if (savedPreset && THEMES.some((t) => t.id === savedPreset)) {
      return savedPreset;
    }
    const legacyTheme = localStorage.getItem('reststudio_theme') || localStorage.getItem('restpulse_theme');
    if (legacyTheme === 'light') return 'light';
  } catch (e) {}
  return 'dark';
}
