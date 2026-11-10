export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const lerp = (a, b, amount) => a + (b - a) * amount;
export const createMaterial = (THREE, color, roughness = 0.78, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });
