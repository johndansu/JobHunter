/**
 * Strip HTML tags from a string
 */
export function stripHtml(html: string): string {
  if (!html) return ''
  
  // Create a temporary div element
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  
  // Get text content (automatically strips HTML)
  return tmp.textContent || tmp.innerText || ''
}

/**
 * Truncate text to a maximum length
 */
export function truncate(text: string, maxLength: number): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

/**
 * Clean and truncate HTML content
 */
export function cleanDescription(description: string, maxLength: number = 300): string {
  if (!description) return ''
  const cleaned = stripHtml(description)
  return truncate(cleaned, maxLength)
}

