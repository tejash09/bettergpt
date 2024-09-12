import {
    ChatRequest,
    ChatResponse,
    LLMResult,
    ProviderInterface,
    LanguageModel,
  } from '@ai-sdk/provider';
  import { generateId, loadApiKey } from '@ai-sdk/provider-utils';
  import { NotDiamond } from 'notdiamond';
  
  export interface NotDiamondProviderSettings {
    apiKey?: string;
    llmProviders?: Array<{ provider: string; model: string }>;
  }
  
  export class NotDiamondLanguageModel implements LanguageModel {
    private notDiamond: NotDiamond;
    private llmProviders: Array<{ provider: string; model: string }>;
  
    constructor(
      private settings: NotDiamondProviderSettings = {}
    ) {
      this.notDiamond = new NotDiamond({
        apiKey: loadApiKey({
          apiKey: settings.apiKey,
          environmentVariableName: 'NOTDIAMOND_API_KEY',
          description: 'NotDiamond Provider',
        }),
      });
      this.llmProviders = settings.llmProviders || [
        { provider: 'openai', model: 'gpt-4o' },
        { provider: 'openai', model: 'gpt-4o-mini' },
        { provider: 'anthropic', model: 'claude-3-5-sonnet-20240620' },
      ];
    }
  
    async doGenerate(request: ChatRequest): Promise<LLMResult> {
      try {
        const result = await this.notDiamond.modelSelect({
          messages: request.messages.map(msg => ({
            role: msg.role,
            content: msg.content as string,
          })),
          llmProviders: this.llmProviders,
        });
  
        if ('detail' in result) {
          throw new Error(JSON.stringify(result.detail));
        }
  
        // Note: This is a simplified response. You may need to adjust based on the actual response format from NotDiamond
        return {
          content: `NotDiamond recommends using ${result.providers} for this request. Session ID: ${result.session_id}`,
          role: 'assistant',
        };
      } catch (error) {
        console.error('NotDiamond API Error:', error);
        throw new Error(`NotDiamond API Error: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
      }
    }
  
    async doStream(request: ChatRequest): Promise<AsyncIterable<ChatResponse>> {
      try {
        const response = await this.doGenerate(request);
        
        async function* streamSimulator() {
          yield { delta: response.content, done: false };
          yield { delta: '', done: true };
        }
  
        return streamSimulator();
      } catch (error) {
        console.error('NotDiamond Streaming Error:', error);
        throw new Error(`NotDiamond Streaming Error: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
      }
    }
  
    get metadata(): ProviderInterface['metadata'] {
      return {
        specificationVersion: 'v1',
        provider: 'notdiamond',
        modelId: 'notdiamond-router',
        defaultObjectGenerationMode: 'json',
      };
    }
  }
  
  export interface NotDiamondProvider {
    (settings?: NotDiamondProviderSettings): NotDiamondLanguageModel;
  }
  
  export function createNotDiamondProvider(
    options: NotDiamondProviderSettings = {}
  ): NotDiamondProvider {
    return function (settings: NotDiamondProviderSettings = {}) {
      return new NotDiamondLanguageModel({ ...options, ...settings });
    };
  }
  
  export const notDiamondProvider = createNotDiamondProvider();