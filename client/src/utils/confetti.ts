// Simple confetti celebration without external dependencies
export const celebrate = (count?: number) => {
  const duration = 3000
  const animationEnd = Date.now() + duration
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 }

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min
  }

  // Create confetti elements
  const colors = ['#14b8a6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
  
  const confettiCount = 50
  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div')
    confetti.style.position = 'fixed'
    confetti.style.width = '10px'
    confetti.style.height = '10px'
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]
    confetti.style.left = '50%'
    confetti.style.top = '50%'
    confetti.style.opacity = '1'
    confetti.style.zIndex = '9999'
    confetti.style.pointerEvents = 'none'
    confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0'
    
    document.body.appendChild(confetti)
    
    const angle = randomInRange(0, 360)
    const velocity = randomInRange(15, 25)
    const drift = randomInRange(-1, 1)
    
    const animation = confetti.animate([
      {
        transform: 'translate(-50%, -50%) rotate(0deg)',
        opacity: 1
      },
      {
        transform: `translate(calc(-50% + ${Math.cos(angle * Math.PI / 180) * velocity * 10}px), calc(-50% + ${Math.sin(angle * Math.PI / 180) * velocity * 10}px)) rotate(${drift * 720}deg)`,
        opacity: 0
      }
    ], {
      duration: duration,
      easing: 'cubic-bezier(0, .9, .57, 1)'
    })
    
    animation.onfinish = () => {
      confetti.remove()
    }
  }

  // Show milestone message if count is provided
  if (count && [1, 5, 10, 25, 50, 100].includes(count)) {
    return getMilestoneMessage(count)
  }
  
  return null
}

function getMilestoneMessage(count: number): string {
  const messages: Record<number, string> = {
    1: '🎉 Your first saved job! Great start!',
    5: '🔥 5 jobs saved! You\'re on a roll!',
    10: '⭐ 10 jobs saved! Keep going!',
    25: '🚀 25 jobs saved! You\'re crushing it!',
    50: '💎 50 jobs saved! Halfway to 100!',
    100: '🏆 100 jobs saved! You\'re unstoppable!'
  }
  return messages[count] || ''
}

export const getMilestone = (count: number): number | null => {
  const milestones = [1, 5, 10, 25, 50, 100]
  return milestones.includes(count) ? count : null
}

