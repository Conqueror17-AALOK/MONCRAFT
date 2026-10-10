import { ResourceNode, ResourceType } from '@civilization/shared';

export interface SpatialZone {
  id: string;
  name: string;
  center: { x: number; y: number; z: number };
  radius: number;
  color: string;
}

export const SPATIAL_ZONES: Record<string, SpatialZone> = {
  MARKETPLACE: {
    id: 'MARKETPLACE',
    name: 'Grand Agora & Marketplace',
    center: { x: 0, y: 0, z: 0 },
    radius: 10,
    color: '#F59E0B'
  },
  VILLAGE: {
    id: 'VILLAGE',
    name: 'Commoner Village & Taverns',
    center: { x: -22, y: 0, z: -5 },
    radius: 12,
    color: '#3B82F6'
  },
  WHEAT_FIELDS: {
    id: 'WHEAT_FIELDS',
    name: 'Golden Plains & Wheat Mill',
    center: { x: 22, y: 0, z: -18 },
    radius: 12,
    color: '#10B981'
  },
  FOREST: {
    id: 'FOREST',
    name: 'Deep Timber Woods',
    center: { x: -22, y: 0, z: 22 },
    radius: 14,
    color: '#059669'
  },
  IRON_MINES: {
    id: 'IRON_MINES',
    name: 'Iron Quarry & Smelter',
    center: { x: 24, y: 0, z: 20 },
    radius: 12,
    color: '#6B7280'
  },
  WILDERNESS: {
    id: 'WILDERNESS',
    name: 'Hazardous Gold Vein Ruins',
    center: { x: 0, y: 0, z: -32 },
    radius: 12,
    color: '#EC4899'
  },
  CASTLE: {
    id: 'CASTLE',
    name: "Warlord's Fortress Citadel",
    center: { x: 0, y: 0, z: 29 },
    radius: 7,
    color: '#EF4444'
  }
};

export const INITIAL_RESOURCE_NODES: ResourceNode[] = [
  // Wheat Fields (Staple food crop - moderate capacity, steady seasonal growth)
  {
    id: 'node_wheat_1',
    type: 'WHEAT',
    name: 'North Mill Field',
    position: { x: 20, y: 0, z: -15 },
    maxCapacity: 45,
    currentCapacity: 45,
    regenRatePerSec: 0.6
  },
  {
    id: 'node_wheat_2',
    type: 'WHEAT',
    name: 'South Mill Field',
    position: { x: 25, y: 0, z: -21 },
    maxCapacity: 45,
    currentCapacity: 45,
    regenRatePerSec: 0.6
  },
  // Forest Logging Stands (Lumber - physical chopping required)
  {
    id: 'node_wood_1',
    type: 'WOOD',
    name: 'Pine Grove Stand',
    position: { x: -20, y: 0, z: 18 },
    maxCapacity: 35,
    currentCapacity: 35,
    regenRatePerSec: 0.4
  },
  {
    id: 'node_wood_2',
    type: 'WOOD',
    name: 'Ancient Oak Timber',
    position: { x: -26, y: 0, z: 24 },
    maxCapacity: 35,
    currentCapacity: 35,
    regenRatePerSec: 0.4
  },
  // Iron Quarry (Rare metallurgical veins - slow natural accretion)
  {
    id: 'node_iron_1',
    type: 'IRON',
    name: 'Crag Quarry Vein',
    position: { x: 20, y: 0, z: 21 },
    maxCapacity: 25,
    currentCapacity: 25,
    regenRatePerSec: 0.15
  },
  {
    id: 'node_iron_2',
    type: 'IRON',
    name: 'Deep Smelting Bed',
    position: { x: 23, y: 0, z: 23 },
    maxCapacity: 25,
    currentCapacity: 25,
    regenRatePerSec: 0.15
  },
  // Gold Wilderness Deposits (Ancient ruin relics - highly scarce, prized)
  {
    id: 'node_gold_1',
    type: 'GOLD',
    name: 'Sunken Ruins Gold Cache',
    position: { x: -2, y: 0, z: -30 },
    maxCapacity: 10,
    currentCapacity: 10,
    regenRatePerSec: 0.04
  },
  {
    id: 'node_gold_2',
    type: 'GOLD',
    name: 'Obsidian Ridge Gold Deposit',
    position: { x: 3, y: 0, z: -34 },
    maxCapacity: 10,
    currentCapacity: 10,
    regenRatePerSec: 0.04
  }
];

export function distanceBetween(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number }
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function getRandomPositionInZone(zone: SpatialZone, padding = 2): { x: number; y: number; z: number } {
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.random() * (zone.radius - padding);
  return {
    x: Number((zone.center.x + Math.cos(angle) * radius).toFixed(2)),
    y: 0,
    z: Number((zone.center.z + Math.sin(angle) * radius).toFixed(2))
  };
}
