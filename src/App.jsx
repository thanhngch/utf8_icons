import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Routes, Route, useParams, useNavigate } from 'react-router-dom'
import './App.css'

// Common Unicode blocks containing icons/symbols
const UNICODE_BLOCKS = [
  { name: 'Arrows', start: 0x2190, end: 0x21FF },
  { name: 'Mathematical Operators', start: 0x2200, end: 0x22FF },
  { name: 'Misc Technical', start: 0x2300, end: 0x23FF },
  { name: 'Box Drawing', start: 0x2500, end: 0x257F },
  { name: 'Block Elements', start: 0x2580, end: 0x259F },
  { name: 'Geometric Shapes', start: 0x25A0, end: 0x25FF },
  { name: 'Misc Symbols', start: 0x2600, end: 0x26FF },
  { name: 'Dingbats', start: 0x2700, end: 0x27BF },
  { name: 'Braille Patterns', start: 0x2800, end: 0x28FF },
  { name: 'Misc Symbols & Arrows', start: 0x2B00, end: 0x2BFF },
  { name: 'CJK Symbols', start: 0x3000, end: 0x303F },
  { name: 'Enclosed CJK', start: 0x3200, end: 0x32FF },
  { name: 'CJK Compatibility', start: 0x3300, end: 0x33FF },
  { name: 'Mahjong Tiles', start: 0x1F000, end: 0x1F02F },
  { name: 'Domino Tiles', start: 0x1F030, end: 0x1F09F },
  { name: 'Playing Cards', start: 0x1F0A0, end: 0x1F0FF },
  { name: 'Misc Symbols & Pictographs', start: 0x1F300, end: 0x1F5FF },
  { name: 'Emoticons', start: 0x1F600, end: 0x1F64F },
  { name: 'Transport & Map', start: 0x1F680, end: 0x1F6FF },
  { name: 'Supplemental Symbols', start: 0x1F900, end: 0x1F9FF },
  { name: 'Symbols Extended-A', start: 0x1FA00, end: 0x1FA6F },
  { name: 'Symbols Extended-B', start: 0x1FA70, end: 0x1FAFF },
  { name: 'Currency Symbols', start: 0x20A0, end: 0x20CF },
  { name: 'Letterlike Symbols', start: 0x2100, end: 0x214F },
  { name: 'Number Forms', start: 0x2150, end: 0x218F },
  { name: 'Musical Symbols', start: 0x1D100, end: 0x1D1FF },
  { name: 'Alchemical Symbols', start: 0x1F700, end: 0x1F77F },
]

// Remove duplicate blocks
const uniqueBlocks = UNICODE_BLOCKS.reduce((acc, block) => {
  const key = `${block.start}-${block.end}`
  if (!acc.find(b => `${b.start}-${b.end}` === key)) {
    acc.push(block)
  }
  return acc
}, [])

const COLS = 20

function blockNameToSlug(name) {
  return name.replace(/\s+/g, '_')
}

function slugToBlockIndex(slug) {
  if (!slug) return null
  return uniqueBlocks.findIndex(b => blockNameToSlug(b.name) === slug)
}

function generateIcons(block) {
  const icons = []
  for (let code = block.start; code <= block.end; code++) {
    try {
      const char = String.fromCodePoint(code)
      if (char && char.trim().length > 0) {
        icons.push({ code, char })
      }
    } catch {
      // skip invalid
    }
  }
  return icons
}

function Toast({ message, visible }) {
  return (
    <div className={`toast ${visible ? 'show' : ''}`}>
      {message}
    </div>
  )
}

function useTheme() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('icon-viewer-theme') || 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('icon-viewer-theme', theme)
  }, [theme])

  useEffect(() => {
    // Enable transitions only after first paint to prevent flash
    requestAnimationFrame(() => {
      document.body.classList.add('transitions-ready')
    })
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }, [])

  return { theme, toggleTheme }
}

function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark'
  return (
    <div className="theme-toggle" onClick={onToggle}>
      <span className="theme-toggle-label">
        {isDark ? 'Dark' : 'Light'}
      </span>
      <div className={`toggle-track ${isDark ? 'active' : ''}`}>
        <div className="toggle-thumb">
          {isDark ? '🌙' : '☀️'}
        </div>
      </div>
    </div>
  )
}

