import React from 'react';
import type { ProviderId } from '@byom/shared';
import {
  getProviderMeta,
  getProvidersByCategory,
  providerRequiresApiKey,
  providerSupportsBaseURL,
  PROVIDER_CATEGORY_LABELS,
} from '../../modules/openmodelrouter/providers/registry';

interface ProviderFormFieldsProps {
  kind: ProviderId;
  label: string;
  apiKey: string;
  baseURL: string;
  defaultModel: string;
  onKindChange: (kind: ProviderId) => void;
  onLabelChange: (label: string) => void;
  onApiKeyChange: (apiKey: string) => void;
  onBaseURLChange: (baseURL: string) => void;
  onDefaultModelChange: (defaultModel: string) => void;
  selectStyle?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
  modelInputId?: string;
}

export const ProviderFormFields: React.FC<ProviderFormFieldsProps> = ({
  kind,
  label,
  apiKey,
  baseURL,
  defaultModel,
  onKindChange,
  onLabelChange,
  onApiKeyChange,
  onBaseURLChange,
  onDefaultModelChange,
  selectStyle,
  inputStyle,
  modelInputId = 'provider-model-suggestions',
}) => {
  const meta = getProviderMeta(kind);
  const groupedProviders = getProvidersByCategory();
  const datalistId = `${modelInputId}-${kind}`;

  return (
    <>
      <select
        value={kind}
        onChange={(e) => onKindChange(e.target.value as ProviderId)}
        style={selectStyle}
      >
        {(Object.keys(groupedProviders) as Array<keyof typeof groupedProviders>).map((category) => (
          <optgroup key={category} label={PROVIDER_CATEGORY_LABELS[category]}>
            {groupedProviders[category].map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.displayName}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      <input
        placeholder="Display label"
        value={label}
        onChange={(e) => onLabelChange(e.target.value)}
        required
        style={inputStyle}
      />

      <input
        placeholder={providerRequiresApiKey(kind) ? 'API key' : 'API key (optional)'}
        type="password"
        value={apiKey}
        onChange={(e) => onApiKeyChange(e.target.value)}
        style={inputStyle}
      />

      {providerSupportsBaseURL(kind) && (
        <input
          placeholder={meta.defaultBaseURL ? `Base URL (default: ${meta.defaultBaseURL})` : 'Base URL'}
          value={baseURL}
          onChange={(e) => onBaseURLChange(e.target.value)}
          style={inputStyle}
        />
      )}

      <input
        placeholder="Default model (optional)"
        list={datalistId}
        value={defaultModel}
        onChange={(e) => onDefaultModelChange(e.target.value)}
        style={inputStyle}
      />
      <datalist id={datalistId}>
        {meta.knownModels.map((model) => (
          <option key={model} value={model} />
        ))}
      </datalist>
    </>
  );
};

export function getProviderDefaultBaseURL(kind: ProviderId): string | undefined {
  return getProviderMeta(kind).defaultBaseURL;
}
