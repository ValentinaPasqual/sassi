/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx,html}',
    './*.{html,js}',
  ],
  theme: {
    extend: {
      colors: {
        // PRIMARY COLOR
        primary: {
                "50": "#a2a2a2",
                "100": "#909090",
                "200": "#767676",
                "300": "#5d5d5d",
                "400": "#434343",
                "500": "#2f2f2f",
                "600": "#595959",
                "700": "#2f2f2f",
                "800": "#404040",
                "900": "#262626"
        },
        
        // SECONDARY COLOR
        secondary: {
                "50": "#d8dee4",
                "100": "#c2ccd6",
                "200": "#a1b2c4",
                "300": "#7e99b4",
                "400": "#5c7fa2",
                "500": "#4c6b8a",
                "600": "#3e5974",
                "700": "#4c6b8a",
                "800": "#2b4054",
                "900": "#1d2b3a"
        },
        
        // ACCENT COLOR
        accent: {
                "50": "#f3f3f1",
                "100": "#e8e7e3",
                "200": "#d7d3cb",
                "300": "#bdb7a8",
                "400": "#a49a84",
                "500": "#dcd8cf",
                "600": "#cbc5b7",
                "700": "#dcd8cf",
                "800": "#b7ad99",
                "900": "#a99d83"
        }
      },
      
      // CUSTOM FONTS
      fontFamily: {
        'headings': ['Montserrat', 'ui-serif', 'Georgia'],
        'body': ['Poppins', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
};