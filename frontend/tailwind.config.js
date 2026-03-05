/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    darkMode: 'class', // Enable class-based dark mode
    theme: {
        extend: {
            colors: {
                darkBg: '#0f172a',
                darkCard: '#1e293b',
                darkText: '#f8fafc',
                primary: '#3b82f6',
                secondary: '#8b5cf6'
            }
        },
    },
    plugins: [],
}
