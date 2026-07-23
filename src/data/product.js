// Single source of truth for the v1.0.0 feature surface referenced across the site.
// Chains mirror hawki/core/chain_config.py exactly: seven EVM mainnets + Sepolia + local.

export const MAINNETS = [
  'Ethereum',
  'Polygon',
  'Arbitrum',
  'Optimism',
  'Base',
  'BNB Chain',
  'Avalanche',
]

export const TESTNETS = ['Sepolia', 'Local']

export const ALL_CHAINS = [...MAINNETS, ...TESTNETS]

// Command modules that make up the v1.0.0 toolkit.
export const MODULES = [
  'scan',
  'deep',
  'verify',
  'deps',
  'upgrade',
  'prove',
  'report',
  'registry',
  'doctor',
  'export',
]
