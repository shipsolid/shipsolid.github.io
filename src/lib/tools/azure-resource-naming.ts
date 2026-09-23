// Pure Azure resource-name generator following the Cloud Adoption Framework abbreviation +
// component conventions. No DOM, no localStorage.

export type NamingSegment = 'type' | 'workload' | 'environment' | 'region' | 'instance';

export interface NamingConfig {
  resourceType: string;
  workload: string;
  environment: string;
  region: string;
  instance?: string;
  delimiter?: string;
  order?: NamingSegment[];
}

export interface NamingResult {
  name: string;
  warnings: string[];
}

// CAF abbreviations — keyed by the lowercased human name.
export const AZURE_ABBREVIATIONS: Record<string, string> = {
  'resource group': 'rg',
  'virtual network': 'vnet',
  subnet: 'snet',
  'network security group': 'nsg',
  'public ip': 'pip',
  'load balancer': 'lb',
  'application gateway': 'agw',
  'virtual machine': 'vm',
  'aks cluster': 'aks',
  'kubernetes service': 'aks',
  'container registry': 'cr',
  'container app': 'ca',
  'container apps environment': 'cae',
  'function app': 'func',
  'app service': 'app',
  'web app': 'app',
  'app service plan': 'plan',
  'storage account': 'st',
  'key vault': 'kv',
  'cosmos db': 'cosmos',
  'sql server': 'sql',
  'sql database': 'sqldb',
  'service bus': 'sb',
  'event hub': 'evh',
  'event grid': 'evg',
  'log analytics workspace': 'log',
  'application insights': 'appi',
  'data factory': 'adf',
  'api management': 'apim',
  'redis cache': 'redis',
  'managed identity': 'id',
};

export const AZURE_REGION_SHORTCODES: Record<string, string> = {
  centralindia: 'cin',
  southindia: 'sin',
  westindia: 'win',
  eastus: 'eus',
  eastus2: 'eus2',
  westus: 'wus',
  westus2: 'wus2',
  westus3: 'wus3',
  centralus: 'cus',
  northeurope: 'neu',
  westeurope: 'weu',
  uksouth: 'uks',
  ukwest: 'ukw',
  southeastasia: 'sea',
  eastasia: 'ea',
  australiaeast: 'aue',
  japaneast: 'jpe',
  canadacentral: 'cac',
  brazilsouth: 'brs',
};

interface TypeRule {
  minLen: number;
  maxLen: number;
  allowDash: boolean;
  note: string;
}

// Rules keyed by CAF abbreviation. Only the ones with real naming constraints are listed.
const TYPE_RULES: Record<string, TypeRule> = {
  st: { minLen: 3, maxLen: 24, allowDash: false, note: 'Storage account names are 3–24 chars, lowercase letters and digits only.' },
  cr: { minLen: 5, maxLen: 50, allowDash: false, note: 'Container registry names are 5–50 chars, alphanumeric only.' },
  kv: { minLen: 3, maxLen: 24, allowDash: true, note: 'Key Vault names are 3–24 chars, alphanumeric and dashes, no leading/trailing dash.' },
};

function slug(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '');
}

export function validateName(resourceType: string, name: string): string[] {
  const abbr = AZURE_ABBREVIATIONS[resourceType.toLowerCase().trim()] ?? slug(resourceType);
  const rule = TYPE_RULES[abbr];
  const warnings: string[] = [];
  if (!rule) return warnings;

  if (name.length < rule.minLen) warnings.push(`Name is shorter than the ${rule.minLen}-char minimum for this type.`);
  if (name.length > rule.maxLen) warnings.push(`Name exceeds the ${rule.maxLen}-char maximum for this type.`);
  if (!rule.allowDash && /-/.test(name)) warnings.push('This resource type does not allow dashes — they were stripped.');
  if (rule.allowDash && (/^-/.test(name) || /-$/.test(name) || /--/.test(name))) {
    warnings.push('This resource type does not allow a leading/trailing or doubled dash.');
  }
  if (warnings.length > 0) warnings.push(rule.note);
  return warnings;
}

export function buildResourceName(config: NamingConfig): NamingResult {
  const warnings: string[] = [];
  const delimiter = config.delimiter ?? '-';
  const order: NamingSegment[] = config.order ?? ['type', 'workload', 'environment', 'region', 'instance'];

  const typeKey = config.resourceType.toLowerCase().trim();
  let typeAbbr = AZURE_ABBREVIATIONS[typeKey];
  if (!typeAbbr) {
    typeAbbr = slug(config.resourceType) || 'res';
    warnings.push(`Unknown resource type "${config.resourceType}" — using "${typeAbbr}" verbatim.`);
  }

  const regionKey = config.region.toLowerCase().replace(/\s+/g, '');
  let regionCode = AZURE_REGION_SHORTCODES[regionKey];
  if (!regionCode) {
    regionCode = slug(config.region);
    if (regionCode) warnings.push(`Unknown region "${config.region}" — using "${regionCode}" as the short code.`);
  }

  const values: Record<NamingSegment, string> = {
    type: typeAbbr,
    workload: slug(config.workload),
    environment: slug(config.environment),
    region: regionCode,
    instance: config.instance ? slug(config.instance) : '',
  };

  const rule = TYPE_RULES[typeAbbr];
  const effectiveDelimiter = rule && !rule.allowDash ? '' : delimiter;

  let name = order
    .map((seg) => values[seg])
    .filter((v) => v !== '')
    .join(effectiveDelimiter);

  if (rule && !rule.allowDash) {
    name = name.replace(/[^a-z0-9]/g, '');
  }
  if (rule && name.length > rule.maxLen) {
    name = name.slice(0, rule.maxLen);
    warnings.push(`Name was truncated to the ${rule.maxLen}-char maximum for this type.`);
  }

  for (const w of validateName(config.resourceType, name)) {
    if (!warnings.includes(w)) warnings.push(w);
  }

  return { name, warnings };
}
