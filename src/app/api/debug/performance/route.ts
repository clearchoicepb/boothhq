/**
 * Performance Monitoring API Endpoint
 *
 * Provides comprehensive metrics for production monitoring:
 * - DataSourceManager cache performance
 * - Connection pool utilization
 * - System health indicators
 * - Performance recommendations
 *
 * Usage: GET /api/debug/performance
 *
 * Authentication: Requires valid session with admin role (optional check)
 *
 * Response includes:
 * - Cache hit rates and statistics
 * - Connection pool usage
 * - Memory usage (Node.js)
 * - Performance scores
 * - Health status
 * - Recommendations for optimization
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dataSourceManager } from '@/lib/data-sources';

/**
 * Calculate health status based on metrics
 */
function calculateHealthStatus(stats: any): {
  status: 'healthy' | 'warning' | 'critical';
  score: number;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let score = 100;

  // Check cache hit rate
  if (stats.cacheHitRate < 50) {
    score -= 20;
    issues.push('Low cache hit rate');
    recommendations.push('Cache hit rate below 50%. Consider increasing cache TTL or investigating cache invalidation patterns.');
  } else if (stats.cacheHitRate < 70) {
    score -= 10;
    issues.push('Moderate cache hit rate');
    recommendations.push('Cache hit rate below 70%. Monitor for potential optimization opportunities.');
  }

  // Check pool utilization
  if (stats.poolUtilization > 90) {
    score -= 30;
    issues.push('Connection pool near exhaustion');
    recommendations.push(`Pool utilization at ${stats.poolUtilization.toFixed(1)}%. Consider increasing DATA_SOURCE_MAX_CLIENTS.`);
  } else if (stats.poolUtilization > 75) {
    score -= 15;
    issues.push('High connection pool usage');
    recommendations.push(`Pool utilization at ${stats.poolUtilization.toFixed(1)}%. Monitor closely and consider scaling.`);
  }

  // Check if pool has been exhausted
  if (stats.poolExhaustedCount > 0) {
    score -= 25;
    issues.push(`Connection pool exhausted ${stats.poolExhaustedCount} times`);
    recommendations.push('Increase maxClients or optimize query patterns to reduce concurrent connections.');
  }

  // Check for cache misses
  if (stats.cacheMisses > stats.cacheHits * 2) {
    score -= 10;
    issues.push('High cache miss ratio');
    recommendations.push('Cache misses exceed hits by 2x. Review caching strategy.');
  }

  // Determine status
  let status: 'healthy' | 'warning' | 'critical';
  if (score >= 80) {
    status = 'healthy';
  } else if (score >= 60) {
    status = 'warning';
  } else {
    status = 'critical';
  }

  return { status, score, issues, recommendations };
}

/**
 * Get memory usage statistics
 */
function getMemoryStats() {
  const used = process.memoryUsage();
  return {
    rss: {
      bytes: used.rss,
      mb: Math.round(used.rss / 1024 / 1024 * 100) / 100,
      description: 'Resident Set Size - total memory allocated'
    },
    heapTotal: {
      bytes: used.heapTotal,
      mb: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100,
      description: 'Total heap allocated'
    },
    heapUsed: {
      bytes: used.heapUsed,
      mb: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100,
      description: 'Actual heap used'
    },
    external: {
      bytes: used.external,
      mb: Math.round(used.external / 1024 / 1024 * 100) / 100,
      description: 'C++ objects bound to JavaScript'
    },
    arrayBuffers: {
      bytes: used.arrayBuffers,
      mb: Math.round(used.arrayBuffers / 1024 / 1024 * 100) / 100,
      description: 'Memory allocated for ArrayBuffers and SharedArrayBuffers'
    },
    heapUsagePercent: Math.round((used.heapUsed / used.heapTotal) * 100)
  };
}

/**
 * Get system uptime
 */
