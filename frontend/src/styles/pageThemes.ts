/**
 * Page-specific theme configurations for SparkStage US
 * Each page has its own personality while maintaining pink brand identity
 * ALL PAGES USE LIGHT THEME - No dark backgrounds
 */

export const pageThemes = {
  onStage: {
    name: 'ON STAGE',
    personality: 'Glamorous & Spotlight',
    colors: {
      // Warmer, vibrant pinks - like stage lights
      primary: '#ff2d72', // Hot Pink
      secondary: '#ff69b4', // Hot Pink (lighter)
      accent: '#ffd700', // Gold accent
      background: {
        start: '#ffffff',
        mid: '#fff0f5', // Lavender Blush
        end: '#ffe4ec', // Light Pink
      },
    },
    gradients: {
      hero: 'linear-gradient(180deg, #ffffff 0%, #fff0f5 50%, #ffe4ec 100%)',
      button: 'linear-gradient(135deg, #ff2d72, #ff69b4)',
      accent: 'linear-gradient(135deg, #ff2d72, #ffd700)',
    },
    components: {
      button: 'px-8 py-4 bg-gradient-to-r from-pink-500 to-pink-400 text-white font-bold rounded-full shadow-lg shadow-pink-200 hover:shadow-xl hover:shadow-pink-300 hover:scale-105 transition-all duration-300',
      card: 'bg-white/80 backdrop-blur-sm border-2 border-pink-200 rounded-2xl p-6 hover:border-pink-400 hover:shadow-xl hover:shadow-pink-100 transition-all duration-300',
      heading: 'text-gray-900 font-bold',
      section: 'bg-gradient-to-b from-white via-pink-50/30 to-white',
    },
  },

  shop: {
    name: 'SHOP',
    personality: 'Clean & Professional',
    colors: {
      // Softer, trustworthy pinks - like boutique
      primary: '#ffc0cb', // Soft Pink
      secondary: '#ffb3c1', // Light Rose
      accent: '#ff69b4', // Accent Pink
      background: {
        start: '#ffffff',
        mid: '#fef7f9', // Very light pink
        end: '#ffeef3', // Pale pink
      },
    },
    gradients: {
      hero: 'linear-gradient(180deg, #ffffff 0%, #fef7f9 50%, #ffeef3 100%)',
      button: 'linear-gradient(135deg, #ff69b4, #ff85c0)',
      card: 'linear-gradient(135deg, #ffffff, #fff5f9)',
    },
    components: {
      button: 'px-6 py-3 bg-gradient-to-r from-pink-400 to-rose-400 text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:from-pink-500 hover:to-rose-500 transition-all duration-200',
      card: 'bg-white rounded-2xl shadow-sm hover:shadow-md border border-pink-100 hover:border-pink-300 transition-all duration-200 p-4',
      heading: 'text-gray-800 font-bold',
      section: 'bg-gradient-to-b from-white via-pink-50/20 to-white',
    },
  },

  events: {
    name: 'EVENTS',
    personality: 'Vibrant & Energetic',
    colors: {
      // Bright, cheerful pinks - like party
      primary: '#ff1493', // Deep Pink
      secondary: '#ff69b4', // Hot Pink
      accent: '#ff85c0', // Light Pink
      background: {
        start: '#ffffff',
        mid: '#fff0fa', // Pink tint
        end: '#ffe4f4', // Lighter magenta
      },
    },
    gradients: {
      hero: 'linear-gradient(180deg, #ffffff 0%, #fff0fa 50%, #ffe4f4 100%)',
      button: 'linear-gradient(135deg, #ff1493, #ff69b4)',
      vibrant: 'linear-gradient(135deg, #ff1493, #ff69b4, #ff85c0)',
    },
    components: {
      button: 'px-8 py-4 bg-gradient-to-r from-pink-600 via-pink-500 to-rose-500 text-white font-black rounded-full shadow-xl shadow-pink-300 hover:shadow-2xl hover:scale-105 transition-all duration-300',
      card: 'bg-gradient-to-br from-white to-pink-50 border-2 border-pink-300 rounded-3xl p-6 hover:border-pink-500 hover:shadow-2xl hover:shadow-pink-200 hover:-translate-y-1 transition-all duration-300',
      heading: 'text-gray-900 font-black',
      section: 'bg-gradient-to-b from-white via-pink-50/50 to-pink-100/20',
    },
  },

  news: {
    name: 'NEWS',
    personality: 'Editorial & Elegant',
    colors: {
      // Muted, sophisticated pinks - like magazine
      primary: '#d8a7b1', // Dusty Rose
      secondary: '#e6b8c2', // Blush
      accent: '#c48793', // Mauve
      background: {
        start: '#ffffff',
        mid: '#fffbfc', // Nearly white with hint of pink
        end: '#fff5f7', // Very subtle pink
      },
    },
    gradients: {
      hero: 'linear-gradient(180deg, #ffffff 0%, #fffbfc 50%, #fff5f7 100%)',
      button: 'linear-gradient(135deg, #d8a7b1, #c48793)',
      subtle: 'linear-gradient(135deg, #ffffff, #fff5f7)',
    },
    components: {
      button: 'px-6 py-3 border-2 border-rose-300 text-rose-600 font-semibold rounded-lg hover:bg-rose-50 hover:border-rose-400 transition-all duration-200',
      card: 'bg-white rounded-xl shadow-sm border-l-4 border-rose-200 p-6 hover:border-rose-400 hover:shadow-lg transition-all duration-300',
      heading: 'text-gray-900 font-serif font-bold',
      section: 'bg-gradient-to-b from-white via-rose-50/10 to-white',
    },
  },
} as const;

export type PageTheme = keyof typeof pageThemes;

// Utility function to get theme
export const getPageTheme = (page: PageTheme) => pageThemes[page];

// Tailwind classes generator for quick application
export const getThemeClasses = (page: PageTheme) => {
  const theme = pageThemes[page];
  
  return {
    // Background gradients per page (ALL LIGHT)
    bgGradient: {
      onStage: 'bg-gradient-to-b from-white via-pink-50/30 to-white',
      shop: 'bg-gradient-to-b from-white via-pink-50/20 to-white',
      events: 'bg-gradient-to-b from-white via-pink-50/50 to-pink-100/20',
      news: 'bg-gradient-to-b from-white via-rose-50/10 to-white',
    }[page],
    
    // Section backgrounds
    sectionBg: theme.components.section,
    
    // Text colors (ALL DARK for readability)
    textPrimary: 'text-gray-900',
    textSecondary: 'text-gray-600',
    textAccent: {
      onStage: 'text-pink-600',
      shop: 'text-pink-500',
      events: 'text-pink-700',
      news: 'text-rose-600',
    }[page],
    
    // Component classes
    button: theme.components.button,
    card: theme.components.card,
    heading: theme.components.heading,
  };
};