function AppContent() {
  const { blockSlug } = useParams()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [isTagsExpanded, setIsTagsExpanded] = useState(false)
  const [toast, setToast] = useState({ message: '', visible: false })
  const toastTimeout = useRef(null)
  const { theme, toggleTheme } = useTheme()

  const selectedBlock = useMemo(() => slugToBlockIndex(blockSlug), [blockSlug])

  const showToast = useCallback((msg) => {
    setToast({ message: msg, visible: true })
    if (toastTimeout.current) clearTimeout(toastTimeout.current)
    toastTimeout.current = setTimeout(() => {
      setToast(t => ({ ...t, visible: false }))
    }, 1500)
  }, [])

  const handleCellClick = useCallback((icon) => {
    const hex = icon.code.toString(16).toUpperCase().padStart(4, '0')
    navigator.clipboard.writeText(icon.char).then(() => {
      showToast(`Copied: ${icon.char} (U+${hex})`)
    }).catch(() => {})
  }, [showToast])

  const handleSelectBlock = useCallback((index) => {
    setSearch('')
    setIsTagsExpanded(false)
    if (index === null) {
      navigate('/')
    } else {
      navigate(`/${blockNameToSlug(uniqueBlocks[index].name)}`)
    }
  }, [navigate])

  const blocksToShow = useMemo(() => {
    const q = search.trim()
    if (!q) {
      if (selectedBlock !== null && selectedBlock !== -1) {
        return [uniqueBlocks[selectedBlock]]
      }
      return uniqueBlocks
    }

    const lowerQ = q.toLowerCase()

    // 1. Try to match blocks containing a character
    if (q.length === 1 || (q.length === 2 && q.codePointAt(0) > 0xFFFF)) {
      const code = q.codePointAt(0)
      return uniqueBlocks.filter(b => code >= b.start && code <= b.end)
    }

    // 2. Try to match blocks by name or hex code
    return uniqueBlocks.filter(b => {
      // 2a. Block name matches
      if (b.name.toLowerCase().includes(lowerQ)) return true
      
      // 2b. Query looks like a hex code and falls within this block
      const hexMatch = lowerQ.match(/^(?:u\+|0x)?([0-9a-f]{1,6})$/i)
      if (hexMatch) {
        const searchCode = parseInt(hexMatch[1], 16)
        // If it's a full code match
        if (searchCode >= b.start && searchCode <= b.end) return true
        
        // If it's a partial hex match (e.g. "219" matches blocks starting with 219)
        const blockStartHex = b.start.toString(16).toLowerCase()
        const blockEndHex = b.end.toString(16).toLowerCase()
        if (blockStartHex.startsWith(hexMatch[1]) || blockEndHex.startsWith(hexMatch[1])) return true
      }
      
      return false
    })
  }, [selectedBlock, search])

  const blockIcons = useMemo(() => {
    const q = search.trim()
    if (!q) {
      return blocksToShow.map(block => ({ block, icons: generateIcons(block) }))
    }

    const lowerQ = q.toLowerCase()
    const hexMatch = lowerQ.match(/^(?:u\+|0x)?([0-9a-f]{1,6})$/i)
    const searchHex = hexMatch ? hexMatch[1] : null
    const searchCode = searchHex ? parseInt(searchHex, 16) : null
    const charCode = (q.length === 1 || (q.length === 2 && q.codePointAt(0) > 0xFFFF)) ? q.codePointAt(0) : null

    return blocksToShow.map(block => {
      let icons = generateIcons(block)
      
      icons = icons.filter(icon => {
        // Match if it's the character itself
        if (charCode !== null && icon.code === charCode) return true
        
        // Match if block name matches (show all icons in that block)
        if (block.name.toLowerCase().includes(lowerQ)) return true
        
        // Match if it's an exact hex match
        if (searchCode !== null && icon.code === searchCode) return true
        
        // Match if it's a partial hex match
        const iconHex = icon.code.toString(16).toLowerCase()
        if (searchHex && iconHex.startsWith(searchHex)) return true
        
        return false
      })

      return {
        block,
        icons,
      }
    }).filter(b => b.icons.length > 0)
  }, [blocksToShow, search])

  return (
    <div className="app">
      <header className="app-header">
        <h1>UTF-8 Icon Viewer</h1>
        <p className="subtitle">Click any icon to copy it to clipboard. Full Unicode character table.</p>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      <div className="controls">
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search blocks or code... (e.g. arrow, 1F600, u+2190)"
            value={search}
            onChange={e => { setSearch(e.target.value); navigate('/') }}
          />
        </div>

        <div className={`block-tags-container ${isTagsExpanded ? 'expanded' : ''}`}>
          <div className="block-tags-header" onClick={() => setIsTagsExpanded(!isTagsExpanded)}>
            <span>Select Category</span>
            <button className="collapse-toggle">
              {isTagsExpanded ? '−' : '+'}
            </button>
          </div>
          <div className="block-tags">
            <button
              className={`tag ${selectedBlock === null || selectedBlock === -1 ? 'active' : ''}`}
              onClick={() => handleSelectBlock(null)}
            >
              All
            </button>
            {uniqueBlocks.map((block, i) => (
              <button
                key={i}
                className={`tag ${selectedBlock === i ? 'active' : ''}`}
                onClick={() => handleSelectBlock(i)}
              >
                {block.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="main-content">
        {blockIcons.map(({ block, icons }) => (
          <section key={`${block.start}-${block.end}`} className="block-section">
            <h2 className="block-title">
              {block.name}
              <span className="block-range">
                U+{block.start.toString(16).toUpperCase().padStart(4, '0')} —
                U+{block.end.toString(16).toUpperCase().padStart(4, '0')}
                ({icons.length} icons)
              </span>
            </h2>
            <div className="icon-grid" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
              {icons.map(icon => {
                const hex = icon.code.toString(16).toUpperCase().padStart(4, '0')
                return (
                  <div
                    key={icon.code}
                    className="icon-cell"
                    onClick={() => handleCellClick(icon)}
                    title={`U+${hex} — Click to copy`}
                  >
                    <span className="icon-char">{icon.char}</span>
                    <span className="icon-code">U+{hex}</span>
                  </div>
                )
              })}
            </div>
          </section>
        ))}

        {blockIcons.length === 0 && (
          <div className="no-results">
            No blocks found matching "{search}"
          </div>
        )}
      </main>

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppContent />} />
      <Route path="/:blockSlug" element={<AppContent />} />
    </Routes>
  )
}

export default App
