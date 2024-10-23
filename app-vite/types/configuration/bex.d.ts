import { BuildOptions as EsbuildConfiguration } from "esbuild";

interface QuasarBexConfiguration {
  /**
   * Extend the Esbuild config that is used for the bex scripts
   * (background, content scripts, dom script)
   */
  extendBexScriptsConf?: (config: EsbuildConfiguration) => void;

  /**
   * Should you need some dynamic changes to the Browser Extension manifest file
   * (/src-bex/manifest.json) then use this method to do it.
   */
  extendBexManifestJson?: (json: object) => void;
}
