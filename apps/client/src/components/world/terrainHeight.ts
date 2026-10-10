/**
 * Procedural stepped terrain elevation system for the stylized civilization.
 * Provides continuous stepped heights for agents, buildings, foliage, and roads.
 */

export function getTerrainHeight(x: number, z: number): number {
  // 1. River Canyon (sunken riverbed)
  const isLake = x >= 4 && x <= 26 && z <= -18 && z >= -40;
  // River ribbon winding from north (10, 28) down to south lake (12, -18)
  const riverX = 11 + Math.sin(z * 0.12) * 3.5;
  const distToRiver = Math.abs(x - riverX);

  if (z >= -18 && z <= 30 && distToRiver < 4.2) {
    // River channel
    if (distToRiver < 2.8) return -0.6;
    return -0.2;
  }

  if (isLake) {
    return -0.7;
  }

  // 2. Castle Grand Ascent Staircase (Monumental stone stairs between Agora and Fortress)
  if (x >= -4.5 && x <= 4.5 && z >= 16.5 && z <= 28) {
    const t = Math.max(0, Math.min(1, (z - 16.5) / (27.5 - 16.5)));
    return Number((0.05 + t * 4.35).toFixed(2));
  }

  // 2b. High Northern Mountain Cliffs & Castle promontory
  if (z >= 24) {
    if (x >= -14 && x <= 14) {
      // Castle Promontory
      if (z >= 33) return 5.5;
      return 4.4;
    }
    if (x > 14) {
      // Iron Mine mountain quarry crags
      return 3.2;
    }
    if (x < -14) {
      // Deep Pine Forest high ridge
      return 1.8;
    }
  }

  // 3. Iron Quarry Crags & Smelter terrace
  if (x >= 10 && x < 18 && z >= 12 && z <= 26) {
    // Ramp up the terraced stairs
    const t = Math.max(0, Math.min(1, (x - 10) / 8));
    return Number((0.05 + t * 3.15).toFixed(2));
  }
  if (x >= 18 && z >= 12 && z <= 31) {
    // Top of the cliff
    return 3.25;
  }

  // 4. Farmland Terraces (Wheat Plains)
  if (x >= 14 && z <= -10 && z >= -28) {
    if (x >= 22) return 0.6;
    return 0.3;
  }

  // 5. Village Commoner Terraces
  if (x <= -12 && z >= -14 && z <= 8) {
    return 0.25;
  }

  // 6. Ancient Ruins Plateau
  if (x >= -10 && x <= 10 && z <= -26) {
    return 0.35;
  }

  // 7. Forest Groves
  if (x <= -14 && z > 8 && z < 24) {
    return 0.4;
  }

  // Central Agora & surrounding paths
  return 0.05;
}
