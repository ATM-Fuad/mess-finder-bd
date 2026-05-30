/** @type {import('tailwindcss').Config} */
module.exports = {
  // "class" means dark mode is ONLY activated by the .dark class
  // on <html> — never by the OS media query.
  // This is what makes our toggle work correctly.
  darkMode: "class",
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
