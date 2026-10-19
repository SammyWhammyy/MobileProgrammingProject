const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['.expo/**', 'dist/**'] },
  // Reanimated shared values are mutable worklet state rather than React props.
  { files: ['src/map/FloorMap.tsx'], rules: { 'react-hooks/immutability': 'off' } },
  // The retained scanner prototype is outside the MVP runtime. Its subscription
  // effect is existing code, tracked separately from the map implementation.
  { files: ['src/screens/RecordScreen.tsx'], rules: { 'react-hooks/set-state-in-effect': 'off' } },
]);
