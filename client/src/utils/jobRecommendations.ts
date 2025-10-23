interface Job {
  title: string
  company: string
  location?: string
  type?: string
  description?: string
}

// Extract keywords from text
function extractKeywords(text: string): string[] {
  const commonWords = new Set([
    'the', 'is', 'at', 'which', 'on', 'a', 'an', 'as', 'are', 'was', 'were', 
    'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 
    'should', 'could', 'may', 'might', 'can', 'of', 'for', 'and', 'or', 'but',
    'in', 'to', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during'
  ])

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !commonWords.has(word))
}

// Calculate similarity between two jobs
function calculateSimilarity(job1: Job, job2: Job): number {
  let score = 0

  // Title similarity (most important)
  const title1Keywords = extractKeywords(job1.title)
  const title2Keywords = extractKeywords(job2.title)
  const titleOverlap = title1Keywords.filter(k => title2Keywords.includes(k)).length
  score += titleOverlap * 5

  // Location similarity
  if (job1.location && job2.location && 
      job1.location.toLowerCase().includes(job2.location.toLowerCase())) {
    score += 3
  }

  // Job type similarity
  if (job1.type && job2.type && 
      job1.type.toLowerCase() === job2.type.toLowerCase()) {
    score += 2
  }

  // Description similarity (if available)
  if (job1.description && job2.description) {
    const desc1Keywords = extractKeywords(job1.description.slice(0, 500))
    const desc2Keywords = extractKeywords(job2.description.slice(0, 500))
    const descOverlap = desc1Keywords.filter(k => desc2Keywords.includes(k)).length
    score += Math.min(descOverlap, 10) // Cap at 10 points
  }

  return score
}

// Get job recommendations based on user's activity
export function getJobRecommendations(
  allJobs: Job[],
  savedJobs: Job[],
  viewedJobs: Job[],
  limit: number = 10
): Job[] {
  // Combine saved and viewed jobs with weights
  const activityJobs = [
    ...savedJobs.map(j => ({ job: j, weight: 2 })), // Saved jobs weighted more
    ...viewedJobs.map(j => ({ job: j, weight: 1 }))
  ]

  if (activityJobs.length === 0) {
    // No activity, return random jobs
    return allJobs.slice(0, limit)
  }

  // Calculate score for each job
  const scoredJobs = allJobs.map(job => {
    let totalScore = 0
    
    activityJobs.forEach(({ job: activityJob, weight }) => {
      const similarity = calculateSimilarity(job, activityJob)
      totalScore += similarity * weight
    })

    return {
      job,
      score: totalScore
    }
  })

  // Sort by score and return top jobs
  return scoredJobs
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.job)
}

// Get personalized search suggestions
export function getSearchSuggestions(
  savedJobs: Job[],
  viewedJobs: Job[]
): string[] {
  const allJobs = [...savedJobs, ...viewedJobs]
  
  if (allJobs.length === 0) return []

  // Extract common keywords from titles
  const allKeywords = allJobs.flatMap(job => extractKeywords(job.title))
  
  // Count keyword frequency
  const keywordCounts: Record<string, number> = {}
  allKeywords.forEach(keyword => {
    keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1
  })

  // Get top keywords
  return Object.entries(keywordCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([keyword]) => keyword)
}