function getUptimeStats() {
  const uptimeSeconds = process.uptime();
  const uptimeHours = Math.floor(uptimeSeconds / 3600);
  const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);

  return {
    seconds: Math.round(uptimeSeconds),
    formatted: `${uptimeHours}h ${uptimeMinutes}m`,
    since: new Date(Date.now() - uptimeSeconds * 1000).toISOString()
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Authentication check
    if (!session?.user?.tenantId) {
      return NextResponse.json({
        error: 'Unauthorized',
        message: 'Authentication required to access performance metrics'
      }, { status: 401 });
    }

    const tenantId = dataSourceTenantId;

    // Get DataSourceManager statistics
    const cacheStats = dataSourceManager.getCacheStats();
    const poolConfig = dataSourceManager.getPoolConfig();

    // Calculate health metrics
    const health = calculateHealthStatus(cacheStats);

    // Get memory statistics
    const memory = getMemoryStats();

    // Get uptime
    const uptime = getUptimeStats();

    // Calculate performance scores
    const performanceScores = {
      caching: {
        score: Math.min(100, cacheStats.cacheHitRate),
        grade: cacheStats.cacheHitRate >= 80 ? 'A' :
               cacheStats.cacheHitRate >= 70 ? 'B' :
               cacheStats.cacheHitRate >= 60 ? 'C' :
               cacheStats.cacheHitRate >= 50 ? 'D' : 'F',
        description: 'Cache efficiency'
      },
      pooling: {
        score: Math.max(0, 100 - cacheStats.poolUtilization),
        grade: cacheStats.poolUtilization < 50 ? 'A' :
               cacheStats.poolUtilization < 70 ? 'B' :
               cacheStats.poolUtilization < 85 ? 'C' :
               cacheStats.poolUtilization < 95 ? 'D' : 'F',
        description: 'Connection pool availability'
      },
      memory: {
        score: Math.max(0, 100 - memory.heapUsagePercent),
        grade: memory.heapUsagePercent < 50 ? 'A' :
               memory.heapUsagePercent < 70 ? 'B' :
               memory.heapUsagePercent < 85 ? 'C' :
               memory.heapUsagePercent < 95 ? 'D' : 'F',
        description: 'Memory efficiency'
      },
      overall: {
        score: health.score,
        grade: health.score >= 90 ? 'A' :
               health.score >= 80 ? 'B' :
               health.score >= 70 ? 'C' :
               health.score >= 60 ? 'D' : 'F',
        description: 'Overall system health'
      }
    };

    // Build response
    const response = {
      status: 'success',
      timestamp: new Date().toISOString(),
      tenant: {
        id: tenantId,
        name: session.user.tenantName,
        user: session.user.email
      },
      health: {
        status: health.status,
        score: health.score,
        issues: health.issues,
        recommendations: health.recommendations
      },
      performance: {
        scores: performanceScores,
        summary: `Overall Grade: ${performanceScores.overall.grade} (${performanceScores.overall.score}/100)`
      },
      dataSourceManager: {
        cache: {
          config: {
            size: cacheStats.configCacheSize,
            description: 'Number of tenant configs cached in memory'
          },
          clients: {
            size: cacheStats.clientCacheSize,
            description: 'Number of Supabase clients cached'
          },
          hits: {
            count: cacheStats.cacheHits,
            description: 'Cache hits (returned from cache)'
          },
          misses: {
            count: cacheStats.cacheMisses,
            description: 'Cache misses (fetched from database)'
          },
          hitRate: {
            percent: cacheStats.cacheHitRate,
            formatted: `${cacheStats.cacheHitRate.toFixed(2)}%`,
            description: 'Percentage of requests served from cache'
          },
          efficiency: cacheStats.cacheHitRate >= 70 ? 'excellent' :
                      cacheStats.cacheHitRate >= 50 ? 'good' :
                      cacheStats.cacheHitRate >= 30 ? 'fair' : 'poor'
        },
        connectionPool: {
          active: cacheStats.clientCacheSize,
          max: cacheStats.maxClients,
          utilization: {
            percent: cacheStats.poolUtilization,
            formatted: `${cacheStats.poolUtilization.toFixed(2)}%`
          },
          available: cacheStats.maxClients - cacheStats.clientCacheSize,
          totalCreated: cacheStats.totalClientsCreated,
          exhaustedCount: cacheStats.poolExhaustedCount,
          status: cacheStats.poolUtilization < 75 ? 'healthy' :
                  cacheStats.poolUtilization < 90 ? 'warning' : 'critical'
        },
        configuration: {
          maxClients: poolConfig.maxClients,
          metricsEnabled: poolConfig.enableMetrics,
          nextjsCacheEnabled: poolConfig.useNextjsCache,
          configCacheTTL: poolConfig.configCacheTTL,
          clientCacheTTL: poolConfig.clientCacheTTL,
          cacheCleanupInterval: poolConfig.cacheCleanupInterval,
          environment: {
            DATA_SOURCE_MAX_CLIENTS: process.env.DATA_SOURCE_MAX_CLIENTS || 'default (50)',
            DATA_SOURCE_ENABLE_METRICS: process.env.DATA_SOURCE_ENABLE_METRICS || 'default (true)',
            DATA_SOURCE_USE_NEXTJS_CACHE: process.env.DATA_SOURCE_USE_NEXTJS_CACHE || 'default (true)',
            DATA_SOURCE_CONFIG_CACHE_TTL: process.env.DATA_SOURCE_CONFIG_CACHE_TTL || 'default (300000 ms / 5 min)',
            DATA_SOURCE_CLIENT_CACHE_TTL: process.env.DATA_SOURCE_CLIENT_CACHE_TTL || 'default (3600000 ms / 1 hour)',
            DATA_SOURCE_CACHE_CLEANUP_INTERVAL: process.env.DATA_SOURCE_CACHE_CLEANUP_INTERVAL || 'default (600000 ms / 10 min)'
          }
        }
      },
      system: {
        memory,
        uptime,
        node: {
          version: process.version,
          platform: process.platform,
          arch: process.arch
        },
        environment: process.env.NODE_ENV
      },
      metrics: {
        summary: {
          cacheHitRate: `${cacheStats.cacheHitRate.toFixed(2)}%`,
          poolUtilization: `${cacheStats.poolUtilization.toFixed(2)}%`,
          memoryUsage: `${memory.heapUsagePercent}%`,
          uptime: uptime.formatted
        },
        alerts: health.issues.length > 0 ? health.issues : ['No issues detected'],
        recommendations: health.recommendations.length > 0 ? health.recommendations : ['System performing optimally']
      }
    };

    // Add cache headers to prevent this endpoint from being cached
    const headers = new Headers();
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');

    return NextResponse.json(response, { headers });

  } catch (error: any) {
    console.error('[Performance API] Error:', error);

    return NextResponse.json({
      status: 'error',
      error: 'Failed to retrieve performance metrics',
      message: error.message,
      timestamp: new Date().toISOString(),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

/**
 * Reset metrics (POST endpoint for admin use)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Optional: Add admin role check here
    // if (session.user.role !== 'admin') { ... }

    // Reset metrics
    dataSourceManager.resetMetrics();

    return NextResponse.json({
      status: 'success',
      message: 'Metrics reset successfully',
      timestamp: new Date().toISOString(),
      resetBy: session.user.email
    });

  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to reset metrics',
      message: error.message
    }, { status: 500 });
  }
}
