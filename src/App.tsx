import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { useQueryState, parseAsString } from 'nuqs'

const WIDTH = 40
const ENEMY = '⛄'
const BULLET = '-'
const EXPLOSION = '💥'
const EMPTY = '_'

type Cell = typeof ENEMY | typeof BULLET | typeof EXPLOSION | typeof EMPTY

function createEmptyLine(): Cell[] {
  return Array<Cell>(WIDTH).fill(EMPTY)
}

function App() {
  const [lineStr, setLineStr] = useQueryState(
    'line',
    parseAsString.withDefault(createEmptyLine().join('')),
  )
  const line = useMemo<Cell[]>(() => lineStr.split('') as Cell[], [lineStr])
  const [score, setScore] = useState(0)
  const [misses, setMisses] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [canShoot, setCanShoot] = useState(true)

  // milliseconds between shots
  const SHOOT_COOLDOWN = 250

  const resetGame = () => {
    setLineStr(createEmptyLine().join(''))
    setScore(0)
    setMisses(0)
    setGameOver(false)
    setCanShoot(true)
  }

  const tick = () => {
    setLineStr(prevStr => {
      const prev = prevStr.slice(0, WIDTH).padEnd(WIDTH, EMPTY).split('') as Cell[]
      const next = createEmptyLine()

      // First pass: resolve bullet/enemy collisions
      const hasEnemyAt: boolean[] = Array(WIDTH).fill(false)
      const hasBulletAt: boolean[] = Array(WIDTH).fill(false)

      for (let i = 0; i < WIDTH; i++) {
        if (prev[i] === ENEMY) hasEnemyAt[i] = true
        if (prev[i] === BULLET) hasBulletAt[i] = true
      }

      // Handle movement and collisions
      for (let i = 0; i < WIDTH; i++) {
        const cell = prev[i]

        // Short life for explosions – they disappear next frame
        if (cell === EXPLOSION) {
          continue
        }

        if (cell === BULLET) {
          const target = i + 1
          if (target >= WIDTH) {
            // bullet leaves the screen
            continue
          }

          if (hasEnemyAt[target]) {
            // collision!
            next[target] = EXPLOSION
            setScore(s => s + 1)
          } else {
            // move bullet forward if nothing else there
            if (next[target] === EMPTY) {
              next[target] = BULLET
            }
          }
        } else if (cell === ENEMY) {
          const target = i - 1

          if (target < 0) {
            // enemy reached the base
            setMisses(m => m + 1)
            continue
          }

          // if a bullet is coming into this cell from the left, let bullet handle explosion to avoid double-processing
          if (hasBulletAt[target]) {
            continue
          }

          if (next[target] === EMPTY) {
            next[target] = ENEMY
          }
        }
      }

      return next.join('')
    })
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && !gameOver && canShoot) {
        // fire bullet from the left if there's free space
        setLineStr(prevStr => {
          const arr = prevStr.slice(0, WIDTH).padEnd(WIDTH, EMPTY).split('') as Cell[]
          const next = [...arr]
          if (next[0] === EMPTY) {
            next[0] = BULLET
          }
          return next.join('')
        })

        // start cooldown
        setCanShoot(false)
        window.setTimeout(() => {
          setCanShoot(true)
        }, SHOOT_COOLDOWN)
      }

      if ((e.key === 'r' || e.key === 'R') && gameOver) {
        resetGame()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [gameOver, canShoot])

  useEffect(() => {
    if (gameOver) return

    const id = window.setInterval(() => {
      tick()

      // randomly spawn enemies on the right (lower chance than before)
      if (Math.random() < 0.12) {
        setLineStr(prevStr => {
          const arr = prevStr.slice(0, WIDTH).padEnd(WIDTH, EMPTY).split('') as Cell[]
          const next = [...arr]
          if (next[WIDTH - 1] === EMPTY) {
            next[WIDTH - 1] = ENEMY
          }
          return next.join('')
        })
      }
    }, 180)

    return () => {
      window.clearInterval(id)
    }
  }, [gameOver])

  useEffect(() => {
    if (misses >= 5) {
      setGameOver(true)
    }
  }, [misses])

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h1>ASCII Snowman Defense</h1>

      <div style={{ display: 'flex', gap: '1.5rem', fontSize: '1rem' }}>
        <span>
          <strong>Score:</strong> {score}
        </span>
        <span>
          <strong>Misses:</strong> {misses} / 5
        </span>
      </div>

      <p style={{ fontFamily: 'monospace', fontSize: '1.6rem', margin: 0 }}>
        {line.map((cell, i) => (
          <span key={i}>{cell}</span>
        ))}
      </p>

      <div style={{ textAlign: 'center', fontSize: '0.9rem' }}>
        <p>
          <strong>Controls:</strong> press <code>Space</code> to shoot,{' '}
          <code>R</code> to restart when the game is over.
        </p>
        <p>
          Stop the {ENEMY} before they reach the left side. Miss 5 and it&apos;s game over.
        </p>
        {gameOver && (
          <p style={{ color: '#ff4d4f', fontWeight: 600 }}>
            Game over! Press <code>R</code> to play again.
          </p>
        )}
      </div>
    </main>
  )
}

export default App
