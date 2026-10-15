import type { Messages } from "@openmasq/i18n";
import { findModelAny } from "../../../prompt/models";
import { hueForProvider } from "../../../prompt/providerHue";
import { providerLabel } from "../../../help/providerLabel";

/** Hue + vendor label for a model id, resolved through the registry. La table
 *  fournisseur→teinte vit dans `prompt/providerHue.ts` : la console web l'empile aussi. */
export function modelStyle(modelId: string, t: Messages): { hue: string; vendor: string } {
  const provider = findModelAny(modelId)?.provider;
  return {
    hue: hueForProvider(provider),
    vendor: provider ? providerLabel(provider, t) : "",
  };
}
