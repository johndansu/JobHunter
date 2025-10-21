import { randomBytes } from 'crypto'

interface ProxyConfig {
  host: string
  port: number
  username?: string
  password?: string
  country?: string
  protocol: 'http' | 'https' | 'socks4' | 'socks5'
}

interface ProxyPool {
  proxies: ProxyConfig[]
  currentIndex: number
  rotationStrategy: 'round-robin' | 'random' | 'sticky'
}

class ProxyService {
  private proxyPools: Map<string, ProxyPool> = new Map()
  
  // Mock proxy pool for demonstration - in production, this would connect to real proxy providers
  private mockProxies: ProxyConfig[] = [
    {
      host: 'proxy1.scrapepro.com',
      port: 8080,
      username: 'user1',
      password: 'pass1',
      country: 'US',
      protocol: 'http'
    },
    {
      host: 'proxy2.scrapepro.com',
      port: 8080,
      username: 'user2',
      password: 'pass2',
      country: 'UK',
      protocol: 'http'
    },
    {
      host: 'proxy3.scrapepro.com',
      port: 8080,
      username: 'user3',
      password: 'pass3',
      country: 'DE',
      protocol: 'http'
    },
    {
      host: 'proxy4.scrapepro.com',
      port: 8080,
      username: 'user4',
      password: 'pass4',
      country: 'CA',
      protocol: 'http'
    },
    {
      host: 'proxy5.scrapepro.com',
      port: 8080,
      username: 'user5',
      password: 'pass5',
      country: 'AU',
      protocol: 'http'
    }
  ]

  constructor() {
    this.initializeDefaultPools()
  }

  private initializeDefaultPools() {
    // Default pool for all users
    this.proxyPools.set('default', {
      proxies: this.mockProxies,
      currentIndex: 0,
      rotationStrategy: 'round-robin'
    })

    // Premium pool with more proxies
    const premiumProxies: ProxyConfig[] = [
      ...this.mockProxies,
      {
        host: 'premium1.scrapepro.com',
        port: 8080,
        username: 'premium1',
        password: 'premium1',
        country: 'US',
        protocol: 'http' as const
      },
      {
        host: 'premium2.scrapepro.com',
        port: 8080,
        username: 'premium2',
        password: 'premium2',
        country: 'UK',
        protocol: 'http' as const
      }
    ]
    
    this.proxyPools.set('premium', {
      proxies: premiumProxies,
      currentIndex: 0,
      rotationStrategy: 'random'
    })
  }

  /**
   * Get next proxy from pool based on rotation strategy
   */
  getNextProxy(poolName: string = 'default'): ProxyConfig | null {
    const pool = this.proxyPools.get(poolName)
    if (!pool || pool.proxies.length === 0) {
      return null
    }

    let selectedIndex: number

    switch (pool.rotationStrategy) {
      case 'round-robin':
        selectedIndex = pool.currentIndex
        pool.currentIndex = (pool.currentIndex + 1) % pool.proxies.length
        break
      
      case 'random':
        selectedIndex = Math.floor(Math.random() * pool.proxies.length)
        break
      
      case 'sticky':
        // For sticky, we could use a hash of the URL or session ID
        selectedIndex = pool.currentIndex
        break
      
      default:
        selectedIndex = 0
    }

    return pool.proxies[selectedIndex]
  }

  /**
   * Get proxy configuration for Puppeteer
   */
  getProxyConfigForPuppeteer(poolName: string = 'default'): any {
    const proxy = this.getNextProxy(poolName)
    if (!proxy) {
      return {}
    }

    return {
      server: `${proxy.protocol}://${proxy.host}:${proxy.port}`,
      username: proxy.username,
      password: proxy.password
    }
  }

  /**
   * Get proxy URL for requests
   */
  getProxyUrl(poolName: string = 'default'): string | null {
    const proxy = this.getNextProxy(poolName)
    if (!proxy) {
      return null
    }

    if (proxy.username && proxy.password) {
      return `${proxy.protocol}://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`
    }
    
    return `${proxy.protocol}://${proxy.host}:${proxy.port}`
  }

  /**
   * Create custom proxy pool
   */
  createProxyPool(name: string, proxies: ProxyConfig[], strategy: 'round-robin' | 'random' | 'sticky' = 'round-robin') {
    this.proxyPools.set(name, {
      proxies,
      currentIndex: 0,
      rotationStrategy: strategy
    })
  }

  /**
   * Get pool statistics
   */
  getPoolStats(poolName: string = 'default') {
    const pool = this.proxyPools.get(poolName)
    if (!pool) {
      return null
    }

    return {
      name: poolName,
      totalProxies: pool.proxies.length,
      currentIndex: pool.currentIndex,
      rotationStrategy: pool.rotationStrategy,
      countries: [...new Set(pool.proxies.map(p => p.country))].filter(Boolean)
    }
  }

  /**
   * Get all available pools
   */
  getAllPools() {
    return Array.from(this.proxyPools.keys()).map(name => this.getPoolStats(name)).filter(Boolean)
  }

  /**
   * Test proxy connectivity
   */
  async testProxy(proxy: ProxyConfig): Promise<boolean> {
    // In a real implementation, this would test the proxy by making a test request
    // For now, we'll simulate a 90% success rate
    return Math.random() > 0.1
  }

  /**
   * Get healthy proxies from pool
   */
  async getHealthyProxies(poolName: string = 'default'): Promise<ProxyConfig[]> {
    const pool = this.proxyPools.get(poolName)
    if (!pool) {
      return []
    }

    const healthyProxies: ProxyConfig[] = []
    
    for (const proxy of pool.proxies) {
      const isHealthy = await this.testProxy(proxy)
      if (isHealthy) {
        healthyProxies.push(proxy)
      }
    }

    return healthyProxies
  }

  /**
   * Rotate proxy for specific job (for sticky strategy)
   */
  rotateProxyForJob(jobId: string, poolName: string = 'default'): ProxyConfig | null {
    const pool = this.proxyPools.get(poolName)
    if (!pool || pool.proxies.length === 0) {
      return null
    }

    // Use job ID hash to determine proxy for sticky strategy
    const hash = this.hashString(jobId)
    const index = hash % pool.proxies.length
    
    return pool.proxies[index]
  }

  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }
}

export const proxyService = new ProxyService()
export type { ProxyConfig, ProxyPool }
