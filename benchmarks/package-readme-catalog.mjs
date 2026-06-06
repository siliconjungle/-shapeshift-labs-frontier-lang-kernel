import { foundationPackages } from './package-catalog-foundation.mjs';
import { languagePackages } from './package-catalog-lang.mjs';
import { applicationPackages } from './package-catalog-application.mjs';
import { interfacePackages } from './package-catalog-interface.mjs';
import { runtimePackages } from './package-catalog-runtime.mjs';

export const packages = [
  ...foundationPackages,
  ...languagePackages,
  ...applicationPackages,
  ...interfacePackages,
  ...runtimePackages
];
