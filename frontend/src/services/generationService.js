export class GenerationService {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  async generate({ sketchDataUrl, prompt, scene }) {
    return this.apiClient.post('/generation', {
      sketch_data_url: sketchDataUrl,
      prompt,
      scene,
    });
  }
}
