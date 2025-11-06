import { useEffect, useState } from 'react'
import UniswapV2Interface from './components/UniswapV2Interface'

function App() {
  const [theme, setTheme] = useState('system')

  // Theme detection and application
  useEffect(() => {
    const root = window.document.documentElement

    const applyTheme = (newTheme) => {
      // Remove existing theme classes
      root.classList.remove('light', 'dark')

      if (newTheme === 'system') {
        // Use system preference
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        root.classList.add(systemTheme)
        localStorage.setItem('theme', 'system')
      } else {
        root.classList.add(newTheme)
        localStorage.setItem('theme', newTheme)
      }
    }

    // Get saved theme preference or default to system
    const savedTheme = localStorage.getItem('theme') || 'system'
    setTheme(savedTheme)
    applyTheme(savedTheme)

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e) => {
      if (theme === 'system') {
        root.classList.remove('light', 'dark')
        root.classList.add(e.matches ? 'dark' : 'light')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark'
    setTheme(newTheme)

    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    if (newTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      root.classList.add(systemTheme)
      localStorage.setItem('theme', 'system')
    } else {
      root.classList.add(newTheme)
      localStorage.setItem('theme', newTheme)
    }
  }

  return (
    <div className="relative">
      {/* Theme Toggle Button - Floating */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:shadow-xl transition-all border-2 border-gray-200 dark:border-gray-700"
        title={`Current theme: ${theme === 'system' ? 'System Default' : theme}`}
      >
        {theme === 'dark' ? (
          <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
          </svg>
        ) : theme === 'light' ? (
          <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      <UniswapV2Interface />
    </div>
  )
}

export default App
