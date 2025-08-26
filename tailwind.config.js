/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Empire theme colors
        empire: {
          gold: '#D4AF37',
          bronze: '#CD7F32',
          marble: '#F5F5DC',
          stone: '#708090',
          blood: '#8B0000',
        },
        // Game UI colors  
        resource: {
          gold: '#FFD700',
          food: '#32CD32',
          stone: '#A9A9A9',
          iron: '#696969',
          population: '#4169E1',
          influence: '#9370DB'
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounce 2s infinite',
      }
    },
  },
  plugins: [],
}